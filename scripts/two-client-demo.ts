import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {parseArgs} from 'node:util';
import {createInterface} from 'node:readline/promises';
import {pathToFileURL} from 'node:url';
import {createPublicClient} from '@arkiv-network/sdk';
import {tiramisu} from '@arkiv-network/sdk/chains';
import {http,type Hex} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import {validateProofContext} from 'qarinah';
import {contextDescriptor,descriptorSchema,digestJson,recordSchema,signRecord,type Envelope,type Policy,type RecordPayload} from '../packages/sdk/src/index';
import {EXPLORER,RPC,publishEnvelope,readRecords} from '../packages/sdk/src/arkiv';
import {createGraphKit,AI_PASSPORT_PROFILE} from '../packages/arkiv-graph/src/index';
import {createTwoClientConsumer,TWO_CLIENT_SOURCE_MAP,twoClientSessionSchema,verifyTwoClientSession,type TwoClientSession,type TwoClientSubject} from '../apps/web/src/two-client-model';

const kit=createGraphKit(AI_PASSPORT_PROFILE);
const publicRoot=path.resolve('apps/web/public');
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
type Signer=ReturnType<typeof privateKeyToAccount>;
export const TWO_CLIENT_PLAN={
  network:'Tiramisu testnet (7738577)',writes:3,
  sequence:['Validate the pinned Qarinah coding packet and reference graph','Publish a fresh session-bound passport','Publish the matching project review','A independently reads graph, sources and review; run six deterministic guard cases','B independently repeats its own read and guard task','Optionally hold after saving accepted-phase public evidence','Reviewer publishes one exact-target withdrawal','A separate bounded observer waits for query visibility','B next task request rereads and refuses; A independently confirms'],
  public_report:'apps/web/public/data/two-client-session.json',
  signing:'Default: existing private-operator helper. Own wallets: TWO_CLIENT_PRODUCER_KEY and TWO_CLIENT_REVIEWER_KEY. Optional TWO_CLIENT_RPC and TWO_CLIENT_API_KEY. Keys stay in the operator process.',
  invocation:'npx tsx scripts/two-client-demo.ts --publish --hold-before-withdrawal',
  scope:'Deterministic project-run clients and project-controlled wallets. No model inference, independent organisation or provider state proof is claimed.',
};

async function localOperators(rpc:string){
  const producerKey=process.env.TWO_CLIENT_PRODUCER_KEY,reviewerKey=process.env.TWO_CLIENT_REVIEWER_KEY;
  if(Boolean(producerKey)!==Boolean(reviewerKey))throw new Error('Both own-wallet keys are required');
  if(producerKey&&reviewerKey){
    if(!/^0x[0-9a-fA-F]{64}$/.test(producerKey)||!/^0x[0-9a-fA-F]{64}$/.test(reviewerKey))throw new Error('Invalid own-wallet key format');
    const producer=privateKeyToAccount(producerKey as Hex),reviewer=privateKeyToAccount(reviewerKey as Hex);
    const policy:Policy={issuers:[producer.address],reviewers:[reviewer.address],scope:'identity-and-protocol'};
    return {producer,reviewer,policy,headers:process.env.TWO_CLIENT_API_KEY?{'X-API-KEY':process.env.TWO_CLIENT_API_KEY}:undefined};
  }
  const {operators}=await import('./private-operator');
  const o=await operators();
  return {...o,headers:process.env.TWO_CLIENT_API_KEY?{'X-API-KEY':process.env.TWO_CLIENT_API_KEY}:o.headers};
}

async function saveJson(file:string,value:unknown){
  await fs.mkdir(path.dirname(file),{recursive:true});
  const temporary=file+'.tmp';
  await fs.writeFile(temporary,JSON.stringify(value,null,2)+'\n');
  await fs.rename(temporary,file);
}

export async function runTwoClientDemo(options:{hold:boolean;out:string}){
  const rpc=process.env.TWO_CLIENT_RPC||RPC,rpcUrl=new URL(rpc);
  if(!['https:','http:'].includes(rpcUrl.protocol))throw new Error('RPC must use HTTP');
  const o=await localOperators(rpc);
  if(o.producer.address.toLowerCase()===o.reviewer.address.toLowerCase())throw new Error('Use two distinct operator wallets');
  const connection={rpc,policy:o.policy,headers:o.headers};
  const reader=createPublicClient({chain:tiramisu,transport:http(rpc,{timeout:20000,retryCount:0,...(o.headers?{fetchOptions:{headers:o.headers}}:{})})});
  if(await reader.getChainId()!==tiramisu.id)throw new Error('Configured RPC is not Tiramisu');
  for(const signer of [o.producer,o.reviewer])if(await reader.getBalance({address:signer.address})===0n)throw new Error('Fund both operator wallets with free Tiramisu testnet GLM');
  const config=JSON.parse(await fs.readFile(path.join(publicRoot,'data/graph-config.json'),'utf8'));
  const graphPolicy=JSON.parse(await fs.readFile(path.join(publicRoot,'data/policy.json'),'utf8')) as Policy;
  const packet=JSON.parse(await fs.readFile(path.join(publicRoot,'data/handoff-packet.json'),'utf8'));
  validateProofContext(packet);
  const sessionId=randomUUID(),startedAt=new Date().toISOString();
  const base=contextDescriptor(packet,'Coding handoff withdrawal session',sessionId);
  const descriptor=descriptorSchema.parse({...base,capabilities:[...base.capabilities,'graph-root:'+config.graph_digest,'deterministic-release-guard']});
  let stage='prepare';
  let pending:{kind:string;submitted_at:string;envelope:Envelope;tx_hash?:string;entity_key?:string}|null=null;
  const journalFile=path.resolve('.local','two-client-'+sessionId+'.json');
  const session:TwoClientSession={
    schema:'app-passport.two-client-session.v1',session_id:sessionId,started_at:startedAt,updated_at:startedAt,completed_at:null,status:'accepted',
    network:{chain_id:7738577,name:'Tiramisu',rpc_origin:rpcUrl.origin},
    roles:{producer:o.producer.address,reviewer:o.reviewer.address,operator:'Project-controlled wallets; not independent people or organizations.'},
    descriptor,policy:o.policy,graph:{graph_digest:config.graph_digest,issuers:graphPolicy.issuers,start:'context:handoff',packet_url:'/data/handoff-packet.json'},
    transactions:[],observations:[],records:[],consistency_reads:[],
    limitations:['The two consumers are separate SDK instances run by this project, not independent people or organisations.','Signed envelopes are verified locally. Chain metadata, transaction links and query completeness rely on the configured RPC provider; no state proof is checked.','Historical receipts are operator observations, not cryptographic attestations of client execution. Every current request rereads graph and review evidence.','The release guard is deterministic and interpreted. No model inference runs. Qarinah evidence remains untrusted data.'],
  };
  const checkpoint=async()=>{session.updated_at=new Date().toISOString();await saveJson(journalFile,{stage,pending,session});};
  const publishPublic=async()=>{await checkpoint();await saveJson(path.resolve(options.out),twoClientSessionSchema.parse(session));};
  const independentRead=async(subject:TwoClientSubject)=>{
    const [records,graph,packetText,sources]=await Promise.all([
      readRecords({...connection},subject.descriptor.artifact_digest),
      kit.readGraph({rpc,headers:o.headers,issuers:[...subject.graph.issuers]},subject.graph.graph_digest),
      fs.readFile(path.join(publicRoot,'data/handoff-packet.json'),'utf8'),
      Promise.all(TWO_CLIENT_SOURCE_MAP.map(async mapping=>({...mapping,body:await fs.readFile(path.join(publicRoot,mapping.path),'utf8')}))),
    ]);
    return {...records,session_id:subject.session_id,graph,packet:JSON.parse(packetText),sources};
  };
  const A=createTwoClientConsumer('A',subject=>independentRead(subject));
  const B=createTwoClientConsumer('B',subject=>independentRead(subject));
  // This observer checks propagation only; it never executes the consumers' task or masks a task request.
  async function visible(keys:string[]){
    for(let attempt=1;attempt<=8;attempt++){
      let visibleRead:Awaited<ReturnType<typeof readRecords>>|null=null;
      try{visibleRead=await readRecords({...connection},descriptor.artifact_digest);}catch{}
      const ready=visibleRead&&keys.every(key=>visibleRead!.records.some(r=>r.key.toLowerCase()===key.toLowerCase()));
      session.consistency_reads.push({stage,attempt,ready:Boolean(ready),available:Boolean(visibleRead),read_at:visibleRead?.read_at??null,block:visibleRead?.block??null});
      await checkpoint();
      console.log(JSON.stringify({event:'chain-visibility',stage,attempt,ready:Boolean(ready),read_at:visibleRead?.read_at??null,block:visibleRead?.block??null}));
      if(ready){session.records=visibleRead!.records;return visibleRead!;}
      if(attempt<8)await sleep(1800);
    }
    throw new Error('Bounded chain visibility check did not complete');
  }
  async function publish(kind:'passport'|'review'|'withdrawal',signer:Signer,payload:RecordPayload){
    const submitted_at=new Date().toISOString(),envelope=await signRecord(payload,signer);
    // One broadcast per step. An unknown result is preserved in the local journal and never retried automatically.
    pending={kind,submitted_at,envelope};await checkpoint();
    const result=await publishEnvelope(connection,signer,envelope);
    pending={...pending,tx_hash:result.txHash,entity_key:result.entityKey};await checkpoint();
    const receipt=await reader.getTransactionReceipt({hash:result.txHash});
    session.transactions.push({kind,entity_key:result.entityKey,tx_hash:result.txHash,creator:signer.address,submitted_at,confirmed_at:new Date().toISOString(),created_at_block:String(receipt.blockNumber),expires_at_block:String(result.expiresAt),envelope});
    pending=null;
    await checkpoint();
    console.log(JSON.stringify({event:'published',kind,entity_key:result.entityKey,tx_url:EXPLORER+'/tx/'+result.txHash,block:String(receipt.blockNumber)}));
    return result;
  }
  function retainPendingTransactionHash(error:unknown){
    const errorTx=(error as {txHash?:unknown})?.txHash;
    if(pending&&typeof errorTx==='string'&&/^0x[0-9a-fA-F]{64}$/.test(errorTx))pending.tx_hash=errorTx;
  }
  try{
    // Verify generic graph/context/source binding before spending testnet gas.
    const preflight=await independentRead(session);
    const {verifyTwoClientEvidence}=await import('../apps/web/src/two-client-model');
    await verifyTwoClientEvidence(session,preflight);
    const issued=Date.now(),until=new Date(issued+14*86400000).toISOString();
    const common={schema:'app-passport.record.v1',namespace:'app-passport-v1',artifact_digest:descriptor.artifact_digest,descriptor_digest:digestJson(descriptor),issued_at:new Date(issued).toISOString(),valid_until:until,disclosure:'synthetic-fixture'};
    stage='passport';
    const passport=await publish('passport',o.producer,recordSchema.parse({...common,issuer:o.producer.address,kind:'passport',descriptor}));
    stage='review';
    const review=await publish('review',o.reviewer,recordSchema.parse({...common,issuer:o.reviewer.address,kind:'review',scope:'identity-and-protocol',conclusion:'requirements-satisfied',evidence_url:'https://arkivgraph.ajnasnb.com/data/two-client-session.json',checks:[{name:'Qarinah packet identity',passed:true,detail:'Original public synthetic coding packet validated; unique session descriptor prevents old reviews from satisfying this session.'},{name:'Arkiv Graph evidence path',passed:true,detail:'Generic SDK assembled the pinned signed graph manifest, traversed context:handoff and checked the exact public release.ts source bytes.'},{name:'Bounded release guard',passed:true,detail:'Deterministic interpreted guard checks SHA-256 shape and current-review boolean. No model inference or generated JavaScript execution.'}]}));
    stage='accepted-readiness';await visible([passport.entityKey,review.entityKey]);
    stage='consumer-A-before';session.observations.push(await A.request(session,'before-withdrawal'));await checkpoint();
    stage='consumer-B-before';session.observations.push(await B.request(session,'before-withdrawal'));await checkpoint();
    if(session.observations.some(r=>!r.admission.allowed||!r.output?.passed))throw new Error('A consumer did not admit the accepted phase');
    // Bind report metadata to actual read-back metadata, not the SDK's estimated storage expiry.
    for(const tx of session.transactions){const record=session.records.find(r=>r.key===tx.entity_key)!;tx.created_at_block=record.created_at_block;tx.expires_at_block=record.expires_at_block;}
    await verifyTwoClientSession(session);await publishPublic();
    console.log(JSON.stringify({event:'accepted-phase-ready',session_id:sessionId,public_report:options.out,hold:options.hold}));
    if(options.hold){
      if(!process.stdin.isTTY)throw new Error('Hold mode needs an interactive terminal; accepted-phase evidence was saved');
      const input=createInterface({input:process.stdin,output:process.stdout});
      try{await input.question('Accepted phase saved. Press Enter to publish this review withdrawal: ');}finally{input.close();}
    }
    stage='withdrawal';
    const withdrawal=await publish('withdrawal',o.reviewer,recordSchema.parse({...common,issuer:o.reviewer.address,kind:'withdrawal',issued_at:new Date().toISOString(),valid_until:until,target_key:review.entityKey,reason:'Live two-client lifecycle demonstration: the project reviewer withdraws this exact session review. B must reread and refuse its next task request.'}));
    stage='withdrawal-readiness';await visible([passport.entityKey,review.entityKey,withdrawal.entityKey]);
    for(const tx of session.transactions){const record=session.records.find(r=>r.key===tx.entity_key)!;tx.created_at_block=record.created_at_block;tx.expires_at_block=record.expires_at_block;}
    stage='consumer-B-next';session.observations.push(await B.request(session,'after-withdrawal'));await checkpoint();
    stage='consumer-A-next';session.observations.push(await A.request(session,'after-withdrawal'));await checkpoint();
    if(session.observations.slice(2).some(r=>r.admission.status!=='withdrawn'||r.task_executed||r.output))throw new Error('Post-withdrawal request did not refuse');
    session.status='completed';session.completed_at=new Date().toISOString();session.updated_at=session.completed_at;
    await verifyTwoClientSession(session);await publishPublic();
    console.log(JSON.stringify({event:'completed',session_id:sessionId,transactions:session.transactions.length,consumer_observations:session.observations.length,B_next_status:session.observations[2]!.admission.status,public_report:options.out}));
    return session;
  }catch(error){
    retainPendingTransactionHash(error);
    session.status='failed';session.failure_stage=stage;await checkpoint();
    if(session.transactions.length>=2&&session.observations.length>=2)await publishPublic();
    console.error(JSON.stringify({status:'failed',stage,session_id:sessionId,journal:journalFile,message:'The demonstration did not complete. Provider and credential details are redacted. Existing receipts were retained; no transaction was automatically retried.'}));
    process.exitCode=1;return session;
  }
}

async function main(){
  const {values}=parseArgs({options:{publish:{type:'boolean',default:false},plan:{type:'boolean',default:false},'hold-before-withdrawal':{type:'boolean',default:false},out:{type:'string',default:'apps/web/public/data/two-client-session.json'},help:{type:'boolean',default:false}}});
  if(values.publish&&values.plan)throw new Error('Choose --plan or --publish');
  if(!values.publish||values.help){console.log(JSON.stringify(TWO_CLIENT_PLAN,null,2));return;}
  await runTwoClientDemo({hold:values['hold-before-withdrawal'],out:values.out});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(()=>{console.error(JSON.stringify({status:'failed',message:'Operator setup failed before publication. Check the documented environment and funded Tiramisu wallets. Details are redacted.'}));process.exitCode=1;});
