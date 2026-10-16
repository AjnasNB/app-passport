import {afterEach,describe,it,expect,vi} from 'vitest';
import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts';
import {stringToHex} from 'viem';
import {createGraphKit,digestJson} from '../packages/arkiv-graph/src/index';
import {rootGenesisDigest,rootTrustScope,signRootRevision,type RootTrustConfig} from '../packages/arkiv-graph/src/root-update';
import {ROOT_REGISTRY_NAMESPACE,readRootRegistry,rootRevisionEntityInput} from '../packages/arkiv-graph/src/root-registry';

const account=privateKeyToAccount(generatePrivateKey()),kit=createGraphKit();
const config:RootTrustConfig={schema:'arkiv.graph-root-trust.v1',chain_id:7738577,registry_id:'synthetic:registry-transport',profile:'arkiv-graph-v1',policy_digest:digestJson({issuers:[account.address.toLowerCase()]}),genesis_root:digestJson('synthetic pinned genesis'),authority:account.address.toLowerCase(),max_revision_lifetime_seconds:3600};
const graph=kit.graphSchema.parse({schema:'arkiv.graph.v1',label:'Synthetic root registry transport',nodes:[{id:'public:source',type:'source',label:'Public synthetic source',digest:digestJson('public fixture'),detail:'Synthetic transport regression, not chain evidence.'}],edges:[]});
function row(input:{attributes:Record<string,any>;payload:Uint8Array},key:number){return {key:`0x${key.toString(16).padStart(64,'0')}`,creator:account.address,payload:stringToHex(new TextDecoder().decode(input.payload)),creationFlags:1,attributes:Object.entries(input.attributes).map(([name,attribute])=>({name,type:attribute.type,value:typeof attribute.value==='bigint'?`0x${attribute.value.toString(16)}`:attribute.value}))};}
async function fixture(scenario='valid',duringGraphRead?:(now:number)=>void){
 const now=Date.now(),issued=new Date(now-1000).toISOString(),until=new Date(now+60000).toISOString(),graphUntil=new Date(now+120000).toISOString();
 const revision=await signRootRevision({schema:'arkiv.graph-root-revision.v1',scope_digest:rootTrustScope(config),sequence:1,previous_revision_digest:rootGenesisDigest(config),previous_root:config.genesis_root,root:digestJson(graph),issuer:config.authority,issued_at:issued,valid_until:until},account);
 const head=row(rootRevisionEntityInput(config,revision),1),members=await Promise.all(kit.graphPayloads(graph,account.address,issued,graphUntil).map(async(payload,i)=>row(kit.graphEntityInput(await kit.signGraph(payload,account)),i+2)));
 if(scenario==='mutable head')head.creationFlags=0;
 if(scenario==='wrong indexed sequence')head.attributes.find(a=>a.name==='sequence')!.value='0x2';
 if(scenario==='altered signed head'){const changed=structuredClone(revision);changed.payload.root=digestJson('forged graph');head.payload=stringToHex(JSON.stringify(changed));}
 const requests:any[]=[];
 vi.stubGlobal('fetch',vi.fn(async(_url:unknown,init:RequestInit)=>{
  const request=JSON.parse(init.body as string);requests.push(request);let result:unknown;
  if(request.method==='arkiv_getBlockTiming')result={current_block:'0x64',current_block_time:Math.floor(now/1000)+(scenario==='stale head'?-121:scenario==='future head'?31:0),duration:2};
  else if(request.method==='arkiv_query'){
   const registry=request.params[0].includes(ROOT_REGISTRY_NAMESPACE);
   if(!registry)duringGraphRead?.(now);
   result={data:registry?[head]:(scenario==='missing graph member'?members.slice(1):members),blockNumber:registry&&scenario==='wrong registry block'?'0x63':(!registry&&scenario==='wrong graph block'?'0x63':'0x64'),...(registry&&scenario==='unexpected next registry page'?{cursor:'more'}:{})};
  }else throw new Error(`Unexpected RPC method ${request.method}`);
  return new Response(JSON.stringify({jsonrpc:'2.0',id:request.id,result}),{headers:{'content-type':'application/json'}});
 }));
 return {now,revision,requests};
}
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
describe('Actual SDK root registry transport with simulated RPC',()=>{
 it('verifies an authenticated discovered root and complete graph at one block with real wire time units',async()=>{
  const {now,requests}=await fixture(),result=await readRootRegistry(config,{rpc:'https://registry.invalid'});
  expect(result.root).toBe(digestJson(graph));expect(result.graph.graph).toEqual(graph);expect(result.block).toBe('100');expect(Math.abs(Date.parse(result.block_time)-now)).toBeLessThan(1000);
  const queries=requests.filter(r=>r.method==='arkiv_query');expect(queries).toHaveLength(2);for(const query of queries)expect(query.params[1].atBlock).toBe('0x64');
  expect(queries[0].params[0]).toContain(`$creator = addr(${account.address})`);expect(queries[0].params[1].limit).toBe('0x41');
 });
 it('does not label an arbitrary caller-supplied endpoint as the official provider',async()=>{
  await fixture();const result=await readRootRegistry(config,{rpc:'https://registry.invalid'});
  expect(result).not.toMatchObject({provider:{id:'tiramisu-official',operator:'Arkiv official public RPC'}});
 });
 it.each([60000,60001])('rejects a head whose millisecond deadline is reached during the async graph read (%i ms)',async elapsed=>{
  let clock=0;
  const {now}=await fixture('valid',started=>{clock=started+elapsed;});
  clock=now;vi.spyOn(Date,'now').mockImplementation(()=>clock);
  await expect(readRootRegistry(config,{rpc:'https://registry.invalid'})).rejects.toThrow('Root revision expired during graph verification');
 });
 it('accepts genuine signed head and graph members when async assembly finishes before the deadline',async()=>{
  let clock=0;
  const {now}=await fixture('valid',started=>{clock=started+59999;});
  clock=now;vi.spyOn(Date,'now').mockImplementation(()=>clock);
  const result=await readRootRegistry(config,{rpc:'https://registry.invalid'});
  expect(result.root).toBe(digestJson(graph));expect(result.graph.graph).toEqual(graph);
  expect(result.read_at).toBe(new Date(now+59999).toISOString());
 });
 it.each(['mutable head','wrong indexed sequence','altered signed head','wrong registry block','wrong graph block','missing graph member','unexpected next registry page'])('fails closed for %s',async scenario=>{
  await fixture(scenario);await expect(readRootRegistry(config,{rpc:'https://registry.invalid'})).rejects.toThrow();
 });
 it('rejects unsupported network/profile rather than silently reading another chain',async()=>{
  await fixture();for(const changes of [{chain_id:1},{profile:'different-profile'}])await expect(readRootRegistry({...config,...changes},{rpc:'https://registry.invalid'})).rejects.toThrow('Unsupported');expect(fetch).not.toHaveBeenCalled();
 });
 it.each(['stale head','future head'])('rejects %s before reading any registry or graph records',async scenario=>{
  const {requests}=await fixture(scenario);await expect(readRootRegistry(config,{rpc:'https://registry.invalid'})).rejects.toThrow('stale or future');expect(requests.map(r=>r.method)).toEqual(['arkiv_getBlockTiming']);
 });
});
