import fs from 'node:fs/promises';
import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts';
import {createGraphKit,digestJson,DEFAULT_RPC} from '../packages/arkiv-graph/src/index';
import {rootTrustConfigSchema,rootTrustScope,rootGenesisDigest,signRootRevision,verifyRootRevisions,type RootRevisionEnvelope} from '../packages/arkiv-graph/src/root-update';
import {readRootRegistry} from '../packages/arkiv-graph/src/root-registry';
import {verifyRpcObservations,type RpcObservation,type RpcTrustPolicy} from '../packages/arkiv-graph/src/rpc-trust';
import {createTwoClientConsumer,twoClientLiveCheckpointSchema,verifyTwoClientSession,type TwoClientRead,type TwoClientTrustStore} from '../apps/web/src/two-client-model';

type Check={name:string;passed:boolean;evidence_kind:'live-rpc'|'signed-public-evidence-replay'|'synthetic-fault-injection';detail:string};
const checks:Check[]=[];
async function check(name:string,kind:Check['evidence_kind'],detail:string,run:()=>unknown|Promise<unknown>){try{await run();checks.push({name,passed:true,evidence_kind:kind,detail});}catch{checks.push({name,passed:false,evidence_kind:kind,detail:'Check failed. No success claim is published.'});}}
function assert(value:unknown){if(!value)throw new Error('Assertion failed');}
async function rejects(run:()=>unknown|Promise<unknown>){let rejected=false;try{await run();}catch{rejected=true;}assert(rejected);}
async function main(){
 const started=new Date().toISOString(),config=rootTrustConfigSchema.parse(JSON.parse(await fs.readFile('apps/web/public/data/root-trust-config.json','utf8'))),kit=createGraphKit();
 const live=await readRootRegistry(config);
 const verified=await verifyRootRevisions({config,revisions:live.revisions});
 await check('Live registry and signed current graph','live-rpc','Official public Tiramisu RPC, explicit same snapshot, authenticated registry, every manifest-listed graph member.',()=>{assert(live.revisions.length===2&&verified.root===digestJson(live.graph.graph)&&live.block===live.graph.block);});
 const graphReads:{sequence:number;root:string;block:string;nodes:number;edges:number;entities:number}[]=[];
 for(const revision of live.revisions){
  const result=await kit.readGraph({rpc:DEFAULT_RPC,issuers:[config.authority],atBlock:BigInt(live.block)},revision.payload.root);
  graphReads.push({sequence:revision.payload.sequence,root:revision.payload.root,block:result.block,nodes:result.graph.nodes.length,edges:result.graph.edges.length,entities:result.records.length});
 }
 await check('Both actual published graph revisions readable','live-rpc','Each distinct root is independently reconstructed from signed Arkiv entities at the registry snapshot.',()=>assert(graphReads.length===2&&graphReads.every(v=>v.block===live.block)));
 await check('Serialized checkpoint accepts the same signed head','signed-public-evidence-replay','A returning client reloads the serialized monotonic root checkpoint.',async()=>assert((await verifyRootRevisions({config,revisions:live.revisions,checkpoint:JSON.parse(JSON.stringify(verified.checkpoint))})).root===verified.root));
 await check('Hidden latest revision rejected after checkpoint','signed-public-evidence-replay','Provider omission simulated by removing the actual sequence-two head from a previously observed chain.',()=>rejects(()=>verifyRootRevisions({config,revisions:live.revisions.slice(0,1),checkpoint:verified.checkpoint})));
 await check('Tampered live root payload rejected','signed-public-evidence-replay','One byte-bound field is changed while retaining the original real signature.',async()=>{
  const changed=structuredClone(live.revisions);changed[1]!.payload.root=digestJson('tampered graph');await rejects(()=>verifyRootRevisions({config,revisions:changed}));
 });
 await check('Chain, registry, policy and profile substitutions rejected','signed-public-evidence-replay','Existing actual revision signatures cannot cross the pinned scope.',async()=>{
  for(const replacement of [{chain_id:42},{registry_id:'other:registry'},{policy_digest:digestJson('other')},{profile:'other-profile'}])await rejects(()=>verifyRootRevisions({config:{...config,...replacement},revisions:live.revisions}));
 });
 await check('Expired head refuses new use','signed-public-evidence-replay','Verification clock deliberately moved beyond the signed head deadline; historical links are not rewritten.',()=>rejects(()=>verifyRootRevisions({config,revisions:live.revisions,now:Date.parse(live.revisions.at(-1)!.payload.valid_until)+1})));
 await check('Unauthorized signed root rejected','synthetic-fault-injection','A fresh in-memory test signer cannot replace the pinned authority. No key is stored or published.',async()=>{
  const stranger=privateKeyToAccount(generatePrivateKey()),foreign=await signRootRevision({...live.revisions[0]!.payload,issuer:stranger.address},stranger);await rejects(()=>verifyRootRevisions({config,revisions:[foreign]}));
 });
 await check('Different correctly signed branch rejected at checkpoint','synthetic-fault-injection','A separate ephemeral authority signs two valid branches solely to test fork detection; no network write occurs.',async()=>{
  const signer=privateKeyToAccount(generatePrivateKey()),testConfig={...config,authority:signer.address},now=Date.now();
  const base=await signRootRevision({schema:'arkiv.graph-root-revision.v1',scope_digest:rootTrustScope(testConfig),sequence:1,previous_revision_digest:rootGenesisDigest(testConfig),previous_root:testConfig.genesis_root,root:digestJson('synthetic branch one'),issuer:signer.address,issued_at:new Date(now-1000).toISOString(),valid_until:new Date(now+60000).toISOString()},signer);
  const first=await verifyRootRevisions({config:testConfig,revisions:[base]});
  const fork:RootRevisionEnvelope=await signRootRevision({...base.payload,root:digestJson('synthetic branch two')},signer);
  await rejects(()=>verifyRootRevisions({config:testConfig,revisions:[fork],checkpoint:first.checkpoint}));
 });
 const provider={id:'tiramisu-official',operator:'Arkiv official public RPC'};
 const policy:RpcTrustPolicy={schema:'arkiv.graph-rpc-policy.v1',scope_digest:rootTrustScope(config),providers:[provider],minimum_operators:1,max_age_seconds:120};
 const observation:RpcObservation={provider_id:provider.id,scope_digest:rootTrustScope(config),block:live.block,block_time:live.block_time,read_at:live.read_at,value_digest:live.value_digest};
 const rpc=verifyRpcObservations({policy,observations:[observation]});
 await check('Single live provider remains explicitly labeled','live-rpc','The real official endpoint counts as one operator. This is not quorum or non-omission proof.',()=>assert(rpc.mode==='single-provider-observed'&&rpc.operators===1));
 await check('Older RPC snapshot rejected after local checkpoint','synthetic-fault-injection','The real observation is locally altered to an older block; the retained checkpoint refuses it.',()=>rejects(()=>verifyRpcObservations({policy,observations:[{...observation,block:String(BigInt(observation.block)-1n)}],checkpoint:rpc.checkpoint})));
 await check('Stale chain time rejected','synthetic-fault-injection','The real observation is locally altered to a five-minute-old chain time.',()=>rejects(()=>verifyRpcObservations({policy,observations:[{...observation,block_time:new Date(Date.now()-300000).toISOString()}]})));
 await check('Configured operators disagree: fail closed','synthetic-fault-injection','Two simulated operator observations differ in state at one block. No second live provider is claimed.',()=>{
  const cross={...policy,providers:[...policy.providers,{id:'simulated-peer',operator:'simulated-other-operator'}],minimum_operators:2};
  return rejects(()=>verifyRpcObservations({policy:cross,observations:[observation,{...observation,provider_id:'simulated-peer',value_digest:digestJson('simulated omission')}]}));
 });
 await check('Endpoint aliases cannot create independent operator quorum','synthetic-fault-injection','Two locally configured endpoint IDs sharing one operator are rejected under minimum-two policy.',()=>rejects(()=>verifyRpcObservations({policy:{...policy,providers:[...policy.providers,{id:'second-key-same-server',operator:provider.operator}],minimum_operators:2},observations:[observation,{...observation,provider_id:'second-key-same-server'}]})));

 const session=await verifyTwoClientSession(JSON.parse(await fs.readFile('apps/web/public/data/two-client-session.json','utf8'))),snapshot=session.observations.at(-1)!.read!;
 let saved:unknown|null=null,records=snapshot.records,block=BigInt(snapshot.block);
 const store:TwoClientTrustStore={load:async()=>structuredClone(saved),save:async(_s,_id,checkpoint)=>{saved=structuredClone(checkpoint);}};
 const read=async():Promise<TwoClientRead>=>({...structuredClone(snapshot),records:structuredClone(records),block:String(block),read_at:new Date().toISOString(),graph:{...structuredClone(snapshot.graph),block:String(block),read_at:new Date().toISOString()}});
 await check('Published signed withdrawal retained before task','signed-public-evidence-replay','Actual public session envelopes and source evidence are replayed locally; this does not broadcast or assert a new chain read.',async()=>{
  const result=await createTwoClientConsumer('A',read,{trustStore:store}).request(session);assert(result.admission.status==='withdrawn'&&!result.task_executed&&twoClientLiveCheckpointSchema.parse(saved).withdrawals.length===1);
 });
 records=records.filter(r=>r.envelope.payload.kind!=='withdrawal');block++;
 await check('Reloaded consumer refuses omission of observed withdrawal','signed-public-evidence-replay','A new consumer loads the same serialized checkpoint while a simulated later response omits the actual withdrawal.',async()=>{
  const result=await createTwoClientConsumer('A',read,{trustStore:store}).request(session);assert(result.admission.status==='withdrawn'&&!result.task_executed&&result.output===null);
 });
 await check('Withdrawal seen without target survives later target restoration','signed-public-evidence-replay','Actual signed withdrawal is first returned without its review; a later controlled response restores that review and omits the withdrawal.',async()=>{
  let pendingState:unknown|null=null;
  const pendingStore:TwoClientTrustStore={load:async()=>structuredClone(pendingState),save:async(_s,_id,value)=>{pendingState=structuredClone(value);}};
  const withoutTarget={...await read(),records:snapshot.records.filter(r=>r.envelope.payload.kind!=='review')};
  const first=await createTwoClientConsumer('B',async()=>withoutTarget,{trustStore:pendingStore}).request(session);assert(!first.task_executed&&twoClientLiveCheckpointSchema.parse(pendingState).unpaired_withdrawals.length===1);
  const restored={...await read(),block:String(block+1n),records:snapshot.records.filter(r=>r.envelope.payload.kind!=='withdrawal')};
  const second=await createTwoClientConsumer('B',async()=>restored,{trustStore:pendingStore}).request(session);assert(second.admission.status==='withdrawn'&&!second.task_executed);
 });
 await check('Tampered cached signature refuses without overwriting state','signed-public-evidence-replay','Cached real withdrawal signature is damaged locally; task remains blocked and failed verification preserves existing stored state.',async()=>{
  const bad=twoClientLiveCheckpointSchema.parse(saved);bad.withdrawals[0]!.withdrawal.envelope.signature='0x'+'0'.repeat(130);saved=bad;const before=digestJson(saved);block++;
  const result=await createTwoClientConsumer('A',read,{trustStore:store}).request(session);assert(result.admission.status==='unavailable'&&!result.task_executed&&before===digestJson(saved));
 });
 await check('Persistence failure prevents task admission','signed-public-evidence-replay','A local store write is deliberately refused before the deterministic task can execute.',async()=>{
  const unavailable:TwoClientTrustStore={load:async()=>null,save:async()=>{throw new Error('Simulated storage refusal');}};
  const result=await createTwoClientConsumer('B',read,{trustStore:unavailable}).request(session);assert(result.admission.status==='unavailable'&&!result.task_executed);
 });
 const report={schema:'arkiv.graph-trust-safeguards.v1',started_at:started,completed_at:new Date().toISOString(),passed:checks.filter(v=>v.passed).length,total:checks.length,checks,
  live:{rpc:DEFAULT_RPC,chain_id:config.chain_id,block:live.block,block_time:live.block_time,registry_entities:live.registry_records.map(v=>v.key),revision_count:live.revisions.length,current_root:live.root,graph_revisions:graphReads,root_scope:rootTrustScope(config),provider_count:1},
  withdrawal:{session_id:session.session_id,transaction:session.transactions.find(v=>v.kind==='withdrawal')!.tx_hash,scope:'The journal tests replay actual public signed session envelopes with controlled local response omission. They do not claim a new withdrawal publication or an external independent consumer.'},
  limitations:['The official public Tiramisu endpoint remains one provider. No independent live-provider quorum or cryptographic query-completeness proof is implemented.','Authenticated revision chains and local checkpoints prevent tampering and observed rollback/forks. They cannot discover an unseen newer head omitted by every source.','Local browser storage is client-controlled. Deleting/resetting it loses observed history; local compromise is not prevented.','Provider timestamps, chain metadata and indexed query completeness remain provider assumptions; the local freshness check uses the client clock.','Synthetic fault injection and public-signed-evidence replay are labeled separately from actual current RPC reads.'],
  reproduce:'npm run build:sdk && npx tsx scripts/verify-trust-safeguards.ts',source_status:'SDK/source functionality in this checkout; npm release version must be checked independently.'};
 if(report.passed!==report.total){await fs.writeFile('.local/trust-safeguards-failure.json',JSON.stringify(report,null,2)+'\n');throw new Error('Trust safeguards failed');}
 await fs.writeFile('apps/web/public/data/trust-safeguards.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({passed:report.passed,total:report.total,live_block:live.block,revisions:live.revisions.length,public_report:'apps/web/public/data/trust-safeguards.json'}));
}
main().catch(()=>{console.error('Trust safeguard verification failed. No public success report was written.');process.exitCode=1;});
