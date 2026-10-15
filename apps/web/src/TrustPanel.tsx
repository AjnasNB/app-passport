import React,{useState} from 'react';
import {ArrowRightIcon,CheckIcon,ExternalLinkIcon} from '@radix-ui/react-icons';
import {createGraphKit,digestJson} from '../../../packages/arkiv-graph/src/index';
import {verifyRootRevisions,rootCheckpointSchema,rootTrustScope,rpcCheckpointSchema,verifyRpcObservations,type RootCheckpoint,type RpcCheckpoint} from '../../../packages/arkiv-graph/src/trust';
import config from '../public/data/root-trust-config.json';
import type {RootTrustConfig} from '../../../packages/arkiv-graph/src/trust';
import './trust.css';
import {z} from 'zod';
const liveSchema=z.object({schema:z.literal('arkiv.graph-root-read.v1'),scope_digest:z.string(),root:z.string(),revisions:z.array(z.unknown()).max(64),graph:z.object({records:z.array(z.any()).max(701),block:z.string()}),block:z.string().regex(/^(0|[1-9][0-9]{0,29})$/),block_time:z.iso.datetime(),read_at:z.iso.datetime(),value_digest:z.string()});
const pinned=config as RootTrustConfig;
const scope=rootTrustScope(pinned),storageKey='arkiv-graph:root-trust:'+scope;
type Result={root:string;sequence:number;block:string;nodes:number;edges:number;read_at:string;revisions:any[];checkpoint:RootCheckpoint;rpc:RpcCheckpoint};
export function TrustPanel(){
 const [busy,setBusy]=useState(false),[result,setResult]=useState<Result|null>(null),[error,setError]=useState(''),[attack,setAttack]=useState('');
 async function read(){setBusy(true);setResult(null);setError('');setAttack('');try{
  if(!navigator.locks)throw new Error('This browser cannot safely coordinate persistent checkpoints. Use a browser with Web Locks support.');
  await navigator.locks.request(storageKey,{mode:'exclusive'},async()=>{
  const stored=localStorage.getItem(storageKey),saved=stored?JSON.parse(stored):null;
  if(saved&&(saved.schema!=='arkiv.graph-client-checkpoint.v1'||!saved.root||!saved.rpc))throw new Error('Saved checkpoint is malformed.');
  const prior=saved?{root:rootCheckpointSchema.parse(saved.root),rpc:rpcCheckpointSchema.parse(saved.rpc)}:null;
  const response=await fetch('/api/trust',{cache:'no-store',signal:AbortSignal.timeout(45000)});if(!response.ok)throw new Error('Current root evidence could not be read.');
  const data=liveSchema.parse(await response.json());if(data.scope_digest!==scope)throw new Error('Unexpected root evidence.');
  const verified=await verifyRootRevisions({config:pinned,revisions:data.revisions,checkpoint:prior?.root});
  // This shipped demonstration has a pinned minimum revision. It does not assert discovery of all future revisions.
  if(verified.checkpoint.sequence<2||verified.root!==data.root)throw new Error('Required published revision is missing.');
  const graph=await createGraphKit().assembleGraph(data.graph.records,verified.root,[pinned.authority]);
  if(data.graph.block!==data.block)throw new Error('Graph and root registry snapshots differ.');
  const value=digestJson({revisions:verified.revisions,graph});if(value!==data.value_digest)throw new Error('Snapshot digest mismatch.');
  const rpc=verifyRpcObservations({policy:{schema:'arkiv.graph-rpc-policy.v1',scope_digest:scope,providers:[{id:'tiramisu-official',operator:'Arkiv official public RPC'}],minimum_operators:1,max_age_seconds:120},observations:[{provider_id:'tiramisu-official',scope_digest:scope,block:data.block,block_time:data.block_time,read_at:data.read_at,value_digest:value}],checkpoint:prior?.rpc});
  const next=JSON.stringify({schema:'arkiv.graph-client-checkpoint.v1',root:verified.checkpoint,rpc:rpc.checkpoint});
  localStorage.setItem(storageKey,next);if(localStorage.getItem(storageKey)!==next)throw new Error('Checkpoint could not be retained.');
  setResult({root:verified.root,sequence:verified.checkpoint.sequence,block:data.block,nodes:graph.nodes.length,edges:graph.edges.length,read_at:data.read_at,revisions:verified.revisions,checkpoint:verified.checkpoint,rpc:rpc.checkpoint});
  });
 }catch(e){setError(e instanceof Error?e.message:'Current evidence could not be verified.');}finally{setBusy(false);}}
 async function simulate(mode:'rollback'|'tamper'){
  if(!result)return;setAttack('');try{
   const revisions=structuredClone(result.revisions);
   if(mode==='rollback')revisions.pop();else revisions[1].payload.root='sha256:'+'0'.repeat(64);
   await verifyRootRevisions({config:pinned,revisions,checkpoint:result.checkpoint});
   setError('Unexpected acceptance. Do not use this result.');setResult(null);
  }catch{setAttack(mode==='rollback'?'Rollback rejected: this browser already accepted revision 2.':'Tampering rejected: changing the root invalidates its authority signature.');}
 }
 return <section className="trust-panel" aria-labelledby="trust-heading"><div className="trust-intro"><p className="overline">Trust controls · live testnet evidence</p><h1 id="trust-heading">A new root needs<br/>an authorized history.</h1><p className="lead">Read two real signed revisions from Arkiv. Verify their authority, chain and complete graph, then retain this browser’s checkpoint before accepting the update.</p><button className="primary" disabled={busy} onClick={()=>void read()}>{busy?'Verifying current revisions…':'Verify live root updates'}<ArrowRightIcon/></button><p className="small">No wallet or payment. Read-only. Public synthetic evidence. A local checkpoint is retained in this browser.</p></div>
 {error&&<p role="alert" className="notice">Verification refused: {error}</p>}
 <div className="trust-steps"><article><span>01</span><h2>Pin the authority</h2><p>The bootstrap fixes the producer, chain, graph profile and policy. A revision cannot replace that policy or choose its own signer.</p><code>{pinned.authority}</code></article><article><span>02</span><h2>Verify the update</h2><p>Every revision commits to its previous root and signed revision. The selected root must reconstruct a complete signed graph at the same RPC block.</p><p className="small">Two revisions · eight actual Arkiv entities · one testnet transaction.</p></article><article><span>03</span><h2>Remember what was seen</h2><p>The browser retains the last accepted revision and block. The two-client demo separately retains verified withdrawals so a later omission cannot restore that same review.</p><a href="/two-client/">Check the withdrawal demo <ArrowRightIcon/></a></article></div>
 {busy&&<p role="status" className="trust-status">Reading the registry and graph at one explicit block. Checking signatures and local history…</p>}
 {result&&<div className="trust-result" role="status"><p className="overline"><CheckIcon/> Verified and checkpoint retained</p><h2>Revision {result.sequence} accepted</h2><dl><div><dt>Observed block</dt><dd>{result.block}</dd></div><div><dt>Complete graph</dt><dd>{result.nodes} nodes · {result.edges} edge</dd></div><div><dt>Provider assurance</dt><dd>One configured operator</dd></div><div><dt>Verified at</dt><dd>{new Date(result.read_at).toLocaleString()}</dd></div></dl><code>{result.root}</code><div className="actions"><button className="secondary" onClick={()=>void simulate('rollback')}>Test an older signed revision</button><button className="secondary" onClick={()=>void simulate('tamper')}>Test a changed root</button></div>{attack&&<p className="trust-rejected" role="status">{attack} These local simulations make no chain writes.</p>}</div>}
 <div className="trust-limits"><h2>What this does—and what still needs trust</h2><p>Signatures authenticate the chosen roots. Block-pinned reads prevent mixed-page snapshots. Local checkpoints reject previously observed rollback; verified withdrawal evidence persists for returning two-client readers.</p><p>The current public deployment uses one Arkiv RPC operator. It does not verify a cryptographic state or query proof. A provider could withhold a newer revision or an unseen withdrawal from a fresh reader. Clearing browser storage loses local history. The SDK can compare separately configured operators, but this demo does not claim a live independent quorum.</p></div>
 <div className="actions"><a className="secondary" href="/data/root-update-publication.json">Actual transaction and signed revisions <ExternalLinkIcon/></a><a className="secondary" href="/data/trust-safeguards.json">Adversarial evidence <ExternalLinkIcon/></a><a className="secondary" href="/data/rpc-capabilities.json">RPC capability probe <ExternalLinkIcon/></a><a className="secondary" href="https://github.com/AjnasNB/arkiv-graph/blob/main/docs/TRUST_SETUP.md">SDK setup <ExternalLinkIcon/></a></div>
 </section>;
}
