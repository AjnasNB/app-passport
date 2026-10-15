import {z} from 'zod';
import {createGraphKit,AI_PASSPORT_PROFILE} from '@ajnasnb/arkiv-graph';
import {canonicalJson,descriptorSchema,digestBytes,digestJson,digestSchema,envelopeSchema,evaluateAdmission,policySchema,repositoryDigest,validateContextPacket,type Admission} from '@ajnasnb/ai-passport';
import {testGuard} from '@ajnasnb/ai-passport/tools';

const kit=createGraphKit(AI_PASSPORT_PROFILE);
const hex32=z.string().regex(/^0x[0-9a-fA-F]{64}$/);
const address=z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const block=z.string().regex(/^(0|[1-9][0-9]*)$/);
const instant=z.iso.datetime();
export const TWO_CLIENT_SOURCE_MAP=[{repository_path:'src/release.ts',path:'/sources/release.ts'}] as const;
export const twoClientGraphSchema=z.object({
  graph_digest:digestSchema,issuers:z.array(address).min(1).max(20),
  start:z.literal('context:handoff'),packet_url:z.literal('/data/handoff-packet.json'),
}).strict();
export const twoClientRecordSchema=z.object({
  key:hex32,creator:address,owner:address,created_at_block:block,expires_at_block:block,envelope:envelopeSchema,
}).strict();
export const twoClientReadSchema=z.object({
  session_id:z.string().uuid(),records:z.array(twoClientRecordSchema).max(1000),ignored:z.number().int().nonnegative(),
  block,query:z.string().max(12000),read_at:instant,
  graph:z.object({records:z.array(z.object({key:hex32,creator:address,envelope:kit.graphEnvelopeSchema}).strict()).max(701),block,query:z.string().max(12000),read_at:instant}),
  packet:z.unknown(),sources:z.array(z.object({repository_path:z.literal('src/release.ts'),path:z.literal('/sources/release.ts'),body:z.string().max(2*1024*1024)}).strict()).length(1),
});
export type TwoClientRead=z.infer<typeof twoClientReadSchema>;
const admissionSchema=z.object({
  status:z.enum(['requirements-satisfied','unknown','expired','withdrawn','artifact-mismatch','stale-context','attention-required','unavailable']),
  allowed:z.boolean(),reason:z.string().max(1000),valid_until:instant.optional(),
}).strict();
const evidenceSchema=z.object({
  graph_digest:digestSchema,graph_block:block,start:z.literal('context:handoff'),
  graph_valid_until:instant,
  node_ids:z.array(z.string()).max(40),edge_ids:z.array(z.string()).max(500),
  source_files_verified:z.number().int().nonnegative(),packet_digest:digestSchema,repository_digest:digestSchema,
}).strict();
const guardResultSchema=z.object({passed:z.boolean(),code:z.string().max(2000),cases:z.array(z.object({
  name:z.string().max(150),digest:z.string().max(100),review:z.boolean(),expected:z.boolean(),actual:z.boolean(),
}).strict()).length(6)}).strict();
export const twoClientReceiptSchema=z.object({
  consumer:z.enum(['A','B']),request_no:z.number().int().positive(),
  phase:z.enum(['before-withdrawal','after-withdrawal','live']),requested_at:instant,decision_at:instant,
  read:twoClientReadSchema.nullable(),evidence:evidenceSchema.nullable(),admission:admissionSchema,
  task_executed:z.boolean(),evidence_admitted:z.boolean(),inference_run:z.literal(false),output:guardResultSchema.nullable(),
}).strict();
export type TwoClientReceipt=z.infer<typeof twoClientReceiptSchema>;
export const twoClientTransactionSchema=z.object({
  kind:z.enum(['passport','review','withdrawal']),entity_key:hex32,tx_hash:hex32,
  creator:address,submitted_at:instant,confirmed_at:instant,
  created_at_block:block,expires_at_block:block,envelope:envelopeSchema,
}).strict();
export const twoClientSessionSchema=z.object({
  schema:z.literal('app-passport.two-client-session.v1'),session_id:z.string().uuid(),
  started_at:instant,updated_at:instant,completed_at:instant.nullable(),status:z.enum(['accepted','completed','failed']),
  network:z.object({chain_id:z.literal(7738577),name:z.literal('Tiramisu'),rpc_origin:z.string().url()}).strict(),
  roles:z.object({producer:address,reviewer:address,operator:z.literal('Project-controlled wallets; not independent people or organizations.')}).strict(),
  descriptor:descriptorSchema,policy:policySchema,graph:twoClientGraphSchema,
  transactions:z.array(twoClientTransactionSchema).min(2).max(3),
  observations:z.array(twoClientReceiptSchema).min(2).max(4),
  records:z.array(twoClientRecordSchema).max(1000),
  consistency_reads:z.array(z.object({stage:z.string().max(100),attempt:z.number().int().min(1).max(8),ready:z.boolean(),available:z.boolean(),read_at:instant.nullable(),block:block.nullable()}).strict()).max(16),
  limitations:z.array(z.string().max(500)).max(10),failure_stage:z.string().max(100).optional(),
}).strict();
export type TwoClientSession=z.infer<typeof twoClientSessionSchema>;
export type TwoClientSubject=Pick<TwoClientSession,'session_id'|'descriptor'|'policy'|'graph'>;

/** Authenticate a complete graph, its selected path, the Qarinah packet and exact public source bytes. */
export async function verifyTwoClientEvidence(subject:TwoClientSubject,current:TwoClientRead,now=Date.now()){
  if(current.session_id!==subject.session_id)throw new Error('Response belongs to a different session');
  const graph=await kit.assembleGraph(current.graph.records,subject.graph.graph_digest,subject.graph.issuers,now);
  const path=kit.traverseGraph(graph,subject.graph.start,{depth:4,maxNodes:40});
  if(path.truncated)throw new Error('Graph path exceeded its bound');
  const packet:any=current.packet;
  validateContextPacket(packet);
  const packetDigest=digestJson(packet),node=path.nodes.find(n=>n.id===subject.graph.start);
  if(!node||node.digest!==packetDigest||node.artifact_digest!==packetDigest||packetDigest!==subject.descriptor.artifact_digest)throw new Error('Graph and context packet binding do not match');
  const snapshot=structuredClone(packet);
  if(!snapshot.repository.files.length||snapshot.repository.files.length!==TWO_CLIENT_SOURCE_MAP.length)throw new Error('Packet source set is unsupported');
  for(const file of snapshot.repository.files){
    const mapping=TWO_CLIENT_SOURCE_MAP.find(s=>s.repository_path===file.path);
    const source=mapping&&current.sources.find(s=>s.repository_path===mapping.repository_path&&s.path===mapping.path);
    const sourceNode=mapping&&path.nodes.find(n=>n.type==='source'&&n.source_path===mapping.path);
    if(!source||!sourceNode)throw new Error('Required public source is missing from the graph path');
    const digest=digestBytes(new TextEncoder().encode(source.body));
    if(digest!==sourceNode.digest||digest!==file.contentHash)throw new Error('Public source bytes changed');
    file.contentHash=digest;
  }
  const repository=repositoryDigest(snapshot);
  if(repository!==subject.descriptor.context?.repository_digest||packet.manifestHash!==subject.descriptor.context.manifest_hash)throw new Error('Qarinah packet identity changed');
  const graphDeadline=Math.min(...current.graph.records.filter(r=>r.envelope.payload.graph_digest===subject.graph.graph_digest&&r.envelope.payload.issuer.toLowerCase()===r.creator.toLowerCase()&&subject.graph.issuers.some(issuer=>issuer.toLowerCase()===r.creator.toLowerCase())&&Date.parse(r.envelope.payload.valid_until)>now&&Date.parse(r.envelope.payload.issued_at)<=now+30000).map(r=>Date.parse(r.envelope.payload.valid_until)));
  return {graph_digest:subject.graph.graph_digest,graph_block:current.graph.block,start:subject.graph.start,graph_valid_until:new Date(graphDeadline).toISOString(),
    node_ids:path.nodes.map(n=>n.id),edge_ids:path.edges.map(e=>e.id),source_files_verified:snapshot.repository.files.length,
    packet_digest:packetDigest,repository_digest:repository};
}

/** Each instance owns its sequence and obtains a new graph/context/admission read on every request. */
export function createTwoClientConsumer(id:'A'|'B',read:(subject:TwoClientSubject)=>Promise<unknown>){
  let requestNo=0;
  return {
    async request(subject:TwoClientSubject,phase:TwoClientReceipt['phase']='live'):Promise<TwoClientReceipt>{
      const requested_at=new Date().toISOString(),request_no=++requestNo;
      let current:TwoClientRead|null=null,evidence:TwoClientReceipt['evidence']=null;
      let admission:Admission;
      try{
        descriptorSchema.parse(subject.descriptor);policySchema.parse(subject.policy);twoClientGraphSchema.parse(subject.graph);
        current=twoClientReadSchema.parse(await read(subject));
        for(const at of [current.read_at,current.graph.read_at])if(Date.parse(at)<Date.parse(requested_at)-60000||Date.parse(at)>Date.now()+60000)throw new Error('Current read timestamp is stale');
        evidence=await verifyTwoClientEvidence(subject,current);
        admission=await evaluateAdmission({descriptor:subject.descriptor,policy:subject.policy,
          observedDigest:evidence.packet_digest,currentRepositoryDigest:evidence.repository_digest,records:current.records});
      }catch{
        admission={status:'unavailable',allowed:false,reason:'This consumer could not verify the current graph, source and review evidence. The task did not run.',records:[]};
      }
      if(admission.allowed){
        const deadline=Math.min(Date.parse(admission.valid_until??''),Date.parse(evidence?.graph_valid_until??''));
        admission=Number.isFinite(deadline)&&deadline>Date.now()?{...admission,valid_until:new Date(deadline).toISOString()}:{status:'expired',allowed:false,reason:'The signed evidence deadline passed before this task could run. Make a fresh request.',records:admission.records};
      }
      const output=admission.allowed?testGuard({operation:'all',checks:['sha256-format','review-current']}):null;
      return {consumer:id,request_no,phase,requested_at,decision_at:new Date().toISOString(),read:current,evidence,
        admission:{status:admission.status,allowed:admission.allowed,reason:admission.reason,...(admission.valid_until?{valid_until:admission.valid_until}:{})},
        task_executed:admission.allowed,evidence_admitted:admission.allowed,inference_run:false,output};
    },
  };
}

/** Verify reported snapshots at their reported time. This cannot attest operator execution or RPC completeness. */
export async function verifyTwoClientSession(value:unknown):Promise<TwoClientSession>{
  canonicalJson(value);
  const session=twoClientSessionSchema.parse(value);
  const {descriptor,policy,transactions,observations}=session;
  if(descriptor.kind!=='context'||descriptor.version!==session.session_id||descriptor.provenance!=='synthetic-fixture'||!descriptor.capabilities.includes('graph-root:'+session.graph.graph_digest))throw new Error('Session descriptor binding does not match');
  if(session.roles.producer.toLowerCase()===session.roles.reviewer.toLowerCase()||policy.issuers.length!==1||policy.reviewers.length!==1||policy.issuers[0]!.toLowerCase()!==session.roles.producer.toLowerCase()||policy.reviewers[0]!.toLowerCase()!==session.roles.reviewer.toLowerCase())throw new Error('Session role binding does not match');
  const published=new Map(transactions.map(t=>[t.kind,t]));
  if(published.size!==transactions.length||new Set(transactions.map(t=>t.entity_key.toLowerCase())).size!==transactions.length||new Set(transactions.map(t=>t.tx_hash.toLowerCase())).size!==transactions.length)throw new Error('Distinct publication transactions are required');
  for(const tx of transactions){
    const record=session.records.find(r=>r.key.toLowerCase()===tx.entity_key.toLowerCase());
    if(!record||tx.kind!==record.envelope.payload.kind||canonicalJson(tx.envelope)!==canonicalJson(record.envelope)||tx.created_at_block!==record.created_at_block||tx.expires_at_block!==record.expires_at_block||tx.creator.toLowerCase()!==record.creator.toLowerCase())throw new Error('Transaction observation does not match its signed record');
  }
  const withdrawal=published.get('withdrawal'),review=published.get('review'),passport=published.get('passport');
  if(!passport||!review||passport.creator.toLowerCase()!==session.roles.producer.toLowerCase()||review.creator.toLowerCase()!==session.roles.reviewer.toLowerCase())throw new Error('Session publication roles do not match');
  if(withdrawal&&(withdrawal.envelope.payload.kind!=='withdrawal'||withdrawal.envelope.payload.target_key.toLowerCase()!==review.entity_key.toLowerCase()||withdrawal.creator.toLowerCase()!==review.creator.toLowerCase()||BigInt(withdrawal.created_at_block)<BigInt(review.created_at_block)))throw new Error('Withdrawal must target this session review');
  if(session.status==='accepted'&&(transactions.length!==2||observations.length!==2||session.completed_at!==null))throw new Error('Accepted phase is inconsistent');
  if(session.status==='completed'&&(!withdrawal||observations.length!==4||!session.completed_at))throw new Error('Completed phase is inconsistent');
  const order=[['A',1,'before-withdrawal',true],['B',1,'before-withdrawal',true],['B',2,'after-withdrawal',false],['A',2,'after-withdrawal',false]] as const;
  for(let i=0;i<observations.length;i++){
    const receipt=observations[i]!,[consumer,number,phase,allowed]=order[i]!;
    if(receipt.consumer!==consumer||receipt.request_no!==number||receipt.phase!==phase)throw new Error('Consumer sequence does not match');
    if(session.status==='failed'&&(!receipt.read||!receipt.evidence)){
      if(receipt.admission.allowed||receipt.task_executed||receipt.evidence_admitted||receipt.output!==null||receipt.admission.status!=='unavailable')throw new Error('Unverified observation cannot admit a task');
      continue;
    }
    if(!receipt.read)throw new Error('Consumer read is missing');
    const requiredKeys=[passport.entity_key,review.entity_key,...(!allowed&&withdrawal?[withdrawal.entity_key]:[])];
    if(session.status!=='failed'&&requiredKeys.some(key=>!receipt.read!.records.some(r=>r.key.toLowerCase()===key.toLowerCase())))throw new Error('Receipt is missing this session publication');
    if(Date.parse(receipt.requested_at)>Date.parse(receipt.decision_at)||Date.parse(receipt.read.read_at)>Date.parse(receipt.decision_at)+60000||Date.parse(receipt.read.read_at)<Date.parse(receipt.requested_at)-60000)throw new Error('Receipt timing is inconsistent');
    if(!allowed&&(!withdrawal||BigInt(receipt.read.block)<BigInt(withdrawal.created_at_block)||Date.parse(receipt.requested_at)<Date.parse(withdrawal.confirmed_at)))throw new Error('Post-withdrawal request preceded publication');
    if(allowed&&withdrawal&&Date.parse(receipt.decision_at)>Date.parse(withdrawal.submitted_at))throw new Error('Accepted receipt is not from before withdrawal');
    const evidence=await verifyTwoClientEvidence(session,receipt.read,Date.parse(receipt.decision_at));
    let evaluated=await evaluateAdmission({descriptor,policy,observedDigest:evidence.packet_digest,currentRepositoryDigest:evidence.repository_digest,records:receipt.read.records,now:Date.parse(receipt.decision_at)});
    if(evaluated.allowed)evaluated={...evaluated,valid_until:new Date(Math.min(Date.parse(evaluated.valid_until!),Date.parse(evidence.graph_valid_until))).toISOString()};
    if(canonicalJson(evidence)!==canonicalJson(receipt.evidence)||evaluated.status!==receipt.admission.status||(session.status!=='failed'&&evaluated.allowed!==allowed)||receipt.admission.allowed!==evaluated.allowed||receipt.task_executed!==evaluated.allowed||receipt.evidence_admitted!==evaluated.allowed||receipt.admission.valid_until!==evaluated.valid_until||canonicalJson(receipt.output)!==canonicalJson(evaluated.allowed?testGuard({operation:'all',checks:['sha256-format','review-current']}):null))throw new Error('Reported receipt does not match signed evidence');
    if(session.status!=='failed'&&!allowed&&evaluated.status!=='withdrawn')throw new Error('Post-withdrawal request must refuse for withdrawal');
  }
  return session;
}
