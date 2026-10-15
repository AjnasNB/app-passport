import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=await fs.realpath(process.argv[2]);
const consumer=path.dirname(fileURLToPath(import.meta.url));
const relative=path.relative(root,consumer);
if(!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative))throw new Error('This gate must run in its isolated npm consumer');
const load=async file=>JSON.parse(await fs.readFile(path.join(root,'apps/web/public/data',file),'utf8'));
const [generic,reference,session,packet]=await Promise.all(['arkiv-graph-reader.json','ai-passport-reader.json','two-client-session.json','handoff-packet.json'].map(load));
const source=await fs.readFile(path.join(root,'apps/web/public/sources/release.ts'));
const publicRPC=new URL(generic.rpc);
if(publicRPC.protocol!=='https:'||publicRPC.username||publicRPC.password||publicRPC.search||reference.rpc!==generic.rpc)throw new Error('Expected one credential-free configured public RPC');

const projectOrigins=new Set(['https://arkivgraph.ajnasnb.com','https://passport.ajnasnb.com','https://scamsignal.ajnasnb.com','https://app-passport.ajnasnb.workers.dev']);
const nativeFetch=globalThis.fetch;
const methods={},requests=[];
const allowedMethods=new Set(['arkiv_getBlockTiming','arkiv_query']);
let blockedProjectRequests=0,blockedRPCRequests=0,rpcAvailable=true;
globalThis.fetch=async(input,init)=>{
 const url=new URL(typeof input==='string'||input instanceof URL?input:input.url);
 if(projectOrigins.has(url.origin)){blockedProjectRequests++;throw new Error('Deliberately injected project API outage');}
 if(url.href!==publicRPC.href)throw new Error('Unexpected network destination in isolated reader');
 if(!rpcAvailable){blockedRPCRequests++;throw new Error('Deliberately injected RPC outage');}
 const headers=new Headers(init?.headers??(input instanceof Request?input.headers:undefined));
 if(headers.has('authorization')||headers.has('x-api-key')||headers.has('cookie'))throw new Error('Read must be anonymous');
 const text=init?.body??(input instanceof Request?await input.clone().text():null);
 const messages=typeof text==='string'?JSON.parse(text):null;
 const names=(Array.isArray(messages)?messages:[messages]).map(message=>message?.method).filter(Boolean);
 if(!names.length||names.some(name=>!allowedMethods.has(name)))throw new Error('Unexpected JSON-RPC method in this read-only proof');
 for(const name of names)methods[name]=(methods[name]??0)+1;
 const started=Date.now();
 const response=await nativeFetch(input,{...init,redirect:'error'});
 requests.push({origin:url.origin,methods:names,http_status:response.status,duration_ms:Date.now()-started});
 return response;
};
const checks=[];
const pass=(name,detail={})=>checks.push({name,passed:true,...detail});
let projectFailed=false;
try{await fetch('https://arkivgraph.ajnasnb.com/api/graph');}catch{projectFailed=true;}
if(!projectFailed||blockedProjectRequests!==1)throw new Error('Project API outage control failed');
pass('Project API calls are deliberately blocked before protocol reads');

const {createGraphKit,AI_PASSPORT_PROFILE}=await import('@ajnasnb/arkiv-graph');
const {digestBytes,digestJson}=await import('@ajnasnb/ai-passport');
const {verifyQarinahHandoff}=await import('@ajnasnb/ai-passport/qarinah');
const kit=createGraphKit();
const infrastructure=await kit.readGraph({rpc:generic.rpc,issuers:generic.issuers},generic.graph_digest);
if(infrastructure.graph.nodes.length!==7||infrastructure.graph.edges.length!==8)throw new Error('Infrastructure root differs from pinned revision');
pass('Generic graph verifies from public RPC with the project API blocked',{graph_digest:generic.graph_digest,read_block:infrastructure.block,nodes:7,edges:8,entities:infrastructure.records.length,query:infrastructure.query});
const appKit=createGraphKit(AI_PASSPORT_PROFILE);
const application=await appKit.readGraph({rpc:reference.rpc,issuers:reference.issuers},reference.graph_digest);
if(application.graph.nodes.length!==27||application.graph.edges.length!==43)throw new Error('Reference root differs from pinned revision');
pass('Application graph verifies through the separately installed generic profile',{graph_digest:reference.graph_digest,read_block:application.block,nodes:27,edges:43,entities:application.records.length,query:application.query});

const selected=appKit.traverseGraph(application.graph,'context:handoff',{depth:4,maxNodes:40});
const contextNode=selected.nodes.find(node=>node.id==='context:handoff');
const sourceNode=selected.nodes.find(node=>node.type==='source'&&node.source_path==='/sources/release.ts');
if(selected.truncated||contextNode?.digest!==digestJson(packet)||sourceNode?.digest!==digestBytes(source))throw new Error('Exact context/source path binding failed');
pass('Public-checkout source bytes and context packet match the signed graph',{source_files_checked:1,source_digest:digestBytes(source),packet_digest:digestJson(packet),source_origin:'Committed public checkout; not fetched from the blocked website'});
const snapshot=path.join(consumer,'source-snapshot');
await fs.mkdir(path.join(snapshot,'src'),{recursive:true});
await fs.writeFile(path.join(snapshot,'src/release.ts'),source);
if(session.status!=='completed'||session.graph.graph_digest!==reference.graph_digest)throw new Error('Expected the completed pinned session');
const decision=await verifyQarinahHandoff({packet,descriptor:session.descriptor,repository:snapshot,connection:{rpc:reference.rpc,policy:session.policy}});
if(decision.admission.allowed||decision.admission.status!=='withdrawn'||decision.context!==null)throw new Error('Current withdrawal was not enforced');
pass('A fresh packaged Qarinah consumer refuses the withdrawn context without the relay',{session_id:session.session_id,status:decision.admission.status,read_block:decision.read_block,query:decision.query,inference_run:false,task_executed:false});

const missing=infrastructure.records.find(record=>record.envelope.payload.kind==='node');
if(!missing)throw new Error('Expected a removable node record');
let incompleteRejected=false;
try{await kit.assembleGraph(infrastructure.records.filter(record=>record!==missing),generic.graph_digest,generic.issuers);}catch{incompleteRejected=true;}
if(!incompleteRejected)throw new Error('Incomplete graph incorrectly verified');
pass('Removing a signed member fails complete-manifest verification',{removed_entity:missing.key});

rpcAvailable=false;
let rpcFailedClosed=false;
try{await kit.readGraph({rpc:generic.rpc,issuers:generic.issuers},generic.graph_digest);}catch{rpcFailedClosed=true;}
if(!rpcFailedClosed||blockedRPCRequests<1)throw new Error('RPC outage control failed');
pass('An unavailable RPC does not produce a successful graph read');
if(!requests.length||blockedProjectRequests!==1||requests.some(request=>request.http_status!==200))throw new Error('Unexpected network trace');
console.log(JSON.stringify({evaluated_at:new Date().toISOString(),schema:'arkiv-graph.backend-independence.v1',passed:checks.length,total:7,checks,network:{control:'Node global fetch interception before SDK imports, not an OS firewall or network sandbox',project_origins_blocked:[...projectOrigins],project_requests_blocked:blockedProjectRequests,project_requests_succeeded:0,allowed_rpc_origin:publicRPC.origin,allowed_rpc_methods:[...allowedMethods],rpc_requests:requests.length,rpc_methods:methods,requests,api_key_used:false,wallet_used:false,rpc_outage_requests_blocked:blockedRPCRequests},scope:'Project-run in-process fetch fault injection, not an actual website or RPC outage. Existing public npm releases run in an isolated consumer whose fetch implementation deliberately rejects all project API origins and every destination except the configured RPC. Root/issuer policy, context packet and original source bytes are supplied by the public checkout. Current graph and review state are read through one configured Arkiv RPC provider; provider completeness and metadata remain trusted. Both graphs and session wallets are project-controlled. This is not outside adoption, a state proof, an OS network sandbox, or proof that only Arkiv can implement a public record layer.'}));
