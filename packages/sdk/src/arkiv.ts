import {createPublicClient,createWalletClient,ExpirationTime,jsonToPayload} from '@arkiv-network/sdk';
import {addr,bytes32,str,u64,key as entityKey} from '@arkiv-network/sdk/attr';
import {eq,gt,or,type Expression} from '@arkiv-network/sdk/query';
import {tiramisu} from '@arkiv-network/sdk/chains';
import {http,webSocket,type Hex} from 'viem';
import {NAMESPACE,verifyEnvelope,envelopeSchema,policySchema,type Envelope,type Policy,type VerifiedRecord} from './index';
export const RPC='https://rpc.tiramisu.db-chain.testnet.arkiv.network';
export const EXPLORER='https://tiramisu.explorer.arkiv.network';
export interface Connection {rpc?:string;headers?:Record<string,string>;policy:Policy;}
const hexDigest=(d:string)=>`0x${d.slice(7)}` as Hex;
function client(c:Connection){return createPublicClient({chain:tiramisu,transport:http(c.rpc||RPC,{timeout:15000,retryCount:0,...(c.headers?{fetchOptions:{headers:c.headers}}:{})})});}
export async function decodeEntity(entity:any,block:bigint):Promise<VerifiedRecord|null>{
  try{
    if(!entity?.creationFlags?.readonly||!entity.creator||!/^0x[0-9a-fA-F]{64}$/.test(entity.key)||BigInt(entity.expiresAt)<=block)return null;
    const envelope=await verifyEnvelope(entity.toJson?entity.toJson():entity.payload_json);if(!envelope||entity.creator.toLowerCase()!==envelope.payload.issuer.toLowerCase())return null;
    const p=envelope.payload;const val=(n:string)=>entity.attributes?.[n]?.value;
    if(val('namespace')!==NAMESPACE||val('schema_version')!==1n||val('kind')!==p.kind||val('artifact_hash')!==hexDigest(p.artifact_digest)||val('descriptor_hash')!==hexDigest(p.descriptor_digest))return null;
    if(p.kind==='withdrawal'&&val('target_key')!==p.target_key)return null;
    return {key:entity.key,creator:entity.creator,owner:entity.owner,created_at_block:String(entity.createdAt),expires_at_block:String(entity.expiresAt),envelope};
  }catch{return null;}
}
export async function readRecords(c:Connection,artifactDigest?:string){
  const policy=policySchema.parse(c.policy),reader=client(c),timing=await reader.getBlockTiming();
  const writers=[...new Set([...policy.issuers,...policy.reviewers].map(a=>a.toLowerCase()))];
  const filters:Expression[]=[eq('namespace',str(NAMESPACE)),eq('schema_version',u64(1)),gt('$expiresAt',u64(timing.currentBlock)),or(writers.map(a=>eq('$creator',addr(a as Hex))))];
  if(artifactDigest)filters.push(eq('artifact_hash',bytes32(hexDigest(artifactDigest))));
  const query=reader.select().where(...filters).limit(100);let page=await query.fetch();let pageCount=0,ignored=0;const records:VerifiedRecord[]=[];
  while(true){for(const e of page.entities){const decoded=await decodeEntity(e,timing.currentBlock);if(decoded)records.push(decoded);else ignored++;}if(!page.hasNextPage())break;if(++pageCount>=10)throw new Error('Incomplete query: pagination limit reached');page=await page.next();}
  return {records,ignored,block:String(page.blockNumber),query:query.toString(),read_at:new Date().toISOString()};
}
export function entityInput(envelope:Envelope,storageDays=30){
  const e=envelopeSchema.parse(envelope),p=e.payload;
  if(!Number.isInteger(storageDays)||storageDays<1||storageDays>90)throw new Error('Storage lifetime must be 1 to 90 days');
  if(Date.parse(p.valid_until)>Date.now()+storageDays*86400000-120000)throw new Error('Storage must cover signed validity plus two minutes');
  const attributes:any={namespace:str(NAMESPACE),schema_version:u64(1),kind:str(p.kind),artifact_hash:bytes32(hexDigest(p.artifact_digest)),descriptor_hash:bytes32(hexDigest(p.descriptor_digest))};
  if(p.kind==='passport')attributes.subject_type=str(p.descriptor.kind);
  if(p.kind==='withdrawal')attributes.target_key=entityKey(p.target_key as Hex);
  return {attributes,payload:jsonToPayload(e),contentType:'application/json',expires:ExpirationTime.fromDays(storageDays),flags:{readonly:true,permissionlessExtension:false}};
}
export async function publishEnvelope(c:Connection,account:any,envelope:Envelope){
  if(!await verifyEnvelope(envelope)||account.address.toLowerCase()!==envelope.payload.issuer.toLowerCase())throw new Error('Publication requires an authentic envelope by the transaction creator');
  const transport=http(c.rpc||RPC,{timeout:20000,retryCount:0,...(c.headers?{fetchOptions:{headers:c.headers}}:{})});
  if(envelope.payload.kind==='withdrawal'){
    const r=createPublicClient({chain:tiramisu,transport});const target=await decodeEntity(await r.getEntity(envelope.payload.target_key as Hex),(await r.getBlockTiming()).currentBlock);
    if(!target||target.creator.toLowerCase()!==account.address.toLowerCase()||target.envelope.payload.kind==='withdrawal'||target.envelope.payload.artifact_digest!==envelope.payload.artifact_digest||target.envelope.payload.descriptor_digest!==envelope.payload.descriptor_digest||Date.parse(envelope.payload.valid_until)<Date.parse(target.envelope.payload.valid_until))throw new Error('Withdrawal must be by the target issuer, bound to its artifact, and cover target validity');
    const days=Math.max(30,Math.ceil((Date.parse(envelope.payload.valid_until)-Date.now()+120000)/86400000));
    const input=entityInput(envelope,days);
    return createWalletClient({chain:tiramisu,account,transport}).createEntity({...input,expires:ExpirationTime.atBlock(BigInt(target.expires_at_block),{atLeast:input.expires})});
  }
  return createWalletClient({chain:tiramisu,account,transport}).createEntity(entityInput(envelope));
}
export function watchRecords(onChange:()=>void,onError?:(e:Error)=>void){return createPublicClient({chain:tiramisu,transport:webSocket('wss://rpc.tiramisu.db-chain.testnet.arkiv.network')}).watchEntityEvents({onEvent:onChange,onError});}
