import React,{useEffect,useState} from 'react';
import {DownloadIcon,ExternalLinkIcon,ReloadIcon} from '@radix-ui/react-icons';
import {CommandBlock,GraphSchemaDiagram} from './developer-access';

type Live={graph:{nodes:{id:string;label:string;type:string;detail:string;source_path?:string}[];edges:{from:string;to:string;relation:string}[]};records:unknown[];block:string;graph_digest:string};
const docs='https://github.com/AjnasNB/arkiv-graph/blob/main/docs/GETTING_STARTED.md';
const example=`import { createGraphKit, digestJson } from '@ajnasnb/arkiv-graph';

const kit = createGraphKit();
const graph = kit.graphSchema.parse({
  schema: 'arkiv.graph.v1',
  label: 'My first connected evidence',
  nodes: [
    {
      id: 'package:demo',
      type: 'package',
      label: 'Demo package',
      digest: digestJson({ name: 'demo', version: '1.0.0' }),
      detail: 'A local package description.',
    },
    {
      id: 'source:demo',
      type: 'source',
      label: 'Demo source',
      digest: digestJson({ file: 'demo.js', content: 'export const answer = 42;' }),
      detail: 'A local source description.',
    },
  ],
  edges: [
    {
      id: 'edge:compiled-from',
      from: 'package:demo',
      to: 'source:demo',
      relation: 'compiled-from',
    },
  ],
});

const path = kit.traverseGraph(graph, 'package:demo', {
  depth: 2,
  maxNodes: 10,
});
if (path.truncated) throw new Error('Traversal budget exceeded');

console.log(JSON.stringify({
  graph_digest: digestJson(graph),
  nodes: path.nodes.map(node => node.id),
  edges: path.edges.map(edge => edge.id),
  truncated: path.truncated,
}, null, 2));`;

export function GraphSDK(){
 const [live,setLive]=useState<Live|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function read(){setLive(null);setError('');setBusy(true);try{const r=await fetch('/api/infrastructure-graph',{cache:'no-store',signal:AbortSignal.timeout(30000)});if(!r.ok)throw new Error();const data=await r.json() as Live;if(!data.graph?.nodes||!data.block)throw new Error();setLive(data);}catch{setError('The current infrastructure graph could not be verified. Retry the live read.');}finally{setBusy(false);}}
 useEffect(()=>{read();},[]);
 return <div className="graph-sdk">
  <h2>Arkiv Graph SDK</h2><p>Build typed evidence graphs with a complete signed revision contract. The generic package has no AI Passport, Qarinah or model dependency.</p>
  <div className="actions"><a className="primary" href={docs} target="_blank" rel="noreferrer">Open getting started guide<ExternalLinkIcon/></a><a className="secondary" href="https://www.npmjs.com/package/@ajnasnb/arkiv-graph" target="_blank" rel="noreferrer">View on npm<ExternalLinkIcon/></a><a className="secondary" href="/downloads/ajnasnb-arkiv-graph-0.4.0.tgz"><DownloadIcon/>Download graph 0.4.0</a></div>

  <section className="sdk-quickstart" aria-labelledby="sdk-quickstart-heading"><h3 id="sdk-quickstart-heading">Install. Build a graph. Run it.</h3><p>Use Node.js 24 or newer in an empty folder. Installation needs internet; the local example then runs offline, without an account, wallet or API key.</p><CommandBlock label="Install the SDK" command={'npm init -y\nnpm install @ajnasnb/arkiv-graph@0.4.0'}/><details className="complete-example"><summary>Copy the complete example into graph.mjs</summary><CommandBlock label="graph.mjs example" command={example}/></details><CommandBlock label="Run the local graph" command="node graph.mjs"/><p className="small">Expected output: two node IDs, one edge ID, a deterministic graph digest and <code>truncated: false</code>. This validates and traverses local data; it does not authenticate or publish network records. The node digests describe the local JSON artifacts in the example.</p></section>

  <GraphSchemaDiagram/>

  <section className="sdk-online"><h3>Verify a published graph, then connect MCP</h3><p>Review the chain, profile, pinned graph root, accepted issuer and RPC provider in the <a href={docs} target="_blank" rel="noreferrer">trust bootstrap guide</a> before using a downloaded configuration. The example uses Arkiv Tiramisu testnet; readers need no wallet.</p><CommandBlock label="Download a candidate configuration" command="curl -o reader.json https://arkivgraph.ajnasnb.com/data/arkiv-graph-reader.json"/><CommandBlock label="Verify and trace the reviewed configuration" command={'npx arkiv-graph verify reader.json\nnpx arkiv-graph trace reader.json application:ai-passport'}/><CommandBlock label="Start the MCP reader" command="npx arkiv-graph mcp reader.json"/><p className="small">Configure the last command as a stdio server in your MCP client. It waits for MCP input and verifies fresh evidence for each tool call. The pinned example does not discover newer roots automatically. Records expire; incomplete or expired evidence must fail.</p><div className="actions"><a className="secondary" href="/data/arkiv-graph-reader.json">Inspect reader configuration<DownloadIcon/></a><a className="secondary" href="https://github.com/AjnasNB/arkiv-graph/blob/main/docs/TRUST_SETUP.md" target="_blank" rel="noreferrer">Root updates and checkpoints<ExternalLinkIcon/></a></div></section>

  <section className="sdk-local"><h3>Run this reference website locally</h3><p>Clone the public repository, then install, start and test from its root. The Vite server serves the interface and proxies live API requests to a separate Worker on port 8791. The guide explains this local UI scope and links to the deployment source.</p><CommandBlock label="Clone and install the repository" command={'git clone https://github.com/AjnasNB/arkiv-graph.git\ncd arkiv-graph\nnpm install\nnpm run build:sdk'}/><CommandBlock label="Start the website" command="npm run dev"/><CommandBlock label="Test the repository" command={'npm test\nnpm run typecheck\nnpm run build'}/><CommandBlock label="Reproduce the clean SDK quickstart" command="node scripts/quickstart-proof.mjs"/><a className="text-button" href={docs} target="_blank" rel="noreferrer">Read setup, trust boundaries and expected results<ExternalLinkIcon/></a></section>

  <div className="section-heading"><h3>The infrastructure graph, read live</h3><button className="secondary" disabled={busy} onClick={read}><ReloadIcon/>{busy?'Verifying graph…':'Refresh infrastructure graph'}</button></div>
  {busy&&<p className="small" role="status">Verifying the pinned infrastructure revision…</p>}{error&&<p className="notice" role="alert">{error}</p>}{live&&<><p className="small infrastructure-counts">Live block {live.block} · {live.graph.nodes.length} nodes · {live.graph.edges.length} edges · {live.records.length} signed entities</p><div className="infrastructure-nodes">{live.graph.nodes.map(node=><article key={node.id}><span className="overline">{node.type}</span><h4>{node.label}</h4><p>{node.detail}</p>{live.graph.edges.filter(e=>e.from===node.id).map(edge=><p className="infra-relation" key={edge.to+edge.relation}><strong>{edge.relation}</strong> {live.graph.nodes.find(n=>n.id===edge.to)?.label}</p>)}{node.source_path&&<a href={node.source_path}>Inspect original source</a>}</article>)}</div><p className="mono break small">{live.graph_digest}</p></>}
  <p className="small">This is a pinned historical snapshot containing the 0.2.0 CLI. Current 0.4.0 npm bytes are checked separately in the <a href="/data/npm-release.json">registry integrity report</a>. Graph verification authenticates the signed revision, not factual truth or safe execution.</p>
  <div className="sdk-facts"><div><h3>Independent access</h3><p>Read the same attributable entities through your own RPC provider. SDK, CLI and MCP readers run outside this website. RPC metadata and query completeness remain trusted.</p><a className="text-button" href="/data/backend-independence.json">Read with the project API blocked<ExternalLinkIcon/></a></div><div><h3>Measured CPU cost</h3><p>On 15 Oct 2026, a project-run local synthetic benchmark at 200 nodes and 500 edges measured a 1.0701 ms median for indexed traversal with validation. Full signature, manifest and root verification for 701 records took 2843.6 ms median.</p><p className="small">One machine. Network, RPC, storage and gas excluded. These are CPU measurements, with no production latency or scale claim.</p><a className="text-button" href="/data/graph-benchmark.json">Inspect method and samples<ExternalLinkIcon/></a></div></div>
  <div className="actions"><a className="secondary" href="/data/graph-infrastructure-evaluation-registry.json">Anonymous npm, CLI and MCP evaluation<ExternalLinkIcon/></a><a className="secondary" href="/data/npm-release.json">Registry artifact integrity<ExternalLinkIcon/></a></div>
  <hr/><h2>AI Passport application SDK</h2><p>Add the application-specific artifact and context admission profile when your workflow needs it.</p><CommandBlock label="Install the application adapter" command="npm install @ajnasnb/ai-passport@0.6.0"/><p className="small">For its optional Node Qarinah adapter, also install <code>qarinah@0.7.0</code>. <a href="https://www.npmjs.com/package/@ajnasnb/ai-passport" target="_blank" rel="noreferrer">View the application SDK on npm.</a></p>
 </div>;
}
