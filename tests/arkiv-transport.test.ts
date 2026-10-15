import {afterEach,describe,it,expect,vi} from 'vitest';
import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts';
import {stringToHex} from 'viem';
import {descriptorSchema,digestJson,recordSchema,signRecord,type Envelope} from '../packages/sdk/src/index';
import {entityInput,readRecords} from '../packages/sdk/src/arkiv';

// Use the real installed SDK's HTTP, query builder, pagination and entity decoder.
// The remote endpoint alone is simulated; these cases are not chain observations.
const account=privateKeyToAccount(generatePrivateKey());
const descriptor=descriptorSchema.parse({schema:'app-passport.descriptor.v1',kind:'tool',name:'Snapshot transport fixture',version:'1',artifact_digest:digestJson('public synthetic fixture'),source_url:'https://example.com/fixture',provenance:'synthetic-fixture',capabilities:[]});
const connection={rpc:'https://snapshot.invalid',policy:{issuers:[account.address],reviewers:[account.address],scope:'identity-and-protocol' as const}};
async function signed(){const now=Date.now();return signRecord(recordSchema.parse({schema:'app-passport.record.v1',namespace:'app-passport-v1',issuer:account.address,artifact_digest:descriptor.artifact_digest,descriptor_digest:digestJson(descriptor),issued_at:new Date(now-1000).toISOString(),valid_until:new Date(now+60000).toISOString(),disclosure:'synthetic-fixture',kind:'passport',descriptor}),account);}
function entity(envelope:Envelope,expires=200n){return {key:`0x${'a'.repeat(64)}`,creator:account.address,owner:account.address,createdAt:'0x32',updatedAt:'0x32',expiresAt:`0x${expires.toString(16)}`,contentType:'application/json',creationFlags:1,payload:stringToHex(JSON.stringify(envelope)),attributes:Object.entries(entityInput(envelope).attributes).map(([name,attribute]:[string,any])=>({name,type:attribute.type,value:typeof attribute.value==='bigint'?`0x${attribute.value.toString(16)}`:attribute.value}))};}
function mockRpc(blocks:string[],rows:unknown[][]=[[],[]],head=100n,forever=false){
 const requests:any[]=[];let page=0;
 const fetch=vi.fn(async(_url:unknown,init:RequestInit)=>{
  const request=JSON.parse(init.body as string);requests.push(request);
  let result:unknown;
  if(request.method==='arkiv_getBlockTiming')result={current_block:`0x${head.toString(16)}`,current_block_time:Math.floor(Date.now()/1000),duration:2};
  else if(request.method==='arkiv_query'){result={data:rows[page]??[],blockNumber:blocks[page]??blocks.at(-1),...((forever||page<blocks.length-1)?{cursor:String(page+1)}:{})};page++;}
  else throw new Error(`Unexpected RPC method: ${request.method}`);
  return new Response(JSON.stringify({jsonrpc:'2.0',id:request.id,result}),{headers:{'content-type':'application/json'}});
 });
 vi.stubGlobal('fetch',fetch);return {requests,fetch};
}
afterEach(()=>vi.unstubAllGlobals());
describe('Block-pinned passport and review transport',()=>{
 it('pins the observed head before the first query and preserves the block across pages',async()=>{
  const rpc=mockRpc(['0x64','0x64']),result=await readRecords(connection,descriptor.artifact_digest);
  expect(result.block).toBe('100');const queries=rpc.requests.filter(r=>r.method==='arkiv_query');expect(queries).toHaveLength(2);
  for(const query of queries){expect(query.params[1].atBlock).toBe('0x64');expect(query.params[0]).toContain('$expiresAt > u64(100)');expect(query.params[0]).toContain(`artifact_hash = bytes32(0x${descriptor.artifact_digest.slice(7)})`);}
 });
 it('decodes expiry at the explicitly selected snapshot rather than a later observed head',async()=>{
  const envelope=await signed(),rpc=mockRpc(['0x63'],[[entity(envelope,100n)]]),result=await readRecords({...connection,atBlock:99n});
  expect(result.records).toHaveLength(1);expect(result.block).toBe('99');expect(rpc.requests.find(r=>r.method==='arkiv_query').params[1].atBlock).toBe('0x63');expect(result.query).toContain('$expiresAt > u64(99)');
 });
 it.each([['0x63','0x64'],['0x64','0x63']])('rejects a provider snapshot mismatch on any page: %s, %s',async(first,second)=>{
  mockRpc([first,second]);await expect(readRecords(connection)).rejects.toThrow('different review snapshot');
 });
 it('rejects a requested block ahead of the observed head before querying records',async()=>{
  const rpc=mockRpc(['0x65']);await expect(readRecords({...connection,atBlock:101n})).rejects.toThrow('ahead');expect(rpc.requests.map(r=>r.method)).toEqual(['arkiv_getBlockTiming']);
 });
 it.each([-1n,1 as unknown as bigint])('rejects invalid snapshot input %s before making an HTTP call',async(atBlock)=>{
  const rpc=mockRpc(['0x64']);await expect(readRecords({...connection,atBlock})).rejects.toThrow('Invalid review snapshot');expect(rpc.fetch).not.toHaveBeenCalled();
 });
 it('keeps the pagination budget fail closed at a pinned snapshot',async()=>{
  const rpc=mockRpc(['0x64'],[[]],100n,true);await expect(readRecords(connection)).rejects.toThrow('pagination limit');expect(rpc.requests.filter(r=>r.method==='arkiv_query')).toHaveLength(10);
 });
});
