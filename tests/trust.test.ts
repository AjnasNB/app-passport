import {afterEach,describe,it,expect,vi} from 'vitest';
import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts';
import {stringToHex,type Hex} from 'viem';
import {createGraphKit,digestJson,type GraphRecord} from '../packages/arkiv-graph/src/index';
import {rootGenesisDigest,rootTrustScope,signRootRevision,verifyRootRevisions,type RootTrustConfig,type RootRevisionEnvelope,type RootRevisionPayload} from '../packages/arkiv-graph/src/root-update';
import {verifyRpcObservations,mergeWithdrawalJournal,type RpcTrustPolicy,type RpcObservation} from '../packages/arkiv-graph/src/rpc-trust';

const account=privateKeyToAccount(generatePrivateKey()),other=privateKeyToAccount(generatePrivateKey());
const now=Date.parse('2026-10-15T10:00:00Z'),at=(offset:number)=>new Date(now+offset).toISOString();
const config:RootTrustConfig={schema:'arkiv.graph-root-trust.v1',chain_id:7738577,registry_id:'test:root-updates',profile:'arkiv-graph-v1',policy_digest:digestJson({issuers:[account.address]}),genesis_root:digestJson('genesis graph'),authority:account.address,max_revision_lifetime_seconds:3600};
async function revisions(count=2){const result:RootRevisionEnvelope[]=[];for(let i=0;i<count;i++){
 const previous=result.at(-1),payload:RootRevisionPayload={schema:'arkiv.graph-root-revision.v1',scope_digest:rootTrustScope(config),sequence:i+1,previous_revision_digest:previous?digestJson(previous):rootGenesisDigest(config),previous_root:previous?.payload.root??config.genesis_root,root:digestJson(`root ${i+1}`),issuer:account.address,issued_at:at(-10000+i*1000),valid_until:at(60000+i*1000)};
 result.push(await signRootRevision(payload,account));
}return result;}
async function resign(envelope:RootRevisionEnvelope,changes:Partial<RootRevisionPayload>){return signRootRevision({...envelope.payload,...changes},account);}
describe('Authenticated graph root revisions',()=>{
 it('keeps a pinned genesis with no revision, then verifies a legitimate chained root change',async()=>{
  const genesis=await verifyRootRevisions({config,revisions:[],now});expect(genesis.root).toBe(config.genesis_root);expect(genesis.checkpoint.sequence).toBe(0);
  const chain=await revisions(),result=await verifyRootRevisions({config,revisions:chain,checkpoint:genesis.checkpoint,now});expect(result.root).toBe(chain[1]!.payload.root);expect(result.checkpoint.sequence).toBe(2);expect(result.checkpoint.revision_digest).toBe(digestJson(chain[1]));
 });
 it('permits an idempotent head read but rejects rollback and hidden revisions after a checkpoint',async()=>{
  const chain=await revisions(),accepted=await verifyRootRevisions({config,revisions:chain,now});
  expect((await verifyRootRevisions({config,revisions:chain,checkpoint:accepted.checkpoint,now:now+1000})).root).toBe(accepted.root);
  for(const truncated of [[],chain.slice(0,1)])await expect(verifyRootRevisions({config,revisions:truncated,checkpoint:accepted.checkpoint,now})).rejects.toThrow('rollback');
 });
 it('rejects a different signed branch at the previously checkpointed sequence',async()=>{
  const chain=await revisions(),accepted=await verifyRootRevisions({config,revisions:chain,now}),fork=await resign(chain[1]!,{root:digestJson('fork graph')});
  await expect(verifyRootRevisions({config,revisions:[chain[0],fork],checkpoint:accepted.checkpoint,now})).rejects.toThrow('fork');
 });
 it.each(['chain_id','registry_id','profile','policy_digest','genesis_root','authority','max_revision_lifetime_seconds'] as const)('binds revision signatures to pinned %s',async field=>{
  const changes={chain_id:42,registry_id:'other:registry',profile:'ai-passport-graph-v1',policy_digest:digestJson('other policy'),genesis_root:digestJson('other genesis'),authority:other.address,max_revision_lifetime_seconds:7200};
  await expect(verifyRootRevisions({config:{...config,[field]:changes[field]},revisions:await revisions(),now})).rejects.toThrow();
 });
 it('rejects altered payload bytes and a valid signature by an unpinned authority',async()=>{
  const chain=await revisions();await expect(verifyRootRevisions({config,revisions:[{...chain[0],payload:{...chain[0]!.payload,root:digestJson('changed')}}],now})).rejects.toThrow('signature');
  const wrong=await signRootRevision({...chain[0]!.payload,issuer:other.address},other);await expect(verifyRootRevisions({config,revisions:[wrong],now})).rejects.toThrow('authority');
 });
 it.each(['gap','wrong previous digest','wrong previous root','reordered','repeated revision'])('rejects %s',async scenario=>{
  const chain=await revisions();let value=chain;
  if(scenario==='gap')value=[await resign(chain[0]!,{sequence:2})];
  if(scenario==='wrong previous digest')value=[chain[0]!,await resign(chain[1]!,{previous_revision_digest:digestJson('unrelated')})];
  if(scenario==='wrong previous root')value=[chain[0]!,await resign(chain[1]!,{previous_root:digestJson('unrelated')})];
  if(scenario==='reordered')value=[chain[1]!,chain[0]!];
  if(scenario==='repeated revision')value=[chain[0]!,chain[0]!];
  await expect(verifyRootRevisions({config,revisions:value,now})).rejects.toThrow('chain');
 });
 it('hashes the complete previous signed head, including same-root renewals',async()=>{
  const [first]=await revisions(),renewed=await resign(first!,{sequence:2,previous_revision_digest:digestJson(first),previous_root:first!.payload.root,root:first!.payload.root,issued_at:at(-9000)});
  expect((await verifyRootRevisions({config,revisions:[first,renewed],now})).checkpoint.sequence).toBe(2);
  const splice=await resign(renewed,{previous_revision_digest:first!.payload.root});await expect(verifyRootRevisions({config,revisions:[first,splice],now})).rejects.toThrow('chain');
 });
 it.each(['future','expired','too long','negative validity'])('rejects %s current validity',async scenario=>{
  const [first]=await revisions();const changes={future:{issued_at:at(31000)},expired:{issued_at:at(-120000),valid_until:at(-1)},'too long':{valid_until:at(3600001)},'negative validity':{valid_until:at(-20000)}}[scenario]!;
  await expect(verifyRootRevisions({config,revisions:[await resign(first!,changes)],now})).rejects.toThrow();
 });
 it('keeps expired historical links when renewal was signed during the previous validity',async()=>{
  const [first]=await revisions(),old=await resign(first!,{issued_at:at(-120000),valid_until:at(-60000)}),next=await resign(first!,{sequence:2,previous_revision_digest:digestJson(old),previous_root:old.payload.root,root:digestJson('renewed'),issued_at:at(-90000),valid_until:at(60000)});
  expect((await verifyRootRevisions({config,revisions:[old,next],now})).root).toBe(next.payload.root);
  const late=await resign(next,{issued_at:at(-50000)});await expect(verifyRootRevisions({config,revisions:[old,late],now})).rejects.toThrow('validity');
 });
 it('rejects checkpoint scope changes, forged roots, local clock rollback and unbounded chains',async()=>{
  const chain=await revisions(),result=await verifyRootRevisions({config,revisions:chain,now});
  for(const changes of [{scope_digest:digestJson('other')},{root:digestJson('forged')},{last_verified_at:at(31000)}])await expect(verifyRootRevisions({config,revisions:chain,checkpoint:{...result.checkpoint,...changes},now})).rejects.toThrow();
  await expect(verifyRootRevisions({config,revisions:Array(65).fill(chain[0]),now})).rejects.toThrow('budget');
 });
});

const policy:RpcTrustPolicy={schema:'arkiv.graph-rpc-policy.v1',scope_digest:digestJson('current artifact and admission policy'),providers:[{id:'provider-a',operator:'operator-a'},{id:'provider-b',operator:'operator-b'}],minimum_operators:2,max_age_seconds:60};
const observation=(id='provider-a',changes:Partial<RpcObservation>={}):RpcObservation=>({provider_id:id,scope_digest:policy.scope_digest,block:'100',block_time:at(-1000),read_at:at(-500),value_digest:digestJson('signed current records'),...changes});
describe('RPC freshness and configured-operator cross-checks',()=>{
 it('accepts matching snapshots from two configured operators and persists monotonic height',()=>{
  const result=verifyRpcObservations({policy,observations:[observation(),observation('provider-b')],now});expect(result.mode).toBe('configured-operator-cross-check');expect(result.operators).toBe(2);expect(result.block).toBe('100');
 });
 it('labels a one-provider policy honestly and refuses a two-provider policy with a missing response',()=>{
  const single={...policy,providers:[policy.providers[0]!],minimum_operators:1};expect(verifyRpcObservations({policy:single,observations:[observation()],now}).mode).toBe('single-provider-observed');
  expect(()=>verifyRpcObservations({policy,observations:[observation()],now})).toThrow('quorum');
 });
 it('never counts two endpoint aliases of one configured operator as independent',()=>{
  expect(()=>verifyRpcObservations({policy:{...policy,providers:[{id:'provider-a',operator:'same'},{id:'provider-b',operator:'same'}]},observations:[observation(),observation('provider-b')],now})).toThrow('independent');
 });
 it.each(['block','value_digest','block_time'] as const)('fails closed on provider disagreement in %s',field=>{
  const changes={block:'101',value_digest:digestJson('omitted withdrawal'),block_time:at(-2000)};expect(()=>verifyRpcObservations({policy,observations:[observation(),observation('provider-b',{[field]:changes[field]})],now})).toThrow('disagree');
 });
 it.each([{read_at:at(-61000)},{block_time:at(-61000)},{read_at:at(31000)},{block_time:at(31000)}])('refuses stale or future-dated observation %j',changes=>{
  expect(()=>verifyRpcObservations({policy,observations:[observation('provider-a',changes),observation('provider-b',changes)],now})).toThrow();
 });
 it('rejects duplicate, unknown and cross-scope identities',()=>{
  for(const bad of [observation(),observation('unknown'),observation('provider-b',{scope_digest:digestJson('other')})])expect(()=>verifyRpcObservations({policy,observations:[observation(),bad],now})).toThrow();
 });
 it('rejects older blocks and different data at an already checkpointed block',()=>{
  const accepted=verifyRpcObservations({policy,observations:[observation(),observation('provider-b')],now});
  for(const changes of [{block:'99'},{value_digest:digestJson('changed at same block')}])expect(()=>verifyRpcObservations({policy,observations:[observation('provider-a',changes),observation('provider-b',changes)],checkpoint:accepted.checkpoint,now})).toThrow();
  expect(verifyRpcObservations({policy,observations:[observation('provider-a',{block:'101'}),observation('provider-b',{block:'101'})],checkpoint:accepted.checkpoint,now}).block).toBe('101');
 });
 it('binds checkpoints to the pinned quorum policy and rejects a backwards local clock',()=>{
  const {checkpoint}=verifyRpcObservations({policy,observations:[observation(),observation('provider-b')],now});
  for(const changes of [{policy_digest:digestJson('weakened policy')},{last_verified_at:at(31000)}])expect(()=>verifyRpcObservations({policy,observations:[observation(),observation('provider-b')],checkpoint:{...checkpoint,...changes},now})).toThrow();
 });
});

describe('Persistent observed withdrawal journal',()=>{
 const scope=digestJson('artifact + policy'),evidence={signed:'withdrawal fixture'},verify=async(value:unknown)=>digestJson(value)===digestJson(evidence);
 it('retains and revalidates an observed withdrawal when the next provider response omits it',async()=>{
  const journal=await mergeWithdrawalJournal({scope_digest:scope,observed:[evidence],verify});
  expect((await mergeWithdrawalJournal({scope_digest:scope,journal,observed:[],verify})).evidence).toEqual([evidence]);
 });
 it('deduplicates identical signed evidence and rejects tampered cached evidence',async()=>{
  const journal=await mergeWithdrawalJournal({scope_digest:scope,observed:[evidence,evidence],verify});expect(journal.evidence).toHaveLength(1);
  await expect(mergeWithdrawalJournal({scope_digest:scope,journal:{...journal,evidence:[{signed:'tampered'}]},observed:[],verify})).rejects.toThrow('Invalid');
 });
 it('rejects cross-policy replay, unverified new evidence and an excessive journal',async()=>{
  const journal=await mergeWithdrawalJournal({scope_digest:scope,observed:[evidence],verify});
  await expect(mergeWithdrawalJournal({scope_digest:digestJson('other'),journal,observed:[],verify})).rejects.toThrow('scope');
  await expect(mergeWithdrawalJournal({scope_digest:scope,observed:[{unsigned:true}],verify})).rejects.toThrow('Invalid');
  await expect(mergeWithdrawalJournal({scope_digest:scope,observed:Array.from({length:201},(_,i)=>({i})),verify:async()=>true})).rejects.toThrow('budget');
 });
});

afterEach(()=>vi.unstubAllGlobals());
describe('Real SDK block-pinned graph transport',()=>{
 const kit=createGraphKit(),graph=kit.graphSchema.parse({schema:'arkiv.graph.v1',label:'Snapshot fixture',nodes:[{id:'one',type:'fixture',label:'One',digest:digestJson('one'),detail:'Synthetic transport test'}],edges:[]});
 async function rpc(pageBlocks:string[],head=100n){
  const signed:GraphRecord[]=await Promise.all(kit.graphPayloads(graph,account.address,new Date(Date.now()-1000).toISOString(),new Date(Date.now()+60000).toISOString()).map(async(p,i)=>({key:`0x${String(i+1).padStart(64,'0')}`,creator:account.address,envelope:await kit.signGraph(p,account)})));
  const requests:any[]=[];let page=0;
  vi.stubGlobal('fetch',vi.fn(async(_url:unknown,init:RequestInit)=>{
   const request=JSON.parse(init.body as string);requests.push(request);
   let result:unknown;
   if(request.method==='arkiv_getBlockTiming')result={current_block:`0x${head.toString(16)}`,current_block_time:Math.floor(Date.now()/1000),duration:2};
   else {const row=signed[Math.min(page,signed.length-1)]!,input=kit.graphEntityInput(row.envelope);result={data:[{key:row.key,creator:row.creator,payload:stringToHex(JSON.stringify(row.envelope)),creationFlags:1,attributes:Object.entries(input.attributes).map(([name,attribute])=>({name,type:attribute.type,value:typeof attribute.value==='bigint'?`0x${attribute.value.toString(16)}`:attribute.value}))}],blockNumber:pageBlocks[page]??pageBlocks.at(-1),...(page===0?{cursor:'second'}:{})};page++;}
   return new Response(JSON.stringify({jsonrpc:'2.0',id:request.id,result}),{headers:{'content-type':'application/json'}});
  }));return requests;
 }
 it('pins all pages to requested atBlock with an expiry predicate at that block',async()=>{
  const requests=await rpc(['0x63','0x63']),result=await kit.readGraph({rpc:'https://snapshot.invalid',issuers:[account.address],atBlock:99n},digestJson(graph));expect(result.block).toBe('99');
  const queries=requests.filter(r=>r.method==='arkiv_query');expect(queries).toHaveLength(2);for(const q of queries){expect(q.params[1].atBlock).toBe('0x63');expect(q.params[0]).toContain('$expiresAt > u64(99)');}
 });
 it.each([['0x62','0x63'],['0x63','0x62']])('rejects mismatched snapshot page blocks %j',async(first,second)=>{
  await rpc([first,second]);await expect(kit.readGraph({rpc:'https://snapshot.invalid',issuers:[account.address],atBlock:99n},digestJson(graph))).rejects.toThrow('different graph snapshot');
 });
 it('also pins the default head and rejects a requested block beyond the observed head',async()=>{
  const requests=await rpc(['0x64','0x64']);await kit.readGraph({rpc:'https://snapshot.invalid',issuers:[account.address]},digestJson(graph));expect(requests.find(r=>r.method==='arkiv_query').params[1].atBlock).toBe('0x64');
  await rpc(['0x65']);await expect(kit.readGraph({rpc:'https://snapshot.invalid',issuers:[account.address],atBlock:101n},digestJson(graph))).rejects.toThrow('ahead');
 });
});
