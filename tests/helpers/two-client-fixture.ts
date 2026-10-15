import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts';
import {AI_PASSPORT_PROFILE,createGraphKit} from '../../packages/arkiv-graph/src/index';
import {contextDescriptor,descriptorSchema,digestBytes,digestJson,recordSchema,signRecord,type VerifiedRecord} from '../../packages/sdk/src/index';
import {createTwoClientConsumer,type TwoClientRead,type TwoClientSession,type TwoClientSubject} from '../../apps/web/src/two-client-model';

/** Unfunded generated keys and synthetic metadata. Browser regression fixture, never live chain evidence. */
export async function twoClientBrowserFixture(){
  const producer=privateKeyToAccount(generatePrivateKey()),reviewer=privateKeyToAccount(generatePrivateKey()),kit=createGraphKit(AI_PASSPORT_PROFILE);
  const packet=JSON.parse(await fs.readFile('apps/web/public/data/handoff-packet.json','utf8')),source=await fs.readFile('apps/web/public/sources/release.ts','utf8');
  const session_id=randomUUID(),issued=new Date(Date.now()-1000).toISOString(),until=new Date(Date.now()+86400000).toISOString();
  const g=kit.graphSchema.parse({schema:AI_PASSPORT_PROFILE.graphSchema,label:'Synthetic browser fixture, not published',nodes:[{id:'context:handoff',type:'context',label:'Coding Qarinah packet',digest:digestJson(packet),artifact_digest:digestJson(packet),detail:'Synthetic browser fixture.'},{id:'source:release',type:'source',label:'release.ts',digest:digestBytes(new TextEncoder().encode(source)),source_path:'/sources/release.ts',detail:'Public synthetic source.'}],edges:[{id:'edge:source',from:'context:handoff',to:'source:release',relation:'compiled-from'}]});
  const root=digestJson(g),descriptor=descriptorSchema.parse({...contextDescriptor(packet,'Browser regression fixture',session_id),capabilities:['cited-context','graph-root:'+root,'deterministic-release-guard']});
  const subject:TwoClientSubject={session_id,descriptor,policy:{issuers:[producer.address],reviewers:[reviewer.address],scope:'identity-and-protocol'},graph:{graph_digest:root,issuers:[producer.address],start:'context:handoff',packet_url:'/data/handoff-packet.json'}};
  const graphRecords:TwoClientRead['graph']['records']=[];let index=4;
  for(const payload of kit.graphPayloads(g,producer.address,issued,until))graphRecords.push({key:'0x'+String(index++).repeat(64),creator:producer.address,envelope:await kit.signGraph(payload,producer)});
  async function signed(kind:'passport'|'review'|'withdrawal'):Promise<VerifiedRecord>{
    const signer=kind==='passport'?producer:reviewer;
    const payload=recordSchema.parse({schema:'app-passport.record.v1',namespace:'app-passport-v1',issuer:signer.address,artifact_digest:descriptor.artifact_digest,descriptor_digest:digestJson(descriptor),issued_at:issued,valid_until:until,disclosure:'synthetic-fixture',kind,...(kind==='passport'?{descriptor}:kind==='review'?{scope:'identity-and-protocol',conclusion:'requirements-satisfied',evidence_url:'https://example.com/synthetic-browser-test',checks:[{name:'Fixture only',passed:true,detail:'Generated and signed locally for UI regression testing, no transaction was sent.'}]}:{target_key:'0x'+'2'.repeat(64),reason:'Synthetic browser regression withdrawal'})});
    return {key:'0x'+(kind==='passport'?'1':kind==='review'?'2':'3').repeat(64),creator:signer.address,owner:signer.address,created_at_block:kind==='withdrawal'?'111':'100',expires_at_block:'100000000',envelope:await signRecord(payload,signer)};
  }
  const passport=await signed('passport'),review=await signed('review'),withdrawal=await signed('withdrawal');
  function read(withdrawn=false):TwoClientRead{
    const at=new Date().toISOString();
    return {session_id,records:structuredClone(withdrawn?[passport,review,withdrawal]:[passport,review]),ignored:0,block:withdrawn?'120':'110',query:'Synthetic browser regression read',read_at:at,graph:{records:structuredClone(graphRecords),block:withdrawn?'119':'109',query:'Synthetic browser graph read',read_at:at},packet:structuredClone(packet),sources:[{repository_path:'src/release.ts',path:'/sources/release.ts',body:source}]};
  }
  let withdrawn=false;
  const A=createTwoClientConsumer('A',async()=>read(withdrawn)),B=createTwoClientConsumer('B',async()=>read(withdrawn));
  const observations=[await A.request(subject,'before-withdrawal'),await B.request(subject,'before-withdrawal')];
  const withdrawalAt=new Date().toISOString();withdrawn=true;
  observations.push(await B.request(subject,'after-withdrawal'),await A.request(subject,'after-withdrawal'));
  const transactions=[passport,review,withdrawal].map((record,i)=>({kind:record.envelope.payload.kind,entity_key:record.key,tx_hash:'0x'+String(i+7).repeat(64),creator:record.creator,submitted_at:i===2?withdrawalAt:issued,confirmed_at:i===2?withdrawalAt:issued,created_at_block:record.created_at_block,expires_at_block:record.expires_at_block,envelope:record.envelope}));
  const session:TwoClientSession={...subject,schema:'app-passport.two-client-session.v1',started_at:issued,updated_at:new Date().toISOString(),completed_at:new Date().toISOString(),status:'completed',network:{chain_id:7738577,name:'Tiramisu',rpc_origin:'https://synthetic.invalid'},roles:{producer:producer.address,reviewer:reviewer.address,operator:'Project-controlled wallets; not independent people or organizations.'},transactions,observations,records:[passport,review,withdrawal],consistency_reads:[],limitations:['Synthetic browser regression test. No transactions were broadcast.']};
  return {session,read};
}
