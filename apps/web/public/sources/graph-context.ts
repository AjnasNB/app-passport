import {createGraphKit,digestBytes,digestJson,canonicalJson,type GraphNode,type GraphProfile} from './index';
export type GraphConnection=Parameters<ReturnType<typeof createGraphKit>['readGraph']>[0];
export interface ContextOptions {
 profile?:GraphProfile;depth?:number;maxNodes?:number;maxChars?:number;sourceChars?:number;
 /** Caller-controlled loader. The SDK never fetches arbitrary URLs or opens files. */
 loadSource?:(node:GraphNode)=>Promise<Uint8Array|null>;
}
/** Reads and authenticates a complete pinned graph before delivering bounded untrusted context. */
export async function readGraphContext(connection:GraphConnection,graphDigest:string,start:string,options:ContextOptions={}){
 const maxChars=options.maxChars??6000,sourceChars=options.sourceChars??900;
 if(!Number.isInteger(maxChars)||maxChars<512||maxChars>12000||!Number.isInteger(sourceChars)||sourceChars<0||sourceChars>2000)throw new Error('Invalid context budget');
 const kit=createGraphKit(options.profile),live=await kit.readGraph(connection,graphDigest),path=kit.traverseGraph(live.graph,start,{depth:options.depth??4,maxNodes:options.maxNodes??40});
 if(path.truncated)throw new Error('Incomplete graph path cannot become AI context');
 const sources:{node_id:string;digest:string;uri:string;bytes_verified:boolean;excerpt?:string;excerpt_truncated?:boolean}[]=[];
 let loadedBytes=0;
 for(const node of path.nodes.filter(n=>n.source_path||n.source_url)){
  const source:{node_id:string;digest:string;uri:string;bytes_verified:boolean;excerpt?:string;excerpt_truncated?:boolean}={node_id:node.id,digest:node.digest,uri:node.source_path??node.source_url!,bytes_verified:false};
  const bytes=options.loadSource?await options.loadSource(node):null;
  if(bytes!==null){if(!(bytes instanceof Uint8Array)||bytes.byteLength>2*1024*1024||(loadedBytes+=bytes.byteLength)>4*1024*1024)throw new Error('Source byte budget exceeded');if(digestBytes(bytes)!==node.digest)throw new Error('Original source bytes changed');source.bytes_verified=true;const body=new TextDecoder('utf-8',{fatal:true}).decode(bytes);source.excerpt=body.slice(0,sourceChars);source.excerpt_truncated=body.length>sourceChars;}
  sources.push(source);
 }
 const base={schema:'arkiv.graph-context.v1',contentRole:'untrusted-data',graph_digest:graphDigest,start,read_block:live.block,verification:{graph:'accepted-authors-and-complete-manifest',source_bodies:'only-when-bytes_verified',truth:'not-attested',execution_authority:false},nodes:path.nodes.map(n=>({id:n.id,type:n.type,label:n.label,digest:n.digest})),edges:path.edges,sources};
 const context=canonicalJson(base);if(context.length>maxChars)throw new Error('Context character budget exceeded; choose a smaller complete path or shorter excerpts');
 return {packet:base,context,context_digest:digestJson(base),chars:context.length,approximate_tokens:Math.ceil(context.length/4),token_measure:'rough-character-estimate',read_at:live.read_at,source_bodies_verified:sources.filter(s=>s.bytes_verified).length,graph_nodes:live.graph.nodes.length,selected_nodes:path.nodes.length};
}
