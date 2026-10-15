import React,{useEffect,useRef,useState} from 'react';
import {ArrowRightIcon,CheckIcon,Cross2Icon,DownloadIcon,ExternalLinkIcon,ReloadIcon} from '@radix-ui/react-icons';
import {digestJson} from '@ajnasnb/ai-passport';
import {createTwoClientConsumer,verifyTwoClientSession,type TwoClientReceipt,type TwoClientSession,type TwoClientSubject} from './two-client-model';
import './two-client.css';

const EXPLORER='https://tiramisu.explorer.arkiv.network';
const short=(s:string)=>s.length>29?s.slice(0,16)+'…'+s.slice(-8):s;
const time=(s:string)=>new Date(s).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'medium'});
const statusLabel:Record<string,string>={'requirements-satisfied':'Task admitted',withdrawn:'Review withdrawn',expired:'Review expired',unknown:'Review required',unavailable:'Evidence unavailable','attention-required':'Attention required','stale-context':'Source changed','artifact-mismatch':'Packet changed'};
async function json(url:string){const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(45000)});if(!response.ok)throw new Error('Current evidence unavailable');return response.json() as Promise<unknown>;}
function browserConsumer(id:'A'|'B'){
  return createTwoClientConsumer(id,async(_subject:TwoClientSubject)=>json('/api/two-client/records?consumer='+id));
}

export function TwoClient({openApp}:{openApp:()=>void}){
  const [session,setSession]=useState<TwoClientSession|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [receipts,setReceipts]=useState<Record<'A'|'B',TwoClientReceipt[]>>({A:[],B:[]});
  const [busy,setBusy]=useState<Record<'A'|'B',boolean>>({A:false,B:false});
  const [clockNow,setClockNow]=useState(Date.now());
  const consumers=useRef({A:browserConsumer('A'),B:browserConsumer('B')}),version=useRef(0),activeSession=useRef(''),pendingRequests=useRef({A:false,B:false});
  async function load(){
    const readVersion=++version.current;setLoading(true);setError('');
    try{
      const next=await verifyTwoClientSession(await json('/data/two-client-session.json'));
      if(readVersion!==version.current)return;
      if(activeSession.current!==next.session_id){activeSession.current=next.session_id;consumers.current={A:browserConsumer('A'),B:browserConsumer('B')};pendingRequests.current={A:false,B:false};setReceipts({A:[],B:[]});setBusy({A:false,B:false});}
      setSession(next);
    }catch{if(readVersion===version.current){setSession(null);setError('The signed session report could not be verified. Reload the report to try again.');}}
    finally{if(readVersion===version.current)setLoading(false);}
  }
  useEffect(()=>{void load();return()=>{version.current++;};},[]);
  useEffect(()=>{
    const deadlines=[receipts.A.at(-1),receipts.B.at(-1)].flatMap(r=>r?.admission.allowed&&r.admission.valid_until?[Date.parse(r.admission.valid_until)]:[]).filter(at=>at>Date.now());
    if(!deadlines.length)return;
    const timer=setTimeout(()=>setClockNow(Date.now()),Math.min(Math.min(...deadlines)-Date.now()+10,2147483647));
    return()=>clearTimeout(timer);
  },[receipts,clockNow]);
  async function run(id:'A'|'B'){
    if(!session||pendingRequests.current[id])return;
    pendingRequests.current[id]=true;
    const currentVersion=version.current;
    setBusy(previous=>({...previous,[id]:true}));
    const receipt=await consumers.current[id].request(session);
    pendingRequests.current[id]=false;
    if(currentVersion!==version.current)return;
    setClockNow(Date.now());
    setReceipts(previous=>({...previous,[id]:[...previous[id],receipt]}));
    setBusy(previous=>({...previous,[id]:false}));
  }
  function download(){
    if(!session)return;
    const report={session_id:session.session_id,scope:'Browser-local observations; not a signed execution attestation.',observations:[...receipts.A,...receipts.B]};
    const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)+'\n'],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download='two-client-browser-observations.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <section className="two-client" aria-labelledby="two-client-heading">
    <div className="two-client-heading"><div><h1 id="two-client-heading">One review changes.<br/>Both clients check again.</h1><p>Each consumer reads the signed Arkiv graph, checks the Qarinah coding packet and source bytes, then checks the current session review before running six deterministic release-guard tests.</p>{session?.status==='completed'&&<p className="two-client-completed">The review for this session has already been withdrawn. Fresh reads should refuse the task. The recorded lifecycle below shows both earlier admitted requests and their later refusal.</p>}</div><div className="two-client-actions"><button className="primary" disabled={!session||loading||busy.A||busy.B} onClick={()=>{void Promise.all([run('A'),run('B')]);}}>Read both clients <ArrowRightIcon/></button><button className="two-client-link" disabled={loading||busy.A||busy.B} onClick={()=>void load()}><ReloadIcon/>{loading?'Loading session…':'Reload session report'}</button></div></div>
    {error&&<p className="notice" role="alert">{error}</p>}
    {loading&&!session?<div className="two-client-loading" role="status"><div/><p>Loading and verifying the published session…</p></div>:session?<>
      <div className="two-client-session"><span>Session <code title={session.session_id}>{short(session.session_id)}</code></span><span>Started <time dateTime={session.started_at}>{time(session.started_at)}</time></span><span>{session.status==='accepted'?'Operator paused before withdrawal':session.status==='completed'?'Withdrawal demonstration completed':'Operator run incomplete'}</span></div>
      {session.status==='completed'&&<div className="two-client-proof"><div><strong>Recorded: both admitted → review withdrawn → next requests refused</strong><p>This is the same completed on-chain session, with signed historical snapshots. Your next click makes two new reads; it does not publish or reset the withdrawal.</p></div><a className="two-client-link" href="#recorded-lifecycle">Inspect the before-and-after proof <ArrowRightIcon/></a></div>}
      <div className="two-client-live-heading"><h3>Last request results</h3><p>Each click reads again. A result describes that request at its displayed time. A later withdrawal is checked on the next request.</p></div>
      <div className="two-client-pair">{(['A','B'] as const).map(id=><Consumer key={id} id={id} busy={busy[id]} receipt={receipts[id].at(-1)??null} history={receipts[id]} now={clockNow} run={()=>void run(id)}/>)}</div>
      <p className="two-client-scope">These are separate consumer instances in this browser, operated by this project. They share the configured Tiramisu RPC provider and read-only relay. Both signing wallets are project-controlled. No model inference runs.</p>
      <p className="two-client-next">Want to try a useful AI task? AI Passport checks a separate current review before inference. <button className="two-client-link" onClick={openApp}>Open the coding example <ArrowRightIcon/></button></p>
      {(receipts.A.length>0||receipts.B.length>0)&&<button className="two-client-link" onClick={download}><DownloadIcon/>Download browser observations</button>}
      <div className="two-client-lifecycle" id="recorded-lifecycle" tabIndex={-1}><div><h3>Recorded lifecycle</h3><p>{session.status==='failed'?'Incomplete operator observations, retained for inspection. This run does not establish the completed lifecycle.':'Operator observations from this session. Signed snapshots are rechecked in your browser; this history does not grant current admission.'}</p></div><ol>{session.observations.map((receipt,i)=><li key={i}><span className="two-client-sequence">{i+1}</span><div><strong>Client {receipt.consumer}: {receipt.admission.allowed?'guard task ran':'task refused'}</strong><span>{receipt.phase==='before-withdrawal'?'Before withdrawal':'After withdrawal'} · {statusLabel[receipt.admission.status]||receipt.admission.status}</span><time dateTime={receipt.decision_at}>{time(receipt.decision_at)}</time></div><div className="two-client-lifecycle-block">{receipt.read?<><span>Review block {receipt.read.block}</span><span>Graph block {receipt.read.graph.block}</span></>:<span>Read unavailable</span>}</div></li>)}</ol>{session.status==='accepted'&&<p className="two-client-awaiting">The operator has saved the accepted phase. The withdrawal and the next refused requests will appear after the operator resumes and publishes the updated report.</p>}{session.status==='failed'&&<p className="notice">The operator run stopped at {session.failure_stage||'an incomplete step'}. Its recorded results are retained.</p>}</div>
      <details className="two-client-evidence"><summary>Inspect graph, identities and transactions</summary><div className="two-client-evidence-layout"><dl><div><dt>Pinned reference graph</dt><dd><code>{session.graph.graph_digest}</code></dd></div><div><dt>Verified graph path</dt><dd><code>context:handoff → source:release</code></dd></div><div><dt>Packet SHA-256</dt><dd><code>{session.descriptor.artifact_digest}</code></dd></div><div><dt>Session descriptor SHA-256</dt><dd><code>{digestJson(session.descriptor)}</code></dd></div><div><dt>Session policy SHA-256</dt><dd><code>{digestJson(session.policy)}</code></dd></div><div><dt>Exact public source</dt><dd><a href="/sources/release.ts" target="_blank" rel="noreferrer">Open release.ts <ExternalLinkIcon/></a></dd></div><div><dt>Evidence packet</dt><dd><a href="/data/handoff-packet.json" target="_blank" rel="noreferrer">Open Qarinah packet <ExternalLinkIcon/></a></dd></div></dl><div className="two-client-transactions">{session.transactions.map(tx=><article key={tx.entity_key}><h4>{tx.kind==='passport'?'Producer passport':tx.kind==='review'?'Project review':'Review withdrawal'}</h4><dl><div><dt>Creator</dt><dd><code title={tx.creator}>{short(tx.creator)}</code></dd></div><div><dt>Created at block</dt><dd>{tx.created_at_block}</dd></div><div><dt>Confirmed observation</dt><dd><time dateTime={tx.confirmed_at}>{time(tx.confirmed_at)}</time></dd></div>{tx.envelope.payload.kind==='withdrawal'&&<div><dt>Target review</dt><dd><code>{short(tx.envelope.payload.target_key)}</code></dd></div>}</dl><a href={EXPLORER+'/entity/'+tx.entity_key} target="_blank" rel="noreferrer">Open {tx.kind} entity <ExternalLinkIcon/></a><a href={EXPLORER+'/tx/'+tx.tx_hash} target="_blank" rel="noreferrer">Open {tx.kind} transaction <ExternalLinkIcon/></a></article>)}</div></div><p className="two-client-scope">Signatures establish accepted authorship. Chain metadata, transaction links and complete query results rely on the RPC provider; no state proof is checked. Operator and browser receipts do not attest independent execution.</p><a className="two-client-link" href="/data/two-client-session.json" download><DownloadIcon/>Download signed evidence and operator observations</a></details>
      <details className="two-client-operator"><summary>Repeat with operator wallets</summary><p>Run from the repository with funded Tiramisu testnet wallets. The CLI writes three transactions and pauses after the accepted phase when requested. Public endpoints only read evidence.</p><pre><code>npx tsx scripts/two-client-demo.ts --plan{'\n'}npx tsx scripts/two-client-demo.ts --publish --hold-before-withdrawal</code></pre><p>By default the CLI uses the private operator helper. To use your own two wallets, set <code>TWO_CLIENT_PRODUCER_KEY</code> and <code>TWO_CLIENT_REVIEWER_KEY</code> in your local process. Optional provider settings: <code>TWO_CLIENT_RPC</code> and <code>TWO_CLIENT_API_KEY</code>. The report contains public addresses and signed evidence.</p></details>
    </>:!error&&<p className="notice">A published session is required before either consumer can check current admission.</p>}
  </section>;
}

function Consumer({id,receipt,history,busy,run,now}:{id:'A'|'B';receipt:TwoClientReceipt|null;history:TwoClientReceipt[];busy:boolean;run:()=>void;now:number}){
  const deadlinePassed=Boolean(receipt?.admission.allowed&&receipt.admission.valid_until&&Date.parse(receipt.admission.valid_until)<=now);
  return <article className="two-client-consumer" data-consumer={id} data-state={busy?'checking':receipt?.admission.status??'ready'} aria-labelledby={'consumer-'+id}>
    <div className="two-client-consumer-top"><h4 id={'consumer-'+id}>Client {id}</h4><span>Separate reader · local verifier</span></div>
    <div className="two-client-outcome" aria-live="polite" aria-atomic="true">{busy?<><div className="two-client-read-line"/><strong>Reading current evidence…</strong><p>This request is waiting for its own graph and review read.</p></>:receipt?<><div className={'two-client-status '+(receipt.admission.allowed&&!deadlinePassed?'is-allowed':'is-refused')}>{receipt.admission.allowed&&!deadlinePassed?<CheckIcon/>:<Cross2Icon/>}<strong>{deadlinePassed?'Observation deadline passed':statusLabel[receipt.admission.status]||receipt.admission.status}</strong></div><p>{deadlinePassed?'This earlier request was admitted, but its signed admission deadline has passed. Run this client again for a fresh decision.':receipt.admission.reason}</p><span className="two-client-task-result">{receipt.task_executed?'Recorded result: 6 / 6 deterministic guard cases passed':'Task did not run · evidence not admitted'}</span>{receipt.admission.valid_until&&<span className="two-client-deadline">Admission deadline: <time dateTime={receipt.admission.valid_until}>{time(receipt.admission.valid_until)}</time></span>}</>:<><strong>Ready for its own read</strong><p>Run this client to verify the current graph, source identity and session review.</p></>}</div>
    {!busy&&receipt&&<dl className="two-client-read-facts"><div><dt>Request</dt><dd>#{receipt.request_no} · <time dateTime={receipt.requested_at}>{time(receipt.requested_at)}</time></dd></div><div><dt>Decision</dt><dd><time dateTime={receipt.decision_at}>{time(receipt.decision_at)}</time></dd></div><div><dt>Review read</dt><dd>{receipt.read?<><span>Block {receipt.read.block}</span><br/><time dateTime={receipt.read.read_at}>{time(receipt.read.read_at)}</time></>:'Unavailable'}</dd></div><div><dt>Graph read</dt><dd>{receipt.evidence&&receipt.read?<><span>Block {receipt.evidence.graph_block}</span><br/><time dateTime={receipt.read.graph.read_at}>{time(receipt.read.graph.read_at)}</time></>:'Unverified'}</dd></div><div><dt>Source bytes</dt><dd>{receipt.evidence?`${receipt.evidence.source_files_verified} file checked against packet and graph`:'Unverified'}</dd></div></dl>}
    <button className="secondary" disabled={busy} onClick={run}>Run client {id}<ArrowRightIcon/></button>
    {receipt?.output&&!busy&&<details className="two-client-guard"><summary>Inspect deterministic guard output</summary><pre><code>{receipt.output.code}</code></pre><ul>{receipt.output.cases.map(c=><li key={c.name}><CheckIcon/>{c.name}</li>)}</ul></details>}
    {history.length>1&&<details className="two-client-request-history"><summary>Earlier browser requests ({history.length-1})</summary><ol>{history.slice(0,-1).map(r=><li key={r.request_no}>#{r.request_no} · {statusLabel[r.admission.status]||r.admission.status} · <time dateTime={r.decision_at}>{time(r.decision_at)}</time></li>)}</ol></details>}
  </article>;
}
