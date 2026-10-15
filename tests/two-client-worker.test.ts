import {beforeAll,beforeEach,describe,expect,it,vi} from 'vitest';
import {twoClientBrowserFixture} from './helpers/two-client-fixture';
import {createTwoClientConsumer,twoClientReadSchema,type TwoClientSession} from '../apps/web/src/two-client-model';

const relay=vi.hoisted(()=>({
 graphRead:vi.fn(),
 config:{graph_digest:'',model:'@cf/meta/llama-3.2-3b-instruct',namespace:'ai-passport-graph-v1'},
}));
vi.mock('cloudflare:workers',()=>({DurableObject:class {}}));
vi.mock('../apps/web/public/data/graph-config.json',()=>({default:relay.config}));
vi.mock('../packages/sdk/src/arkiv',()=>({readRecords:vi.fn()}));
vi.mock('../packages/arkiv-graph/src/index',async()=>{
 const actual=await vi.importActual<typeof import('../packages/arkiv-graph/src/index')>('../packages/arkiv-graph/src/index');
 return {...actual,createGraphKit:(...args:Parameters<typeof actual.createGraphKit>)=>({...actual.createGraphKit(...args),readGraph:relay.graphRead})};
});
import {readRecords} from '../packages/sdk/src/arkiv';
import worker from '../worker/index';

const origin='https://passport.example',secret='private-relay-test-key',limitBytes=2*1024*1024;
let fixture:Awaited<ReturnType<typeof twoClientBrowserFixture>>,session:TwoClientSession,withdrawn=false;
const env={
 ARKIV_API_KEY:secret,
 READ_LIMITER:{limit:vi.fn(async()=>({success:true}))},
 ASSETS:{fetch:vi.fn(async(_request:RequestInfo|URL)=>new Response()),connect(){throw new Error('The read relay must not open sockets');}},
 get AI_LIMITER():Env['AI_LIMITER']{throw new Error('The read relay must not use the inference rate limiter');},
 get AI():Env['AI']{throw new Error('The read relay must not invoke a model');},
 get AI_BUDGET():Env['AI_BUDGET']{throw new Error('The read relay must not reserve an inference budget');},
};
const request=(query='consumer=A',method='GET',headers:Record<string,string>={})=>worker.fetch(new Request(origin+'/api/two-client/records'+(query?'?'+query:''),{method,headers}),env);
function pathname(value:RequestInfo|URL){return new URL(value instanceof Request?value.url:String(value)).pathname;}
async function assets(value:RequestInfo|URL){
 const current=fixture.read(withdrawn),path=pathname(value);
 if(path==='/data/two-client-session.json')return new Response(JSON.stringify(session));
 if(path==='/data/handoff-packet.json')return new Response(JSON.stringify(current.packet));
 if(path==='/sources/release.ts')return new Response(current.sources[0]!.body);
 throw new Error('Unexpected asset path '+path);
}
beforeAll(async()=>{fixture=await twoClientBrowserFixture();});
beforeEach(()=>{
 vi.clearAllMocks();session=structuredClone(fixture.session);relay.config.graph_digest=session.graph.graph_digest;withdrawn=false;
 env.READ_LIMITER.limit.mockResolvedValue({success:true});env.ASSETS.fetch.mockImplementation(assets);
 vi.mocked(readRecords).mockImplementation(async()=>{const {records,ignored,block,query,read_at}=fixture.read(withdrawn);return {records,ignored,block,query,read_at};});
 relay.graphRead.mockImplementation(async()=>fixture.read(withdrawn).graph);
});

describe('two-client read endpoint (signed synthetic fixture; mocked RPC, assets and rate limiter)',()=>{
 it.each(['POST','PUT','PATCH','DELETE','HEAD','OPTIONS'])('rejects %s before any evidence lookup',async method=>{
  const response=await request('consumer=A',method);expect(response.status).toBe(405);expect(readRecords).not.toHaveBeenCalled();expect(relay.graphRead).not.toHaveBeenCalled();expect(env.ASSETS.fetch).not.toHaveBeenCalled();expect(env.READ_LIMITER.limit).not.toHaveBeenCalled();
 });
 it.each(['','consumer=','consumer=C','consumer=a','consumer=A&consumer=A','consumer=A&consumer=B','consumer=A&rpc=https://attacker.invalid','consumer=A&artifact=sha256:bad','consumer=B&packet_url=/private','consumer=A&source=https://attacker.invalid'])('rejects unsupported parameters: %s',async query=>{
  const response=await request(query);expect(response.status).toBe(400);expect(readRecords).not.toHaveBeenCalled();expect(relay.graphRead).not.toHaveBeenCalled();expect(env.ASSETS.fetch).not.toHaveBeenCalled();expect(env.READ_LIMITER.limit).not.toHaveBeenCalled();
 });
 it('rate limits valid reads before assets or providers and sets a retry bound',async()=>{
  env.READ_LIMITER.limit.mockResolvedValue({success:false});const response=await request('consumer=B','GET',{'CF-Connecting-IP':'192.0.2.10'});
  expect(response.status).toBe(429);expect(response.headers.get('retry-after')).toBe('60');expect(response.headers.get('cache-control')).toBe('no-store');expect(env.READ_LIMITER.limit).toHaveBeenCalledWith({key:'192.0.2.10'});expect(readRecords).not.toHaveBeenCalled();expect(relay.graphRead).not.toHaveBeenCalled();expect(env.ASSETS.fetch).not.toHaveBeenCalled();
 });
 it('returns schema-valid current review and graph metadata, with no cached admission',async()=>{
  const observedAt=new Date().toISOString(),reviewRead={...fixture.read(),block:'98765432101234567890',read_at:observedAt};
  vi.mocked(readRecords).mockResolvedValue({records:reviewRead.records,ignored:2,block:reviewRead.block,query:'fresh review query',read_at:observedAt});
  relay.graphRead.mockResolvedValue({...reviewRead.graph,block:'98765432101234567889',query:'fresh graph query',read_at:observedAt});
  const response=await request(),body=twoClientReadSchema.parse(await response.json());
  expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');expect(response.headers.get('content-type')).toBe('application/json');expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  expect(body).toMatchObject({session_id:session.session_id,ignored:2,block:reviewRead.block,read_at:observedAt,query:'fresh review query',graph:{block:'98765432101234567889',query:'fresh graph query',read_at:observedAt}});
  expect(body).not.toHaveProperty('admission');expect(body).not.toHaveProperty('allowed');expect(body).not.toHaveProperty('task_executed');expect(body).not.toHaveProperty('observations');
  expect(Date.parse(body.read_at)).toBe(Date.parse(observedAt));expect(body.sources[0]).toMatchObject({repository_path:'src/release.ts',path:'/sources/release.ts',body:fixture.read().sources[0]!.body});
 });
 it('each A/B call rereads session, graph and reviews using the selected policy and fixed assets',async()=>{
  // A public display-only provider URL in the session cannot override SDK transport.
  session.network.rpc_origin='https://attacker.invalid';
  for(const consumer of ['A','B','A'])expect((await request('consumer='+consumer)).status).toBe(200);
  expect(readRecords).toHaveBeenCalledTimes(3);expect(relay.graphRead).toHaveBeenCalledTimes(3);expect(env.ASSETS.fetch).toHaveBeenCalledTimes(9);
  for(const [connection,artifact] of vi.mocked(readRecords).mock.calls){expect(connection).toEqual({headers:{'X-API-KEY':secret},policy:session.policy});expect(artifact).toBe(session.descriptor.artifact_digest);}
  for(const [connection,root] of relay.graphRead.mock.calls){expect(connection).toEqual({headers:{'X-API-KEY':secret},issuers:session.graph.issuers});expect(root).toBe(relay.config.graph_digest);}
  const urls=env.ASSETS.fetch.mock.calls.map(([value])=>new URL(value instanceof Request?value.url:String(value)));
  expect(new Set(urls.map(url=>url.origin))).toEqual(new Set([origin]));expect(new Set(urls.map(url=>url.pathname))).toEqual(new Set(['/data/two-client-session.json','/data/handoff-packet.json','/sources/release.ts']));
 });
 it('a real local consumer rejects the next request after the mocked provider exposes the signed withdrawal',async()=>{
  const B=createTwoClientConsumer('B',async()=>{const response=await request('consumer=B');if(!response.ok)throw new Error('Current read unavailable');return response.json();});
  const before=await B.request(session);expect(before.admission.allowed).toBe(true);expect(before.output?.passed).toBe(true);
  withdrawn=true;const after=await B.request(session);
  expect(after.request_no).toBe(2);expect(after.admission).toMatchObject({allowed:false,status:'withdrawn'});expect(after.task_executed).toBe(false);expect(after.output).toBeNull();expect(readRecords).toHaveBeenCalledTimes(2);expect(relay.graphRead).toHaveBeenCalledTimes(2);expect(after.read!.records).toHaveLength(3);expect(after.read!.block).toBe('120');
 });
 it('rejects a session graph outside the configured root before making provider reads',async()=>{
  session.graph.graph_digest='sha256:'+'f'.repeat(64);const response=await request();expect(response.status).toBe(503);expect(readRecords).not.toHaveBeenCalled();expect(relay.graphRead).not.toHaveBeenCalled();expect(env.ASSETS.fetch).toHaveBeenCalledOnce();
 });
 it.each(['packet_url','start'])('rejects an unsupported session graph %s before making provider reads',async key=>{
  const malformed=JSON.parse(JSON.stringify(session));malformed.graph[key]='https://attacker.invalid/private';env.ASSETS.fetch.mockResolvedValue(new Response(JSON.stringify(malformed)));
  expect((await request()).status).toBe(503);expect(readRecords).not.toHaveBeenCalled();expect(relay.graphRead).not.toHaveBeenCalled();
 });
 it.each(['review','graph'])('fails closed on a new %s provider error after a successful response without exposing secrets',async provider=>{
  expect((await request()).status).toBe(200);
  const error=new Error('https://private-provider.invalid?X-API-KEY='+secret);
  if(provider==='review')vi.mocked(readRecords).mockRejectedValueOnce(error);else relay.graphRead.mockRejectedValueOnce(error);
  const response=await request('consumer=B'),body=await response.json();expect(response.status).toBe(503);expect(body).toEqual({error:'This request could not verify its current session graph and review. No cached admission is returned.'});expect(JSON.stringify(body)).not.toContain(secret);expect(JSON.stringify(body)).not.toContain('private-provider');expect(body).not.toHaveProperty('records');expect(body).not.toHaveProperty('admission');expect(readRecords).toHaveBeenCalledTimes(2);expect(relay.graphRead).toHaveBeenCalledTimes(2);
 });
 it.each(['review-block','review-time','graph-block','graph-time','review-budget','graph-budget'])('rejects malformed or excessive provider response fields: %s',async field=>{
  if(field.startsWith('review'))vi.mocked(readRecords).mockImplementation(async()=>{const current=fixture.read();return {records:field==='review-budget'?Array(1001).fill(current.records[0]):current.records,ignored:0,block:field==='review-block'?'12.5':current.block,query:current.query,read_at:field==='review-time'?'not-a-date':current.read_at};});
  else relay.graphRead.mockImplementation(async()=>{const current=fixture.read().graph;return {...current,records:field==='graph-budget'?Array(702).fill(current.records[0]):current.records,block:field==='graph-block'?'-1':current.block,read_at:field==='graph-time'?'yesterday':current.read_at};});
  const response=await request();expect(response.status).toBe(503);expect(await response.json()).not.toHaveProperty('records');
 });
 it.each(['/data/two-client-session.json','/data/handoff-packet.json','/sources/release.ts'])('rejects an unavailable known asset: %s',async path=>{
  env.ASSETS.fetch.mockImplementation(async value=>pathname(value)===path?new Response('unavailable',{status:404}):assets(value));const response=await request();expect(response.status).toBe(503);expect(await response.json()).not.toHaveProperty('records');
 });
 it.each(['/data/two-client-session.json','/data/handoff-packet.json','/sources/release.ts'])('cancels an oversized %s stream before reading the remaining body',async path=>{
  const cancel=vi.fn();let pulls=0;
  const stream=new ReadableStream<Uint8Array>({pull(controller){pulls++;controller.enqueue(new Uint8Array(limitBytes+1));},cancel},{highWaterMark:0});
  env.ASSETS.fetch.mockImplementation(async value=>pathname(value)===path?new Response(stream):assets(value));
  expect((await request()).status).toBe(503);expect(cancel).toHaveBeenCalledOnce();expect(pulls).toBe(1);
 });
 it('rejects non-UTF-8 assets and malformed packet JSON',async()=>{
  env.ASSETS.fetch.mockImplementation(async value=>pathname(value)==='/sources/release.ts'?new Response(new Uint8Array([0xc3,0x28])):assets(value));expect((await request()).status).toBe(503);
  env.ASSETS.fetch.mockImplementation(async value=>pathname(value)==='/data/handoff-packet.json'?new Response('{bad JSON'):assets(value));expect((await request()).status).toBe(503);
 });
});
