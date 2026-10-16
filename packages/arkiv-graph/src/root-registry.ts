import {createPublicClient,ExpirationTime,jsonToPayload} from '@arkiv-network/sdk';
import {str,u64,addr,bytes32} from '@arkiv-network/sdk/attr';
import {eq,gt} from '@arkiv-network/sdk/query';
import {tiramisu} from '@arkiv-network/sdk/chains';
import {http,type Hex} from 'viem';
import {DEFAULT_RPC,createGraphKit,digestJson} from './index';
import {rootTrustConfigSchema,rootTrustScope,rootRevisionEnvelopeSchema,verifyRootRevisions,type RootTrustConfig,type RootRevisionEnvelope} from './root-update';
export const ROOT_REGISTRY_NAMESPACE='arkiv-graph-roots-v1';
export function rootRevisionEntityInput(config:RootTrustConfig,envelope:RootRevisionEnvelope){
 const c=rootTrustConfigSchema.parse(config),e=rootRevisionEnvelopeSchema.parse(envelope);
 if(e.payload.scope_digest!==rootTrustScope(c)||e.payload.issuer!==c.authority||Date.parse(e.payload.valid_until)>Date.now()+29*86400000)throw new Error('Root publication binding or storage lifetime invalid');
 return {attributes:{namespace:str(ROOT_REGISTRY_NAMESPACE),schema_version:u64(1),scope_hash:bytes32(`0x${rootTrustScope(c).slice(7)}` as Hex),sequence:u64(e.payload.sequence)},payload:jsonToPayload(e),contentType:'application/json',expires:ExpirationTime.fromDays(30),flags:{readonly:true,permissionlessExtension:false}};
}
/** Same-snapshot registry discovery and graph read. RPC completeness remains a provider assumption. */
export async function readRootRegistry(config:RootTrustConfig,connection:{rpc?:string;headers?:Record<string,string>}={}){
 const c=rootTrustConfigSchema.parse(config);
 if(c.chain_id!==tiramisu.id||c.profile!=='arkiv-graph-v1')throw new Error('Unsupported root registry chain/profile');
 const reader=createPublicClient({chain:tiramisu,transport:http(connection.rpc??DEFAULT_RPC,{timeout:15000,retryCount:0,...(connection.headers?{fetchOptions:{headers:connection.headers}}:{})})});
 const timing=await reader.getBlockTiming(),snapshot=timing.currentBlock;
 const blockTime=Number(timing.currentBlockTime)*1000;
 if(!Number.isFinite(blockTime)||blockTime>Date.now()+30000||Date.now()-blockTime>120000)throw new Error('Root registry RPC head is stale or future-dated');
 const query=reader.select({key:true,creator:true,payload:true,attributes:true,creationFlags:true}).where(eq('namespace',str(ROOT_REGISTRY_NAMESPACE)),eq('schema_version',u64(1)),eq('scope_hash',bytes32(`0x${rootTrustScope(c).slice(7)}` as Hex)),eq('$creator',addr(c.authority as Hex)),gt('$expiresAt',u64(snapshot))).atBlock(snapshot).limit(65);
 const page=await query.fetch();
 if(page.blockNumber!==snapshot||page.hasNextPage()||page.entities.length>64)throw new Error('Root registry snapshot or revision budget invalid');
 const records=page.entities.map(entity=>{
  const e=rootRevisionEnvelopeSchema.parse(entity.toJson()),v=(key:string)=>entity.attributes[key]?.value;
  if(!entity.creationFlags?.readonly||entity.creator.toLowerCase()!==c.authority||v('namespace')!==ROOT_REGISTRY_NAMESPACE||v('schema_version')!==1n||v('scope_hash')!==`0x${rootTrustScope(c).slice(7)}`||v('sequence')!==BigInt(e.payload.sequence))throw new Error('Root registry protocol binding invalid');
  return {key:entity.key,creator:entity.creator,envelope:e};
 });
 const revisions=records.map(r=>r.envelope).sort((a,b)=>a.payload.sequence-b.payload.sequence);
 if(!revisions.length)throw new Error('No authenticated root revisions discovered');
 const verified=await verifyRootRevisions({config:c,revisions});
 const graph=await createGraphKit().readGraph({...connection,issuers:[c.authority],atBlock:snapshot},verified.root);
 const valueDigest=digestJson({revisions,graph:graph.graph}),queryText=query.toString();
 // Both signed ISO deadlines and Date.now() use epoch milliseconds. The graph read can
 // cross the head's deadline after its signature/chain verification has completed.
 const completedAt=Date.now();
 if(Date.parse(verified.revisions.at(-1)!.payload.valid_until)<=completedAt)throw new Error('Root revision expired during graph verification');
 return {schema:'arkiv.graph-root-read.v1',scope_digest:rootTrustScope(c),root:verified.root,revisions,registry_records:records,graph,block:String(snapshot),block_time:new Date(blockTime).toISOString(),read_at:new Date(completedAt).toISOString(),value_digest:valueDigest,query:queryText,scope:'One configured provider; authenticated updates and complete pinned graph membership, not a cryptographic query-completeness proof.'};
}
