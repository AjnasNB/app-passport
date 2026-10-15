import {afterEach,beforeAll,beforeEach,describe,it,expect,vi} from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {privateKeyToAccount} from 'viem/accounts';
import {aiRun,MODEL,runInputSchema} from '../worker/ai';
import {assertRuntimeBinding,MODEL_DECLARATION,modelDeclarationIdentity} from '../worker/runtime-binding';
import {assembleGraph,graphPayloads,readGraph,signGraph,type EvidenceGraph} from '../packages/sdk/src/graph';
import {readRecords} from '../packages/sdk/src/arkiv';
import {evaluateAdmission,digestBytes,digestJson,signRecord,type Descriptor,type RecordPayload,type VerifiedRecord} from '../packages/sdk/src/index';
import runtimeDescriptor from '../apps/web/public/data/runtime-descriptor.json';
import contexts from '../apps/web/public/data/ai-contexts.json';
// Public, unfunded deterministic test identities; no project signing keys or network calls.
vi.mock('../apps/web/public/data/policy.json',()=>({default:{issuers:['0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf'],reviewers:['0x2B5AD5c4795c026514f8317c7a215E218DcCD6cF'],scope:'identity-and-protocol'}}));
vi.mock('../packages/sdk/src/graph',async()=>({...await vi.importActual('../packages/sdk/src/graph'),readGraph:vi.fn()}));
vi.mock('../packages/sdk/src/arkiv',()=>({readRecords:vi.fn()}));
vi.mock('../packages/sdk/src/index',async()=>({...await vi.importActual('../packages/sdk/src/index'),evaluateAdmission:vi.fn()}));
const graph:EvidenceGraph=JSON.parse(await fs.readFile('apps/web/public/data/evidence-graph.json','utf8'));
const NOW=Date.parse('2026-10-15T12:00:00.000Z'),iso=(time:number)=>new Date(time).toISOString();
const issuer=privateKeyToAccount('0x'+'1'.padStart(64,'0') as `0x${string}`),reviewer=privateKeyToAccount('0x'+'2'.padStart(64,'0') as `0x${string}`);
const actualSdk=await vi.importActual<typeof import('../packages/sdk/src/index')>('../packages/sdk/src/index');
async function authenticatedGraph(input=graph,deadline=NOW+86400000){
 const root=digestJson(input),records=await Promise.all(graphPayloads(input,issuer.address,iso(NOW-60000),iso(deadline)).map(async(payload,index)=>({key:'0x'+String(index+1).padStart(64,'0'),creator:issuer.address,envelope:await signGraph(payload,issuer)})));
 return {graph:await assembleGraph(records,root,[issuer.address],NOW),records,block:'123',query:'mocked RPC with locally authenticated payloads',read_at:iso(NOW)};
}
let verifiedGraph:Awaited<ReturnType<typeof authenticatedGraph>>;
beforeAll(async()=>{verifiedGraph=await authenticatedGraph();});
const loadAsset=async(r:RequestInfo|URL)=>new Response(await fs.readFile('apps/web/public'+new URL(r instanceof Request?r.url:String(r)).pathname));
const env={ARKIV_API_KEY:'private-test-key',ASSETS:{fetch:vi.fn(loadAsset)},AI:{run:vi.fn(async(_model:string,_input:{messages:{role:'system'|'user';content:string}[];max_tokens:number;temperature:number})=>({response:'{"operation":"all","checks":["sha256-format","review-current"]}'}))},AI_BUDGET:{getByName:vi.fn(()=>({fetch:vi.fn(async()=>new Response('reserved'))}))}};
beforeEach(()=>{
 vi.clearAllMocks();vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(NOW);
 vi.mocked(readGraph).mockResolvedValue(structuredClone(verifiedGraph));vi.mocked(readRecords).mockResolvedValue({records:[],block:'124',query:'mocked RPC',read_at:iso(NOW),ignored:0});
 vi.mocked(evaluateAdmission).mockResolvedValue({allowed:true,status:'requirements-satisfied',reason:'mock admission',records:[],valid_until:iso(NOW+3600000)});
 env.ASSETS.fetch.mockImplementation(loadAsset);env.AI_BUDGET.getByName.mockReturnValue({fetch:vi.fn(async()=>new Response('reserved'))});
 env.AI.run.mockResolvedValue({response:'{"operation":"all","checks":["sha256-format","review-current"]}'});
});
afterEach(()=>{vi.useRealTimers();});
describe('AI orchestration (mock provider, mocked admission unless explicitly stated)',()=>{
 it('exports the exact bounded evidence message actually passed to the model',async()=>{
  const r=await aiRun({task:'coding'},env,'https://example.com');const body=r.body as any;
  const call=env.AI.run.mock.calls[0] as unknown as [string,{messages:{role:string;content:string}[]}];
  const message=call[1].messages.find(m=>m.role==='user')!.content;
  expect(JSON.stringify(body.model_evidence)).toBe(message);expect(body.evidence_message_sha256).toBe(digestBytes(new TextEncoder().encode(message)));expect(body.memory_chars).toBe(message.length);expect(body.model_evidence.contentRole).toBe('untrusted-data');expect(body.admission_checks).toEqual({context:'requirements-satisfied',runtime:'requirements-satisfied'});expect(body.graph_selection.nodes).toBeGreaterThan(0);expect(body.model_evidence.sources.every((s:any)=>body.source_refs.some((ref:any)=>ref.path===s.path&&ref.digest===s.digest))).toBe(true);
  expect(body.model).toBe(call[0]);expect(body.model_binding).toMatchObject({...MODEL_DECLARATION,digest:graph.nodes.find(node=>node.id==='model:llama')!.digest});expect(body.hosted_weights_attested).toBe(false);
  expect(body.admission_at).toBe(iso(NOW));expect(body.admission_valid_until).toBe(iso(NOW+3600000));expect(body.admission_evidence_read_at).toBe(iso(NOW));expect(body.admission_freshness).toContain('withdrawals after the completed read');
  expect(call[1]).toMatchObject({max_tokens:420,temperature:0.1});expect(call[1].messages).toHaveLength(2);expect(call[1]).not.toHaveProperty('response_format');expect(body.memory_chars).toBeLessThanOrEqual(10000);
 });
 it('does not export or send a model evidence message when review admission fails',async()=>{
  vi.mocked(evaluateAdmission).mockResolvedValue({allowed:false,status:'withdrawn',reason:'withdrawn',records:[]});const r=await aiRun({task:'coding'},env,'https://example.com');expect(r.status).toBe(409);expect(r.body).not.toHaveProperty('model_evidence');expect(env.AI.run).not.toHaveBeenCalled();
 });
 it('runs a validated coding guard after graph, sources and admission',async()=>{const r=await aiRun({task:'coding'},env,'https://example.com');expect(r.status).toBe(200);expect((r.body as any).coding.passed).toBe(true);expect(env.AI.run).toHaveBeenCalledWith(MODEL,expect.objectContaining({max_tokens:420}));expect((r.body as any).source_refs.length).toBeGreaterThan(0);});
 it('prevents inference if a context or tool review is rejected',async()=>{vi.mocked(evaluateAdmission).mockResolvedValue({allowed:false,status:'withdrawn',reason:'withdrawn',records:[]});const r=await aiRun({task:'coding'},env,'https://example.com');expect(r.status).toBe(409);expect(env.AI.run).not.toHaveBeenCalled();expect(env.AI_BUDGET.getByName).not.toHaveBeenCalled();});
 it('prevents inference when the signed graph cannot be read',async()=>{vi.mocked(readGraph).mockRejectedValue(new Error('unavailable'));await expect(aiRun({task:'coding'},env,'https://example.com')).rejects.toThrow();expect(env.AI.run).not.toHaveBeenCalled();});
 it('prevents inference when original source bytes change',async()=>{env.ASSETS.fetch.mockImplementationOnce(async()=>new Response('changed source'));const r=await aiRun({task:'coding'},env,'https://example.com');expect(r.status).toBe(409);expect(env.AI.run).not.toHaveBeenCalled();});
 it('returns no passing result for invalid generated guards',async()=>{env.AI.run.mockResolvedValue({response:'{"operation":"eval","code":"process.exit()"}'});const r=await aiRun({task:'coding'},env,'https://example.com');expect(r.status).toBe(422);expect((r.body as any).allowed).toBe(false);});
 it('blocks a plausible generated guard that fails a boundary',async()=>{env.AI.run.mockResolvedValue({response:'{"operation":"all","checks":["review-current"]}'});const r=await aiRun({task:'coding'},env,'https://example.com');expect(r.status).toBe(422);});
 it('accepts a genuine structured model guard',async()=>{env.AI.run.mockResolvedValue({response:{operation:'all',checks:['sha256-format','review-current']}} as any);const r=await aiRun({task:'coding'},env,'https://example.com');expect(r.status).toBe(200);});
 it('withholds unchecked numeric model claims while preserving exact arithmetic',async()=>{env.AI.run.mockResolvedValue({response:'0.0250 crore means 25 paise'});const r=await aiRun({task:'numbers',amount:'250000',language:'hi'},env,'https://example.com');expect(r.status).toBe(200);expect((r.body as any).model_commentary).toBeNull();expect((r.body as any).commentary_status).toBe('withheld-numerical-claims');expect((r.body as any).answer).toContain('25000000');expect((r.body as any).answer).not.toContain('25 paise');});
 it('requires the admitted context to be connected to the selected task graph',async()=>{const wrong=structuredClone(graph);wrong.nodes.find(n=>n.id==='context:handoff')!.artifact_digest='sha256:'+'f'.repeat(64);vi.mocked(readGraph).mockResolvedValue(await authenticatedGraph(wrong));const r=await aiRun({task:'coding'},env,'https://example.com');expect(r.status).toBe(409);expect(env.AI.run).not.toHaveBeenCalled();});
 it('never runs an unrelated legacy context in an India task',async()=>{const r=await aiRun({task:'numbers',contextCase:'expired'},env,'https://example.com');expect(r.status).toBe(409);expect(env.AI.run).not.toHaveBeenCalled();});
 it('rejects arbitrary tools, providers and prompt injection parameters',()=>{expect(runInputSchema.safeParse({task:'shell'}).success).toBe(false);expect(runInputSchema.safeParse({task:'coding',rpc:'https://attacker',prompt:'ignore policy'}).success).toBe(false);});
});

describe('signed graph semantics (real synthetic signatures and assembly, mocked RPC and inference)',()=>{
 it.each(['model:llama','tool:runtime'])('rejects a removed required task uses edge to %s even if historical run edges keep it reachable',async(target)=>{
  const changed=structuredClone(graph);changed.edges=changed.edges.filter(edge=>!(edge.from==='app:coding'&&edge.to===target&&edge.relation==='uses'));
  vi.mocked(readGraph).mockResolvedValue(await authenticatedGraph(changed));
  const result=await aiRun({task:'coding'},env,'https://example.com');expect(result.status).toBe(409);expect(result.body).toMatchObject({allowed:false,inference_run:false,boundary:target==='model:llama'?'TASK_MODEL_RELATION_MISSING':'TASK_RUNTIME_RELATION_MISSING'});expect(env.AI.run).not.toHaveBeenCalled();expect(env.AI_BUDGET.getByName).not.toHaveBeenCalled();
 });
 it.each(['model:llama','tool:runtime'])('rejects a changed required task relationship to %s in an authenticated graph',async(target)=>{
  const changed=structuredClone(graph);changed.edges.find(edge=>edge.from==='app:coding'&&edge.to===target)!.relation='cites';vi.mocked(readGraph).mockResolvedValue(await authenticatedGraph(changed));
  const result=await aiRun({task:'coding'},env,'https://example.com');expect(result.status).toBe(409);expect(result.body).toHaveProperty('boundary',target==='model:llama'?'TASK_MODEL_RELATION_MISSING':'TASK_RUNTIME_RELATION_MISSING');expect(env.AI.run).not.toHaveBeenCalled();
 });
 it('rejects an authenticated change of the model alias declaration and its corresponding digest',async()=>{
  const changed=structuredClone(graph),model=changed.nodes.find(node=>node.id==='model:llama')!;model.detail=model.detail.replace(MODEL,'@cf/another/model');model.digest=digestJson({id:model.id,label:model.label,detail:model.detail});vi.mocked(readGraph).mockResolvedValue(await authenticatedGraph(changed));
  const result=await aiRun({task:'coding'},env,'https://example.com');expect(result.body).toMatchObject({allowed:false,inference_run:false,boundary:'SIGNED_MODEL_DECLARATION_MISMATCH'});expect(env.AI.run).not.toHaveBeenCalled();
 });
 it('rejects an authenticated runtime digest substitution before loading it',async()=>{
  const changed=structuredClone(graph);changed.nodes.find(node=>node.id==='tool:runtime')!.digest='sha256:'+'a'.repeat(64);vi.mocked(readGraph).mockResolvedValue(await authenticatedGraph(changed));
  const result=await aiRun({task:'coding'},env,'https://example.com');expect(result.body).toHaveProperty('boundary','SIGNED_RUNTIME_DECLARATION_MISMATCH');expect(env.ASSETS.fetch).not.toHaveBeenCalled();expect(env.AI.run).not.toHaveBeenCalled();
 });
 it('binds a typed provider declaration and configured request alias to the unchanged historical model digest',()=>{
  expect(digestJson(modelDeclarationIdentity(MODEL_DECLARATION))).toBe(graph.nodes.find(node=>node.id==='model:llama')!.digest);
  expect(()=>modelDeclarationIdentity({...MODEL_DECLARATION,provider:'other-provider'})).toThrow();
  expect(()=>assertRuntimeBinding(graph,'coding','@cf/another/model',runtimeDescriptor.artifact_digest)).toThrow('MODEL_CONFIGURATION_MISMATCH');
 });
});

async function signedAdmissionRecords(deadline:number){
 const descriptors=[contexts.find(row=>row.id==='handoff')!.descriptor as Descriptor,runtimeDescriptor as Descriptor],records:VerifiedRecord[]=[];
 for(const descriptor of descriptors){
  const common={schema:'app-passport.record.v1' as const,namespace:'app-passport-v1' as const,artifact_digest:descriptor.artifact_digest,descriptor_digest:digestJson(descriptor),issued_at:iso(NOW-60000),valid_until:iso(deadline),disclosure:'synthetic-fixture' as const};
  const payloads:RecordPayload[]=[{...common,issuer:issuer.address,kind:'passport',descriptor},{...common,issuer:reviewer.address,kind:'review',scope:'identity-and-protocol',conclusion:'requirements-satisfied',evidence_url:'https://example.invalid/test',checks:[{name:'synthetic-test',passed:true,detail:'Temporal orchestration test only'}]}];
  for(const payload of payloads){const account=payload.kind==='passport'?issuer:reviewer;records.push({key:'0x'+String(records.length+1).padStart(64,'0'),creator:account.address,owner:account.address,created_at_block:'1',expires_at_block:'100000',envelope:await signRecord(payload,account)});}
 }
 return records;
}
describe('admission freshness (real signed temporal evaluation, mocked RPC/budget/model)',()=>{
 it('re-evaluates the identical evidence after budget reservation, then records the signed deadline',async()=>{
  const records=await signedAdmissionRecords(NOW+10000);vi.mocked(readRecords).mockResolvedValue({records,block:'124',query:'mocked RPC',read_at:iso(NOW),ignored:0});vi.mocked(evaluateAdmission).mockImplementation(actualSdk.evaluateAdmission);
  env.AI_BUDGET.getByName.mockReturnValue({fetch:vi.fn(async()=>{vi.setSystemTime(NOW+1000);return new Response('reserved');})});
  const result=await aiRun({task:'coding'},env,'https://example.com');expect(result.status).toBe(200);expect(result.body).toMatchObject({admission_at:iso(NOW+1000),admission_valid_until:iso(NOW+10000),admission_evidence_read_at:iso(NOW)});expect(readRecords).toHaveBeenCalledOnce();expect(evaluateAdmission).toHaveBeenCalledTimes(4);
  const evaluations=vi.mocked(evaluateAdmission).mock.calls.map(([input])=>input);expect(evaluations.every(input=>input.records===records)).toBe(true);expect(evaluations.slice(2).every(input=>input.now===NOW+1000)).toBe(true);
 });
 it('blocks a budget reservation that crosses the exact signed expiry boundary',async()=>{
  const records=await signedAdmissionRecords(NOW+1000);vi.mocked(readRecords).mockResolvedValue({records,block:'124',query:'mocked RPC',read_at:iso(NOW),ignored:0});vi.mocked(evaluateAdmission).mockImplementation(actualSdk.evaluateAdmission);
  env.AI_BUDGET.getByName.mockReturnValue({fetch:vi.fn(async()=>{vi.setSystemTime(NOW+1000);return new Response('reserved');})});
  const result=await aiRun({task:'coding'},env,'https://example.com');expect(result.status).toBe(409);expect(result.body).toMatchObject({allowed:false,status:'expired',inference_run:false});expect(env.AI.run).not.toHaveBeenCalled();
 });
 it('blocks evidence that expires while the fresh provider read is delayed',async()=>{
  const records=await signedAdmissionRecords(NOW+1000);vi.mocked(evaluateAdmission).mockImplementation(actualSdk.evaluateAdmission);vi.mocked(readRecords).mockImplementation(async()=>{vi.setSystemTime(NOW+1000);return {records,block:'124',query:'delayed mocked RPC',read_at:iso(NOW+1000),ignored:0};});
  const result=await aiRun({task:'coding'},env,'https://example.com');expect(result.body).toMatchObject({allowed:false,status:'expired',inference_run:false});expect(env.AI_BUDGET.getByName).not.toHaveBeenCalled();expect(env.AI.run).not.toHaveBeenCalled();
 });
 it('checks the clock once more after async signature evaluation so evaluation itself cannot cross expiry',async()=>{
  let calls=0;vi.mocked(evaluateAdmission).mockImplementation(async()=>{if(++calls===4)vi.setSystemTime(NOW+1000);return {allowed:true,status:'requirements-satisfied',reason:'mock slow signature verification',records:[],valid_until:iso(NOW+1000)};});
  const result=await aiRun({task:'coding'},env,'https://example.com');expect(result.body).toMatchObject({allowed:false,inference_run:false,boundary:'ADMISSION_DEADLINE_PASSED'});expect(env.AI.run).not.toHaveBeenCalled();
 });
 it('also bounds inference by the signed graph member deadline',async()=>{
  vi.mocked(readGraph).mockResolvedValue(await authenticatedGraph(graph,NOW+1000));env.AI_BUDGET.getByName.mockReturnValue({fetch:vi.fn(async()=>{vi.setSystemTime(NOW+1000);return new Response('reserved');})});
  const result=await aiRun({task:'coding'},env,'https://example.com');expect(result.body).toMatchObject({allowed:false,inference_run:false,boundary:'ADMISSION_DEADLINE_PASSED'});expect(env.AI.run).not.toHaveBeenCalled();
 });
 it('does not invent a deadline when an otherwise positive evaluator omits it',async()=>{
  vi.mocked(evaluateAdmission).mockResolvedValue({allowed:true,status:'requirements-satisfied',reason:'incomplete mock',records:[]});const result=await aiRun({task:'coding'},env,'https://example.com');expect(result.status).toBe(409);expect(env.AI.run).not.toHaveBeenCalled();
 });
});

describe('runtime build guard (isolated local fixture, no published or signed-source mutation)',()=>{
 it('accepts identical bundled/published bytes and rejects byte or import drift',async()=>{
  const fixture=await fs.mkdtemp(path.join(os.tmpdir(),'passport-runtime-binding-')),script=path.resolve('scripts/check-runtime-binding.mjs');
  try{
   for(const file of ['packages/sdk/src/tools.ts','apps/web/public/sources/tools.ts','worker/ai.ts','apps/web/public/data/runtime-descriptor.json','apps/web/public/data/evidence-graph.json']){await fs.mkdir(path.dirname(path.join(fixture,file)),{recursive:true});await fs.copyFile(file,path.join(fixture,file));}
   expect(execFileSync(process.execPath,[script,'--root',fixture],{encoding:'utf8'})).toMatch(/Runtime binding checked: \d+ exact bytes/);
   await fs.appendFile(path.join(fixture,'apps/web/public/sources/tools.ts'),'\n// drift\n');
   expect(()=>execFileSync(process.execPath,[script,'--root',fixture],{stdio:'pipe'})).toThrow();
   await fs.copyFile('packages/sdk/src/tools.ts',path.join(fixture,'apps/web/public/sources/tools.ts'));
   const source=await fs.readFile(path.join(fixture,'worker/ai.ts'),'utf8');await fs.writeFile(path.join(fixture,'worker/ai.ts'),source.replace("from '../packages/sdk/src/tools'","from '../packages/sdk/src/index'"));
   expect(()=>execFileSync(process.execPath,[script,'--root',fixture],{stdio:'pipe'})).toThrow();
  }finally{
   // Only remove the freshly created fixture directly under the system temp directory.
   if(path.dirname(path.resolve(fixture))!==path.resolve(os.tmpdir())||!path.basename(fixture).startsWith('passport-runtime-binding-'))throw new Error('Unexpected fixture cleanup path');
   await fs.rm(fixture,{recursive:true,force:true});
  }
 });
});
