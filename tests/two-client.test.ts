import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {beforeAll,describe,expect,it,vi} from 'vitest';
import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts';
import {contextDescriptor,descriptorSchema,digestBytes,digestJson,NAMESPACE,recordSchema,signRecord,type VerifiedRecord} from '../packages/sdk/src/index';
import {AI_PASSPORT_PROFILE,createGraphKit} from '../packages/arkiv-graph/src/index';
import {createTwoClientConsumer,verifyTwoClientSession,type TwoClientRead,type TwoClientSession,type TwoClientSubject,type TwoClientReceipt} from '../apps/web/src/two-client-model';
import {TWO_CLIENT_PLAN} from '../scripts/two-client-demo';

const producer=privateKeyToAccount(generatePrivateKey()),reviewer=privateKeyToAccount(generatePrivateKey()),stranger=privateKeyToAccount(generatePrivateKey());
const kit=createGraphKit(AI_PASSPORT_PROFILE),sessionId=randomUUID(),now=Date.now();
const issued=new Date(now-1000).toISOString(),until=new Date(now+86400000).toISOString();
let packet:any,source:string,subject:TwoClientSubject,passport:VerifiedRecord,review:VerifiedRecord,withdrawal:VerifiedRecord,graph:TwoClientRead['graph'];
async function record(kind:'passport'|'review'|'withdrawal',signer=kind==='passport'?producer:reviewer,patch:any={}):Promise<VerifiedRecord>{
  const common={schema:'app-passport.record.v1',namespace:NAMESPACE,issuer:signer.address,artifact_digest:subject.descriptor.artifact_digest,descriptor_digest:digestJson(subject.descriptor),issued_at:issued,valid_until:until,disclosure:'synthetic-fixture'};
  const payload=recordSchema.parse({...common,kind,...(kind==='passport'?{descriptor:subject.descriptor}:kind==='review'?{scope:'identity-and-protocol',conclusion:'requirements-satisfied',evidence_url:'https://example.com/evidence',checks:[{name:'Synthetic controlled check',passed:true,detail:'Unit test, not live chain evidence.'}]}:{target_key:review.key,reason:'Synthetic exact-target withdrawal'}),...patch});
  const digit=kind==='passport'?'1':kind==='review'?'2':'3';
  return {key:'0x'+digit.repeat(64),creator:signer.address,owner:signer.address,created_at_block:kind==='withdrawal'?'111':'100',expires_at_block:'100000000',envelope:await signRecord(payload,signer)};
}
function current(records:VerifiedRecord[]=[passport,review],patch:any={}):TwoClientRead{
  return {...structuredClone({records,ignored:0,block:records.some(r=>r.envelope.payload.kind==='withdrawal')?'120':'110',query:'synthetic test query',graph,packet,sources:[{repository_path:'src/release.ts',path:'/sources/release.ts',body:source}]}),session_id:sessionId,read_at:new Date().toISOString(),...patch};
}
beforeAll(async()=>{
  packet=JSON.parse(await fs.readFile('apps/web/public/data/handoff-packet.json','utf8'));
  source=await fs.readFile('apps/web/public/sources/release.ts','utf8');
  const data=kit.graphSchema.parse({schema:AI_PASSPORT_PROFILE.graphSchema,label:'Synthetic two-client graph',nodes:[{id:'context:handoff',type:'context',label:'Qarinah coding packet',digest:digestJson(packet),artifact_digest:digestJson(packet),detail:'Synthetic unit-test graph.'},{id:'source:release',type:'source',label:'release.ts',digest:digestBytes(new TextEncoder().encode(source)),source_path:'/sources/release.ts',detail:'Public synthetic source.'}],edges:[{id:'edge:source',from:'context:handoff',to:'source:release',relation:'compiled-from'}]});
  const root=digestJson(data);
  const descriptor=descriptorSchema.parse({...contextDescriptor(packet,'Two-client test',sessionId),capabilities:['cited-context','graph-root:'+root,'deterministic-release-guard']});
  subject={session_id:sessionId,descriptor,policy:{issuers:[producer.address],reviewers:[reviewer.address],scope:'identity-and-protocol'},graph:{graph_digest:root,issuers:[producer.address],start:'context:handoff',packet_url:'/data/handoff-packet.json'}};
  const payloads=kit.graphPayloads(data,producer.address,issued,until);
  const records=[];for(let i=0;i<payloads.length;i++)records.push({key:'0x'+String(i+4).repeat(64),creator:producer.address,envelope:await kit.signGraph(payloads[i]!,producer)});
  graph={records,block:'109',query:'synthetic graph query',read_at:new Date().toISOString()};
  passport=await record('passport');review=await record('review');withdrawal=await record('withdrawal');
});

describe('two independently instantiated graph and review consumers',()=>{
  it('makes separate reads and independently verifies the graph, packet, source and six guard cases',async()=>{
    const readA=vi.fn(async()=>current()),readB=vi.fn(async()=>current());
    const A=createTwoClientConsumer('A',readA),B=createTwoClientConsumer('B',readB);
    const a=await A.request(subject),b=await B.request(subject);
    expect(readA).toHaveBeenCalledTimes(1);expect(readB).toHaveBeenCalledTimes(1);
    for(const result of [a,b]){expect(result.admission.allowed).toBe(true);expect(result.evidence?.node_ids).toEqual(['context:handoff','source:release']);expect(result.evidence?.source_files_verified).toBe(1);expect(result.output?.cases).toHaveLength(6);expect(result.output?.passed).toBe(true);expect(result.inference_run).toBe(false);}
    expect(a.read).not.toBe(b.read);
  });
  it('B next request refuses after withdrawal and never reuses its previous accepted decision',async()=>{
    let records=[passport,review];const readB=vi.fn(async()=>current(records));
    const B=createTwoClientConsumer('B',readB);
    expect((await B.request(subject,'before-withdrawal')).task_executed).toBe(true);
    records=[passport,review,withdrawal];const next=await B.request(subject,'after-withdrawal');
    expect(readB).toHaveBeenCalledTimes(2);expect(next.request_no).toBe(2);expect(next.admission.status).toBe('withdrawn');expect(next.task_executed).toBe(false);expect(next.evidence_admitted).toBe(false);expect(next.output).toBeNull();
  });
  it('fails closed on a new unavailable read after an earlier acceptance',async()=>{
    const read=vi.fn().mockResolvedValueOnce(current()).mockRejectedValueOnce(new Error('Provider unavailable'));
    const A=createTwoClientConsumer('A',read);expect((await A.request(subject)).admission.allowed).toBe(true);
    const next=await A.request(subject);expect(next.admission.status).toBe('unavailable');expect(next.output).toBeNull();expect(next.task_executed).toBe(false);
  });
  it('rejects a response for a different deployed session',async()=>{
    const result=await createTwoClientConsumer('A',async()=>current(undefined,{session_id:randomUUID()})).request(subject);
    expect(result.admission.status).toBe('unavailable');expect(result.task_executed).toBe(false);
  });
  it('rejects a stale current read instead of replaying an accepted observation',async()=>{
    const result=await createTwoClientConsumer('A',async()=>current(undefined,{read_at:new Date(Date.now()-120000).toISOString()})).request(subject);
    expect(result.admission.status).toBe('unavailable');expect(result.task_executed).toBe(false);
  });
  it('rejects changed source bytes even when the passport and review are current',async()=>{
    const response=current();response.sources[0]!.body+='\n// altered';
    const result=await createTwoClientConsumer('A',async()=>response).request(subject);
    expect(result.admission.status).toBe('unavailable');expect(result.evidence_admitted).toBe(false);
  });
  it('rejects an incomplete signed graph manifest',async()=>{
    const response=current();response.graph.records.pop();
    const result=await createTwoClientConsumer('A',async()=>response).request(subject);
    expect(result.admission.status).toBe('unavailable');expect(result.output).toBeNull();
  });
  it('ignores expired signed graph originals when a complete current graph renewal exists',async()=>{
    const response=current(),oldUntil=new Date(Date.now()-1000).toISOString(),oldIssued=new Date(Date.now()-86400000).toISOString();
    let i=10;
    for(const original of [...response.graph.records])response.graph.records.push({key:'0x'+(i++).toString(16).repeat(64),creator:producer.address,envelope:await kit.signGraph({...original.envelope.payload,issued_at:oldIssued,valid_until:oldUntil},producer)});
    const result=await createTwoClientConsumer('A',async()=>response).request(subject);
    expect(result.admission.allowed).toBe(true);expect(result.output?.passed).toBe(true);
  });
  it('old reviews for identical packet bytes cannot admit a fresh descriptor version',async()=>{
    const fresh={...subject,descriptor:{...subject.descriptor,version:randomUUID()}};
    const result=await createTwoClientConsumer('A',async()=>current()).request(fresh);
    expect(result.admission.status).toBe('unknown');expect(result.task_executed).toBe(false);
  });
  it('another project role cannot withdraw the reviewer record',async()=>{
    const alien=await record('withdrawal',producer);
    const result=await createTwoClientConsumer('B',async()=>current([passport,review,alien])).request(subject);
    expect(result.admission.allowed).toBe(true);
  });
  it('a replacement review is a separate record and can renew the gate',async()=>{
    const fresh={...await record('review'),key:'0x'+'9'.repeat(64),created_at_block:'112'};
    const result=await createTwoClientConsumer('B',async()=>current([passport,review,withdrawal,fresh])).request(subject);
    expect(result.admission.allowed).toBe(true);
  });
});

async function observedSession(completed:boolean):Promise<TwoClientSession>{
  let records=[passport,review];
  const A=createTwoClientConsumer('A',async()=>current(records)),B=createTwoClientConsumer('B',async()=>current(records));
  const observations:TwoClientReceipt[]=[await A.request(subject,'before-withdrawal'),await B.request(subject,'before-withdrawal')];
  const makeTx=(r:VerifiedRecord,index:number)=>({kind:r.envelope.payload.kind,entity_key:r.key,tx_hash:'0x'+String(index).repeat(64),creator:r.creator,submitted_at:issued,confirmed_at:issued,created_at_block:r.created_at_block,expires_at_block:r.expires_at_block,envelope:r.envelope});
  const transactions=[makeTx(passport,5),makeTx(review,6)];
  if(completed){
    records=[passport,review,withdrawal];const withdrawalAt=new Date().toISOString();
    transactions.push({...makeTx(withdrawal,7),submitted_at:withdrawalAt,confirmed_at:withdrawalAt});
    observations.push(await B.request(subject,'after-withdrawal'),await A.request(subject,'after-withdrawal'));
  }
  return {...subject,schema:'app-passport.two-client-session.v1',started_at:issued,updated_at:new Date().toISOString(),completed_at:completed?new Date().toISOString():null,status:completed?'completed':'accepted',network:{chain_id:7738577,name:'Tiramisu',rpc_origin:'https://rpc.example.com'},roles:{producer:producer.address,reviewer:reviewer.address,operator:'Project-controlled wallets; not independent people or organizations.'},transactions,observations,records,consistency_reads:[],limitations:['Synthetic unit test, no transaction was broadcast.']};
}
describe('observed session evidence and safe operator entry point',()=>{
  it('verifies an accepted-phase snapshot and a completed four-request lifecycle',async()=>{
    expect((await verifyTwoClientSession(await observedSession(false))).status).toBe('accepted');
    expect((await verifyTwoClientSession(await observedSession(true))).observations[2]!.admission.status).toBe('withdrawn');
  });
  it('rejects a reported accepted receipt when its signed evidence says withdrawn',async()=>{
    const session=await observedSession(true);session.observations[2]!.admission.allowed=true;session.observations[2]!.admission.status='requirements-satisfied';
    await expect(verifyTwoClientSession(session)).rejects.toThrow();
  });
  it('failed runs still verify their positive retained observations',async()=>{
    const session=await observedSession(true);session.status='failed';session.failure_stage='consumer-B-next';
    session.observations[0]!.read!.sources[0]!.body+=' changed';
    await expect(verifyTwoClientSession(session)).rejects.toThrow();
  });
  it('retains a failed unavailable request without turning it into an admitted task',async()=>{
    const session=await observedSession(true);session.status='failed';session.failure_stage='consumer-B-next';
    session.observations[2]={...session.observations[2]!,read:null,evidence:null,admission:{allowed:false,status:'unavailable',reason:'Synthetic provider failure'},evidence_admitted:false,task_executed:false,output:null};
    expect((await verifyTwoClientSession(session)).observations[2]!.admission.status).toBe('unavailable');
  });
  it('rejects an edited transaction target or substituted policy',async()=>{
    const session=await observedSession(true);session.policy.reviewers=[stranger.address];
    await expect(verifyTwoClientSession(session)).rejects.toThrow('role binding');
  });
  it('publishing is an explicit CLI action and the safe plan describes all three writes',()=>{
    expect(TWO_CLIENT_PLAN.writes).toBe(3);expect(TWO_CLIENT_PLAN.invocation).toContain('--publish');expect(TWO_CLIENT_PLAN.sequence.at(-1)).toContain('B next task request');
  });
});
