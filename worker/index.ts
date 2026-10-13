import {readRecords} from '../packages/sdk/src/arkiv';
import {digestSchema,policySchema} from '../packages/sdk/src/index';
import policy from '../apps/web/public/data/policy.json';
interface Env{ASSETS:{fetch:typeof fetch};ARKIV_API_KEY:string;READ_LIMITER:{limit(args:{key:string}):Promise<{success:boolean}>};}
const headers={'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'};
export default {async fetch(request:Request,env:Env):Promise<Response>{
 const url=new URL(request.url);
 if(url.pathname==='/api/health'){if(request.method!=='GET')return new Response(JSON.stringify({error:'Read-only endpoint'}),{status:405,headers});return new Response(JSON.stringify({service:'AppPassport',network:'Tiramisu',write_access:'operator-only',public_uploads:false}),{headers});}
 if(url.pathname==='/api/records'){
  if(request.method!=='GET')return new Response(JSON.stringify({error:'Read-only endpoint'}),{status:405,headers});
  const limit=await env.READ_LIMITER.limit({key:request.headers.get('CF-Connecting-IP')||'anonymous'});if(!limit.success)return new Response(JSON.stringify({error:'Please retry shortly'}),{status:429,headers:{...headers,'retry-after':'60'}});
  if([...url.searchParams.keys()].some(k=>k!=='artifact')||url.searchParams.getAll('artifact').length>1)return new Response(JSON.stringify({error:'Unsupported parameter'}),{status:400,headers});
  const artifact=url.searchParams.get('artifact')||undefined;if(artifact&&!digestSchema.safeParse(artifact).success)return new Response(JSON.stringify({error:'Invalid artifact identity'}),{status:400,headers});
  try{const data=await readRecords({policy:policySchema.parse(policy),headers:{'X-API-KEY':env.ARKIV_API_KEY}},artifact);return new Response(JSON.stringify(data),{headers});}
  catch{return new Response(JSON.stringify({error:'Current Arkiv evidence could not be verified'}),{status:503,headers});}
 }
 if(url.pathname.startsWith('/api/'))return new Response(JSON.stringify({error:'Endpoint not found'}),{status:404,headers});
 const response=await env.ASSETS.fetch(request);const safe=new Response(response.body,response);
 safe.headers.set('X-Content-Type-Options','nosniff');safe.headers.set('Referrer-Policy','strict-origin-when-cross-origin');safe.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
 safe.headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' wss://rpc.tiramisu.db-chain.testnet.arkiv.network; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
 return safe;
}};
