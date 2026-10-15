import {twoClientReadSchema,twoClientSessionSchema,TWO_CLIENT_SOURCE_MAP} from '../apps/web/src/two-client-model';
import {readRecords} from '../packages/sdk/src/arkiv';
import {createGraphKit,AI_PASSPORT_PROFILE} from '../packages/arkiv-graph/src/index';
import graphConfig from '../apps/web/public/data/graph-config.json';

type Bindings={ASSETS:{fetch:typeof fetch};ARKIV_API_KEY:string};
async function asset(env:Bindings,path:string,origin:string,maxBytes:number){
 const response=await env.ASSETS.fetch(new Request(new URL(path,origin)));
 if(!response.ok)throw new Error('Public evidence unavailable');
 const reader=response.body?.getReader();if(!reader)throw new Error('Public evidence unavailable');
 const chunks:Uint8Array[]=[];let size=0;
 try{
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw new Error('Public evidence exceeds its budget');}chunks.push(value);}
 }finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
}
/** Read-only relay. Every invocation has its own graph and admission query. */
export async function twoClientRead(env:Bindings,origin:string):Promise<unknown>{
 const session=twoClientSessionSchema.parse(JSON.parse(await asset(env,'/data/two-client-session.json',origin,2*1024*1024)));
 if(session.graph.graph_digest!==graphConfig.graph_digest)throw new Error('Session must use the configured reference graph');
 const connection={headers:{'X-API-KEY':env.ARKIV_API_KEY}};
 const [reviews,graph,packetText,...sourceBodies]=await Promise.all([
  readRecords({...connection,policy:session.policy},session.descriptor.artifact_digest),
  createGraphKit(AI_PASSPORT_PROFILE).readGraph({...connection,issuers:session.graph.issuers},session.graph.graph_digest),
  asset(env,'/data/handoff-packet.json',origin,2*1024*1024),
  ...TWO_CLIENT_SOURCE_MAP.map(source=>asset(env,source.path,origin,2*1024*1024)),
 ]);
 return twoClientReadSchema.parse({...reviews,session_id:session.session_id,graph:{records:graph.records,block:graph.block,query:graph.query,read_at:graph.read_at},packet:JSON.parse(packetText),sources:TWO_CLIENT_SOURCE_MAP.map((source,i)=>({...source,body:sourceBodies[i]!}))});
}
