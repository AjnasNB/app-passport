import {aiRun,runInputSchema,AiBoundaryError} from './ai';
import {readGraph} from '../packages/sdk/src/graph';
import graphConfig from '../apps/web/public/data/graph-config.json';
export {AiBudget} from './budget';
import {readRecords} from '../packages/sdk/src/arkiv';
import {digestSchema,policySchema} from '../packages/sdk/src/index';
import policy from '../apps/web/public/data/policy.json';
const headers={'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'};
export default {async fetch(request:Request,env:Env):Promise<Response>{
 const url=new URL(request.url);
 if(url.pathname==='/api/health'){if(request.method!=='GET')return new Response(JSON.stringify({error:'Read-only endpoint'}),{status:405,headers});return new Response(JSON.stringify({service:'AI Passport',network:'Tiramisu',write_access:'operator-only',public_uploads:false}),{headers});}
 if(url.pathname==='/api/records'){
  if(request.method!=='GET')return new Response(JSON.stringify({error:'Read-only endpoint'}),{status:405,headers});
  const limit=await env.READ_LIMITER.limit({key:request.headers.get('CF-Connecting-IP')||'anonymous'});if(!limit.success)return new Response(JSON.stringify({error:'Please retry shortly'}),{status:429,headers:{...headers,'retry-after':'60'}});
  if([...url.searchParams.keys()].some(k=>k!=='artifact')||url.searchParams.getAll('artifact').length>1)return new Response(JSON.stringify({error:'Unsupported parameter'}),{status:400,headers});
  const artifact=url.searchParams.get('artifact')||undefined;if(artifact&&!digestSchema.safeParse(artifact).success)return new Response(JSON.stringify({error:'Invalid artifact identity'}),{status:400,headers});
  try{const data=await readRecords({policy:policySchema.parse(policy),headers:{'X-API-KEY':env.ARKIV_API_KEY}},artifact);return new Response(JSON.stringify(data),{headers});}
  catch{return new Response(JSON.stringify({error:'Current Arkiv evidence could not be verified'}),{status:503,headers});}
 }
 if(url.pathname==='/api/graph'){if(request.method!=='GET')return new Response(JSON.stringify({error:'Read-only endpoint'}),{status:405,headers});if(url.search) return new Response(JSON.stringify({error:'Unsupported parameter'}),{status:400,headers});const limit=await env.READ_LIMITER.limit({key:request.headers.get('CF-Connecting-IP')||'anonymous'});if(!limit.success)return new Response(JSON.stringify({error:'Please retry shortly'}),{status:429,headers});try{return new Response(JSON.stringify(await readGraph({policy:policySchema.parse(policy),headers:{'X-API-KEY':env.ARKIV_API_KEY}},graphConfig.graph_digest)),{headers});}catch{return new Response(JSON.stringify({error:'Current graph is incomplete or unavailable'}),{status:503,headers});}}
 if(url.pathname==='/api/run'){
  if(request.method!=='POST')return new Response(JSON.stringify({error:'Use POST'}),{status:405,headers});
  const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)return new Response(JSON.stringify({error:'Origin not allowed'}),{status:403,headers});
  if(!request.headers.get('content-type')?.startsWith('application/json'))return new Response(JSON.stringify({error:'JSON required'}),{status:415,headers});
  const limited=await env.AI_LIMITER.limit({key:request.headers.get('CF-Connecting-IP')||'anonymous'});if(!limited.success)return new Response(JSON.stringify({error:'Wait a minute before another AI run'}),{status:429,headers});
  let raw:unknown;try{const reader=request.body?.getReader();if(!reader)throw new Error();const chunks:Uint8Array[]=[];let size=0;while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.length;if(size>2048){await reader.cancel();return new Response(JSON.stringify({error:'Request too large'}),{status:413,headers});}chunks.push(chunk.value);}const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}raw=JSON.parse(new TextDecoder().decode(bytes));if(!runInputSchema.safeParse(raw).success)throw new Error();}catch{return new Response(JSON.stringify({error:'Invalid task request'}),{status:400,headers});}
  try{const result=await aiRun(raw,env,url.origin);return new Response(JSON.stringify(result.body),{status:result.status,headers});}catch(e){return new Response(JSON.stringify({allowed:false,inference_run:e instanceof AiBoundaryError?e.inferenceStarted:false,boundary:e instanceof AiBoundaryError?e.boundary:'EVIDENCE_UNAVAILABLE',error:'The AI run could not complete. Evidence or the model provider is unavailable; no answer is substituted.'}),{status:503,headers});}
 }
 if(url.pathname.startsWith('/api/'))return new Response(JSON.stringify({error:'Endpoint not found'}),{status:404,headers});
 const response=await env.ASSETS.fetch(request);const safe=new Response(response.body,response);
 safe.headers.set('X-Content-Type-Options','nosniff');safe.headers.set('Referrer-Policy','strict-origin-when-cross-origin');safe.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
 safe.headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' wss://rpc.tiramisu.db-chain.testnet.arkiv.network; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
 return safe;
}};
