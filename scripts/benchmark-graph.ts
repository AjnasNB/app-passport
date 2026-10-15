import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {cpus,platform,arch} from 'node:os';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';
import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts';
import {createGraphKit,digestJson,type EvidenceGraph,type GraphRecord} from '../packages/arkiv-graph/src/index';

// Run locally: node --import tsx scripts/benchmark-graph.ts
// Synthetic CPU timings only. This script never opens an RPC connection or writes to Arkiv.
const kit=createGraphKit(),started=new Date(),verificationNow=Date.now();
const signer=privateKeyToAccount(generatePrivateKey());
const output=new URL('../apps/web/public/data/graph-benchmark.json',import.meta.url);
const round=(value:number)=>Number(value.toFixed(6));

function syntheticGraph(count:number):EvidenceGraph {
 const nodes=Array.from({length:count},(_,i)=>({id:`node:${i}`,type:'synthetic',label:`Synthetic node ${i}`,digest:digestJson({fixture:i}),detail:'Locally generated benchmark fixture; no real-world evidence.'}));
 const edges:EvidenceGraph['edges']=[];
 const edge=(from:number,to:number)=>edges.push({id:`edge:${edges.length}`,from:`node:${from}`,to:`node:${to}`,relation:'links'});
 // A binary tree reaches every node within depth 8. Back links and cross links add cycles.
 for(let i=1;i<count;i++)edge(Math.floor((i-1)/2),i);
 for(let i=0;i<count&&edges.length<500;i++)edge(i,Math.max(0,Math.floor((i-1)/2)));
 for(let i=0;i<count&&edges.length<500;i++)edge(i,(i+1)%count);
 return kit.graphSchema.parse({schema:'arkiv.graph.v1',label:`Synthetic ${count}-node graph`,nodes,edges});
}

// Previous algorithm, including the same schema parse as the public traversal function. Keeping
// this comparison in the reproducible script makes the indexed traversal claim independently
// measurable without presenting an isolated index lookup as the full SDK operation.
function scanTraversal(input:EvidenceGraph){
 const graph=kit.graphSchema.parse(input),visited=new Set(['node:0']),queue=[{id:'node:0',level:0}],edges:EvidenceGraph['edges']=[];let truncated=false;
 for(let i=0;i<queue.length;i++){const q=queue[i]!;if(q.level>=8){if(graph.edges.some(e=>e.from===q.id&&!visited.has(e.to)))truncated=true;continue;}for(const e of graph.edges.filter(e=>e.from===q.id)){if(!visited.has(e.to)){if(visited.size>=200){truncated=true;continue;}visited.add(e.to);queue.push({id:e.to,level:q.level+1});}edges.push(e);}}
 return {nodes:graph.nodes.filter(node=>visited.has(node.id)),edges,truncated};
}

function summarize(samples:number[],batchSize:number,warmupCalls:number){
 const sorted=[...samples].sort((a,b)=>a-b),at=(quantile:number)=>sorted[Math.ceil(quantile*sorted.length)-1]!;
 return {unit:'milliseconds per operation',sample_count:samples.length,calls_per_sample:batchSize,warmup_calls:warmupCalls,median_ms:round(at(.5)),p95_ms:round(at(.95)),min_ms:round(sorted[0]!),max_ms:round(sorted.at(-1)!),sample_means_ms:samples.map(round)};
}
function measureSync(work:()=>unknown){
 const warmupCalls=30,sampleCount=30,batchSize=30;
 for(let i=0;i<warmupCalls;i++)work();
 const samples:number[]=[];
 for(let sample=0;sample<sampleCount;sample++){const before=performance.now();for(let i=0;i<batchSize;i++)work();samples.push((performance.now()-before)/batchSize);}
 return summarize(samples,batchSize,warmupCalls);
}
async function measureAsync(work:()=>Promise<unknown>){
 const warmupCalls=1,sampleCount=5;
 await work();const samples:number[]=[];
 for(let sample=0;sample<sampleCount;sample++){const before=performance.now();await work();samples.push(performance.now()-before);}
 return summarize(samples,1,warmupCalls);
}

const results=[];
for(const count of [20,100,200]){
 const graph=syntheticGraph(count),root=digestJson(graph),issued_at=new Date(verificationNow-1000).toISOString(),valid_until=new Date(verificationNow+3600000).toISOString();
 const payloads=kit.graphPayloads(graph,signer.address,issued_at,valid_until);
 const records:GraphRecord[]=await Promise.all(payloads.map(async(payload,i)=>({key:`0x${(i+1).toString(16).padStart(64,'0')}`,creator:signer.address,envelope:await kit.signGraph(payload,signer)})));
 const traversal=kit.traverseGraph(graph,'node:0',{depth:8,maxNodes:200});
 if(traversal.truncated||traversal.nodes.length!==count||digestJson(await kit.assembleGraph(records,root,[signer.address],verificationNow))!==root)throw new Error('Benchmark fixture did not verify completely');
 if(JSON.stringify(traversal)!==JSON.stringify(scanTraversal(graph)))throw new Error('Traversal comparison changed behavior');
 const metrics={
  schema_validation:measureSync(()=>kit.graphSchema.parse(graph)),
  canonical_graph_digest:measureSync(()=>digestJson(graph)),
  traversal_scan_with_validation:measureSync(()=>scanTraversal(graph)),
  traversal_indexed_with_validation:measureSync(()=>kit.traverseGraph(graph,'node:0',{depth:8,maxNodes:200})),
  assemble_with_signature_manifest_and_root_verification:await measureAsync(()=>kit.assembleGraph(records,root,[signer.address],verificationNow))
 };
 results.push({nodes:graph.nodes.length,edges:graph.edges.length,signed_records:records.length,graph_digest:root,traversal:{start:'node:0',depth:8,max_nodes:200,returned_nodes:traversal.nodes.length,returned_edges:traversal.edges.length,truncated:traversal.truncated},metrics});
 console.log(JSON.stringify({nodes:count,edges:graph.edges.length,traversal_median_ms:metrics.traversal_indexed_with_validation.median_ms,assembly_median_ms:metrics.assemble_with_signature_manifest_and_root_verification.median_ms}));
}
const files=['packages/arkiv-graph/src/index.ts','packages/arkiv-graph/src/canonical.ts','scripts/benchmark-graph.ts'];
const source_sha256=Object.fromEntries(await Promise.all(files.map(async path=>[path,createHash('sha256').update(await readFile(new URL(`../${path}`,import.meta.url))).digest('hex')])));
const report={
 schema:'arkiv-graph.local-cpu-benchmark.v1',evaluated_at:started.toISOString(),completed_at:new Date().toISOString(),
 scope:'Project-run local synthetic CPU measurements within the SDK limits of 200 nodes and 500 edges. No network, Arkiv RPC, storage, gas, production latency, throughput, adoption or distributed-scale claims.',
 reproduction:'node --import tsx scripts/benchmark-graph.ts',environment:{node:process.version,platform:platform(),architecture:arch(),cpu:cpus()[0]?.model??'unknown',logical_cpu_count:cpus().length},source_sha256,
 method:{clock:'node:perf_hooks performance.now',synchronous_metrics:'30 warmup calls; 30 sequential samples of 30 calls each, reported per-call means',assembly_metric:'1 warmup call; 5 sequential samples, each fully verifies all EOA signatures, manifest membership and pinned root',setup_excluded:['synthetic graph generation','payload generation','signing','fixture verification','file writes'],traversal_comparison:'Both scan and indexed traversal include full graph schema validation and use depth 8 / maxNodes 200.',caveats:['One process on one local machine; results vary with hardware, JIT, garbage collection and other workloads.','P95 summarizes the small local sample distribution, not a production service percentile.','No extrapolation beyond 200 nodes / 500 edges; network and payload-fetch costs are not measured.']},results
};
await mkdir(new URL('.',output),{recursive:true});
await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(`Saved ${fileURLToPath(output)}`);
