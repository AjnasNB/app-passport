import React,{useEffect,useState} from 'react';
import {DownloadIcon,ExternalLinkIcon,ReloadIcon} from '@radix-ui/react-icons';
type Live={graph:{nodes:{id:string;label:string;type:string;detail:string;source_path?:string}[];edges:{from:string;to:string;relation:string}[]};records:unknown[];block:string;graph_digest:string};
export function GraphSDK(){
 const [live,setLive]=useState<Live|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function read(){setLive(null);setError('');setBusy(true);try{const r=await fetch('/api/infrastructure-graph',{cache:'no-store',signal:AbortSignal.timeout(30000)});if(!r.ok)throw new Error();const data=await r.json() as Live;if(!data.graph?.nodes||!data.block)throw new Error();setLive(data);}catch{setError('The current infrastructure graph could not be verified. Retry the live read.');}finally{setBusy(false);}}
 useEffect(()=>{read();},[]);
 return <div className="graph-sdk"><h2>Arkiv Graph SDK</h2><p>Connected records that independent readers can verify. Use any domain-specific node types and relationships. AI Passport uses the same engine through a compatible profile.</p>
 <div className="actions"><a className="primary" href="/downloads/arkiv-graph-sdk-0.2.0.tgz"><DownloadIcon/>Download Arkiv Graph</a><a className="secondary" href="/data/arkiv-graph-reader.json">Reader configuration <DownloadIcon/></a><a className="secondary" href="/contracts/arkiv-graph.schema.json">Graph schema <ExternalLinkIcon/></a><a className="secondary" href="https://github.com/AjnasNB/arkiv-graph/blob/main/ARKIV_GRAPH.md" target="_blank" rel="noreferrer">Setup and architecture <ExternalLinkIcon/></a></div>
 <pre><code>{`npm install https://arkivgraph.ajnasnb.com/downloads/arkiv-graph-sdk-0.2.0.tgz
curl -o reader.json https://arkivgraph.ajnasnb.com/data/arkiv-graph-reader.json
npx arkiv-graph verify reader.json
npx arkiv-graph trace reader.json application:ai-passport
npx arkiv-graph mcp reader.json`}</code></pre>
 <p className="small">Tarball release, not published to npm. Readers need no wallet. Choose your accepted issuers and pin the graph revision in the configuration. Writers use free Tiramisu testnet tokens for this demo.</p>
 <div className="section-heading"><h3>The infrastructure graph, read live</h3><button className="secondary" disabled={busy} onClick={read}><ReloadIcon/>{busy?'Verifying graph…':'Refresh infrastructure graph'}</button></div>
 {error&&<p className="notice" role="alert">{error}</p>}{live&&<><p className="small infrastructure-counts">Live block {live.block} · {live.graph.nodes.length} nodes · {live.graph.edges.length} edges · {live.records.length} signed entities</p><div className="infrastructure-nodes">{live.graph.nodes.map(node=><article key={node.id}><span className="overline">{node.type}</span><h4>{node.label}</h4><p>{node.detail}</p>{live.graph.edges.filter(e=>e.from===node.id).map(edge=><p className="infra-relation" key={edge.to+edge.relation}><strong>{edge.relation}</strong> {live.graph.nodes.find(n=>n.id===edge.to)?.label}</p>)}{node.source_path&&<a href={node.source_path}>Inspect original source</a>}</article>)}</div><p className="mono break small">{live.graph_digest}</p></>}
 <div className="sdk-facts"><div><h3>Why Arkiv</h3><p>Its indexed public entities give independent readers the same attributable records. Our SDK adds graph manifests, verification and traversal.</p></div><div><h3>What the SDK guarantees</h3><p>Accepted authorship and complete membership of a pinned revision. Source truth and AI computation require separate checks. Limits: 200 nodes, 500 edges and eight query pages.</p></div></div>
 <a className="secondary" href="/data/graph-infrastructure-evaluation.json">Fresh package, CLI and MCP evaluation <ExternalLinkIcon/></a><hr/><h2>AI Passport application SDK</h2>
 </div>;
}

