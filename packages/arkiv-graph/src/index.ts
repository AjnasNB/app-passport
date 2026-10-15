import {z} from 'zod';
import {verifyMessage,type Hex,type Chain,http} from 'viem';
import {createPublicClient,ExpirationTime,jsonToPayload} from '@arkiv-network/sdk';
import {tiramisu} from '@arkiv-network/sdk/chains';
import {str,u64,addr,bytes32} from '@arkiv-network/sdk/attr';
import {eq,gt,or} from '@arkiv-network/sdk/query';
import {canonicalJson,digestJson} from './canonical';
export {canonicalJson,digestJson,digestBytes} from './canonical';
export const DEFAULT_RPC='https://rpc.tiramisu.db-chain.testnet.arkiv.network';
export const digestSchema=z.string().regex(/^sha256:[0-9a-f]{64}$/);
z.config({jitless:true});

export const ARKIV_GRAPH_PROFILE={namespace:'arkiv-graph-v1',graphSchema:'arkiv.graph.v1',recordSchema:'arkiv.graph-record.v1',signatureDomain:'Arkiv Graph record v1'} as const;
export const AI_PASSPORT_PROFILE={namespace:'ai-passport-graph-v1',graphSchema:'ai-passport.graph.v1',recordSchema:'ai-passport.graph-record.v1',signatureDomain:'AI Passport graph record v1',nodeTypes:['application','tool','context','source','model','review','decision','run'],relations:['uses','compiled-from','reviewed-by','cites','derived-from','produced','supersedes'],sourcePathPattern:/^\/sources\/[a-z0-9._-]+$/} as const;
export interface GraphProfile {namespace:string;graphSchema:string;recordSchema:string;signatureDomain:string;nodeTypes?:readonly string[];relations?:readonly string[];sourcePathPattern?:RegExp;}
export function createGraphKit(profile:GraphProfile=ARKIV_GRAPH_PROFILE){
 z.object({namespace:z.string().regex(/^[a-z0-9][a-z0-9._-]{0,119}$/),graphSchema:z.string().min(1).max(120),recordSchema:z.string().min(1).max(120),signatureDomain:z.string().min(1).max(120)}).parse(profile);
 const GRAPH_NAMESPACE=profile.namespace;
 const taxonomy=(allowed?:readonly string[])=>allowed?z.enum(allowed as [string,...string[]]):z.string().regex(/^[a-z0-9][a-z0-9:._-]{0,119}$/);
 const sourcePath=z.string().max(240).regex(profile.sourcePathPattern??/^\/[a-zA-Z0-9._/-]+$/).refine(p=>!p.split('/').some(s=>s==='.'||s==='..'));
const id=z.string().regex(/^[a-z0-9][a-z0-9:._-]{0,119}$/);
const url=z.string().url().max(1000).refine(v=>v.startsWith('https://'));
const graphNodeSchema=z.object({id,type:taxonomy(profile.nodeTypes),label:z.string().min(1).max(160),digest:digestSchema,source_url:url.optional(),source_path:sourcePath.optional(),artifact_digest:digestSchema.optional(),detail:z.string().max(1000)}).strict();
const graphEdgeSchema=z.object({id,from:id,to:id,relation:taxonomy(profile.relations)}).strict();
const graphSchema=z.object({schema:z.literal(profile.graphSchema),label:z.string().min(1).max(160),nodes:z.array(graphNodeSchema).min(1).max(200),edges:z.array(graphEdgeSchema).max(500)}).strict().superRefine((g,c)=>{
 const ids=new Set<string>();for(const n of [...g.nodes,...g.edges]){if(ids.has(n.id))c.addIssue({code:'custom',message:'Duplicate graph identity'});ids.add(n.id);}const nodes=new Set(g.nodes.map(n=>n.id));
 for(const e of g.edges)if(!nodes.has(e.from)||!nodes.has(e.to))c.addIssue({code:'custom',message:'Dangling graph edge'});
});
type EvidenceGraph=z.infer<typeof graphSchema>;
type GraphNode=z.infer<typeof graphNodeSchema>;
const common={schema:z.literal(profile.recordSchema),namespace:z.literal(GRAPH_NAMESPACE),graph_digest:digestSchema,issuer:z.string().regex(/^0x[0-9a-fA-F]{40}$/),issued_at:z.iso.datetime(),valid_until:z.iso.datetime()};
const graphPayloadSchema=z.discriminatedUnion('kind',[
 z.object({...common,kind:z.literal('node'),node:graphNodeSchema}).strict(),
 z.object({...common,kind:z.literal('edge'),edge:graphEdgeSchema}).strict(),
 z.object({...common,kind:z.literal('manifest'),label:z.string().max(160),nodes:z.array(z.object({id,digest:digestSchema}).strict()).min(1).max(200),edges:z.array(z.object({id,digest:digestSchema}).strict()).max(500)}).strict()
]).superRefine((p,c)=>{if(Date.parse(p.valid_until)<=Date.parse(p.issued_at)||Date.parse(p.valid_until)-Date.parse(p.issued_at)>30*86400000)c.addIssue({code:'custom',message:'Invalid graph validity'});});
type GraphPayload=z.infer<typeof graphPayloadSchema>;
const graphEnvelopeSchema=z.object({payload:graphPayloadSchema,signature:z.string().regex(/^0x[0-9a-fA-F]{130}$/)}).strict();
type GraphEnvelope=z.infer<typeof graphEnvelopeSchema>;
function graphMessage(p:GraphPayload){return profile.signatureDomain+'\n'+canonicalJson(graphPayloadSchema.parse(p));}
async function signGraph(p:GraphPayload,signer:{address:string;signMessage(a:{message:string}):Promise<Hex>}):Promise<GraphEnvelope>{if(p.issuer.toLowerCase()!==signer.address.toLowerCase())throw new Error('Graph signer mismatch');return {payload:graphPayloadSchema.parse(p),signature:await signer.signMessage({message:graphMessage(p)})};}
async function verifyGraphEnvelope(input:unknown):Promise<GraphEnvelope|null>{try{canonicalJson(input);const e=graphEnvelopeSchema.parse(input);return await verifyMessage({address:e.payload.issuer as Hex,message:graphMessage(e.payload),signature:e.signature as Hex})?e:null;}catch{return null;}}
function graphPayloads(input:EvidenceGraph,issuer:string,issued_at:string,valid_until:string):GraphPayload[]{canonicalJson(input);const g=graphSchema.parse(input);const base={schema:profile.recordSchema,namespace:GRAPH_NAMESPACE as typeof GRAPH_NAMESPACE,graph_digest:digestJson(g),issuer,issued_at,valid_until};return [...g.nodes.map(node=>({...base,kind:'node' as const,node})),...g.edges.map(edge=>({...base,kind:'edge' as const,edge})),{...base,kind:'manifest' as const,label:g.label,nodes:g.nodes.map(n=>({id:n.id,digest:digestJson(n)})),edges:g.edges.map(e=>({id:e.id,digest:digestJson(e)}))}].map(p=>graphPayloadSchema.parse(p));}
function graphEntityInput(e:GraphEnvelope){const p=graphEnvelopeSchema.parse(e).payload;if(Date.parse(p.valid_until)>Date.now()+29*86400000)throw new Error('Graph storage must outlive signed validity');const attrs:Record<string,ReturnType<typeof str>|ReturnType<typeof u64>|ReturnType<typeof bytes32>>={namespace:str(GRAPH_NAMESPACE),schema_version:u64(1),graph_hash:bytes32(`0x${p.graph_digest.slice(7)}` as Hex),kind:str(p.kind)};
 if(p.kind==='node'){attrs.node_id=str(p.node.id);attrs.node_type=str(p.node.type);}if(p.kind==='edge'){attrs.from_id=str(p.edge.from);attrs.to_id=str(p.edge.to);attrs.relation=str(p.edge.relation);}
 return {attributes:attrs,payload:jsonToPayload(e),contentType:'application/json',expires:ExpirationTime.fromDays(30),flags:{readonly:true,permissionlessExtension:false}};
}
type GraphRecord={key:string;creator:string;envelope:GraphEnvelope};
async function assembleGraph(records:GraphRecord[],expectedDigest:string,issuers:string[],now=Date.now()):Promise<EvidenceGraph>{
 digestSchema.parse(expectedDigest);const accepted:GraphPayload[]=[],keys=new Set<string>();
 for(const r of records){const e=await verifyGraphEnvelope(r.envelope);if(!e||r.creator.toLowerCase()!==e.payload.issuer.toLowerCase()||!issuers.some(a=>a.toLowerCase()===r.creator.toLowerCase())||e.payload.graph_digest!==expectedDigest||Date.parse(e.payload.issued_at)>now+30000||Date.parse(e.payload.valid_until)<=now)continue;if(!/^0x[0-9a-fA-F]{64}$/.test(r.key)||keys.has(r.key.toLowerCase()))throw new Error('Invalid or duplicate graph entity key');keys.add(r.key.toLowerCase());accepted.push(e.payload);}
 const manifests=accepted.filter((p):p is Extract<GraphPayload,{kind:'manifest'}>=>p.kind==='manifest');if(manifests.length!==1)throw new Error('One current accepted graph manifest is required');const m=manifests[0]!;
 const pick=<T extends {id:string}>(entries:{id:string;digest:string}[],items:T[]):T[]=>entries.map(entry=>{const matches=items.filter(item=>item.id===entry.id);if(matches.length!==1)throw new Error('Missing or ambiguous graph member');const item=matches[0]!;if(digestJson(item)!==entry.digest)throw new Error('Graph member digest mismatch');return item;});
 const nodeItems=accepted.filter((p):p is Extract<GraphPayload,{kind:'node'}>=>p.kind==='node').map(p=>p.node),edgeItems=accepted.filter((p):p is Extract<GraphPayload,{kind:'edge'}>=>p.kind==='edge').map(p=>p.edge);
 if(accepted.length!==1+m.nodes.length+m.edges.length)throw new Error('Unlisted graph member');
 const graph=graphSchema.parse({schema:profile.graphSchema,label:m.label,nodes:pick(m.nodes,nodeItems),edges:pick(m.edges,edgeItems)});if(digestJson(graph)!==expectedDigest)throw new Error('Graph root identity mismatch');return graph;
}
async function readGraph(c:{rpc?:string;chain?:Chain;headers?:Record<string,string>;issuers:string[]},graphDigest:string){
 digestSchema.parse(graphDigest);
 const issuers=z.array(z.string().regex(/^0x[0-9a-fA-F]{40}$/)).min(1).max(20).parse(c.issuers);
 const allowedCreators=new Set(issuers.map(a=>a.toLowerCase()));
 const reader=createPublicClient({chain:c.chain??tiramisu,transport:http(c.rpc||DEFAULT_RPC,{timeout:15000,retryCount:0,...(c.headers?{fetchOptions:{headers:c.headers}}:{})})}),timing=await reader.getBlockTiming();
 // Namespace/root attributes are permissionless. Filter the indexed, immutable protocol creator
 // before pagination so other publishers cannot consume the bounded reader's eight pages.
 // https://docs.arkiv.network/typescript-sdk/querying-data/#filter-by-owner-creator-key-and-expiry
 const query=reader.select({key:true,creator:true,payload:true,attributes:true,creationFlags:true}).where(eq('namespace',str(GRAPH_NAMESPACE)),eq('schema_version',u64(1)),eq('graph_hash',bytes32(`0x${graphDigest.slice(7)}` as Hex)),gt('$expiresAt',u64(timing.currentBlock)),or([...allowedCreators].map(a=>eq('$creator',addr(a)))));
 let page=await query.limit(100).fetch(),pages=0;const records:GraphRecord[]=[];
 while(true){for(const entity of page.entities){if(!entity.creationFlags?.readonly||!allowedCreators.has(entity.creator.toLowerCase()))continue;const parsed=graphEnvelopeSchema.safeParse(entity.toJson());if(!parsed.success)continue;const envelope=parsed.data;const p=envelope.payload,v=(k:string)=>entity.attributes[k]?.value;
  if(v('namespace')!==GRAPH_NAMESPACE||v('schema_version')!==1n||v('graph_hash')!==`0x${graphDigest.slice(7)}`||v('kind')!==p.kind)continue;
  if(p.kind==='node'&&(v('node_id')!==p.node.id||v('node_type')!==p.node.type))continue;if(p.kind==='edge'&&(v('from_id')!==p.edge.from||v('to_id')!==p.edge.to||v('relation')!==p.edge.relation))continue;
  records.push({key:entity.key,creator:entity.creator,envelope});}
  if(!page.hasNextPage())break;if(++pages>=8)throw new Error('Graph page budget exceeded');page=await page.next();}
 return {graph:await assembleGraph(records,graphDigest,issuers),records,block:String(page.blockNumber),query:query.toString(),read_at:new Date().toISOString()};
}
/** Directed breadth-first traversal, bounded independently of graph cycles. */
function traverseGraph(input:EvidenceGraph,start:string,{depth=4,maxNodes=40}={}){const graph=graphSchema.parse(input);if(!Number.isInteger(depth)||depth<0||depth>8||!Number.isInteger(maxNodes)||maxNodes<1||maxNodes>200)throw new Error('Invalid traversal budget');if(!graph.nodes.some(n=>n.id===start))throw new Error('Unknown starting node');const visited=new Set([start]),queue=[{id:start,level:0}],edges:EvidenceGraph['edges']=[];let truncated=false;
 // Build once in input order; each visited node examines only its own outgoing edges.
 const outgoing=new Map<string,EvidenceGraph['edges']>();
 for(const edge of graph.edges){const adjacent=outgoing.get(edge.from);if(adjacent)adjacent.push(edge);else outgoing.set(edge.from,[edge]);}
 for(let i=0;i<queue.length;i++){const q=queue[i]!,adjacent=outgoing.get(q.id)??[];if(q.level>=depth){if(adjacent.some(e=>!visited.has(e.to)))truncated=true;continue;}for(const e of adjacent){if(!visited.has(e.to)){if(visited.size>=maxNodes){truncated=true;continue;}visited.add(e.to);queue.push({id:e.to,level:q.level+1});}edges.push(e);}}
 return {nodes:graph.nodes.filter(n=>visited.has(n.id)),edges,truncated};
}

return {profile,namespace:GRAPH_NAMESPACE,graphNodeSchema,graphEdgeSchema,graphSchema,graphPayloadSchema,graphEnvelopeSchema,graphMessage,signGraph,verifyGraphEnvelope,graphPayloads,graphEntityInput,assembleGraph,readGraph,traverseGraph};
}
const kit=createGraphKit();
export const {graphNodeSchema,graphEdgeSchema,graphSchema,graphPayloadSchema,graphEnvelopeSchema,graphMessage,signGraph,verifyGraphEnvelope,graphPayloads,graphEntityInput,assembleGraph,readGraph,traverseGraph}=kit;
export type EvidenceGraph=z.infer<typeof graphSchema>;
export type GraphNode=z.infer<typeof graphNodeSchema>;
export type GraphPayload=z.infer<typeof graphPayloadSchema>;
export type GraphEnvelope=z.infer<typeof graphEnvelopeSchema>;
export type GraphRecord={key:string;creator:string;envelope:GraphEnvelope};
