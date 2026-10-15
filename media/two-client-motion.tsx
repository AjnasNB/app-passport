import React, {CSSProperties, ReactNode} from 'react';
import {AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';

const C = {forest: '#102A24', ivory: '#F6F3EC', jade: '#99DAB0', amber: '#D9AF5E'};
const p = (f: number, a: number, b: number) => {const x = Math.max(0, Math.min(1, (f - a) / (b - a))); return 1 - (1 - x) ** 3;};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const short = (value: string) => value.length > 30 ? value.slice(0, 18) + '…' + value.slice(-8) : value;

export type CaptureCut = {file: string; start: number; duration: number; source_width: number; source_height: number; crop: {x: number; y: number; width: number; height: number}};
export type TwoClientFilmEvidence = {
  session_id: string;
  graph_digest: string;
  withdrawal: {tx_hash: string; entity_key: string; block: string};
  clients: {id: 'A' | 'B'; before: string; after: string; before_block: string; after_block: string}[];
  captures: {accepted: CaptureCut; b_refused: CaptureCut; a_refused: CaptureCut};
  npm: {name: '@ajnasnb/arkiv-graph'; version: '0.3.0'; published: boolean; registry_url: string};
};

function Text({children, x, y, size = 70, width, style = {}}: {children: ReactNode; x: number; y: number; size?: number; width?: number; style?: CSSProperties}) {
  return <div style={{position: 'absolute', left: x, top: y, width, fontSize: size, fontWeight: 550, letterSpacing: '-.035em', lineHeight: 1.07, ...style}}>{children}</div>;
}

function Frame({dark = false, label, children}: {dark?: boolean; label: string; children: ReactNode}) {
  return <AbsoluteFill style={{background: dark ? C.forest : C.ivory, color: dark ? C.ivory : C.forest, fontFamily: 'DM Sans, Arial, sans-serif', overflow: 'hidden'}}>
    <Text x={92} y={68} size={30} style={{fontWeight: 450, color: dark ? C.jade : '#456353', letterSpacing: '.005em'}}>{label}</Text>
    <Text x={1570} y={68} size={30} width={260} style={{textAlign: 'right'}}>Arkiv Graph</Text>
    {children}
  </AbsoluteFill>;
}

function Check({color = C.forest}: {color?: string}) {
  return <svg width="50" height="50" viewBox="0 0 50 50"><path d="M10 26 21 37 41 13" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function ClientWindow({x, y, id, show, refused = false, subtitle}: {x: number; y: number; id: 'A' | 'B'; show: number; refused?: boolean; subtitle?: string}) {
  return <div style={{position: 'absolute', left: x, top: y, width: 440, height: 250, opacity: show, transform: `translateX(${(1 - show) * 30}px)`, border: `2px solid ${refused ? C.amber : C.jade}`, borderRadius: 22, background: '#193A30', boxShadow: '0 23px 42px #00000018'}}>
    <div style={{height: 47, borderBottom: '1px solid #99dab049', display: 'flex', gap: 9, padding: '0 23px', alignItems: 'center'}}>{[0, 1, 2].map(i => <div key={i} style={{width: 9, height: 9, borderRadius: '50%', background: C.jade, opacity: .4}}/>)}</div>
    <Text x={28} y={78} size={46}>Client {id}</Text>
    <Text x={28} y={153} size={33} style={{color: refused ? C.amber : C.jade, fontWeight: 450}}>{subtitle??(refused ? 'Next task refused' : 'Separate reader')}</Text>
    <div style={{position: 'absolute', right: 28, top: 80}}>{refused ? <svg width="48" height="48"><path d="M12 12 36 36M36 12 12 36" stroke={C.amber} strokeWidth="4" strokeLinecap="round"/></svg> : <Check color={C.jade}/>}</div>
  </div>;
}

function Branch({f, evidence}: {f: number; evidence: TwoClientFilmEvidence}) {
  const branch = p(f, 21, 91), a = p(f, 56, 82), b = p(f, 101, 128);
  return <Frame dark label="Process illustration · project-operated reader instances">
    <Text x={92} y={158} size={99}>One graph. Two readers.</Text>
    <svg width="1920" height="1080" style={{position: 'absolute', inset: 0}}>
      <path d="M655 597H970M970 597V437Q970 400 1030 400H1250M970 597V747Q970 784 1030 784H1250" fill="none" stroke={C.jade} strokeWidth="4" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - branch}/>
      <g transform={`translate(400 597) scale(${mix(.95, 1, p(f, 0, 34))})`}>
        <path d="M0-144-155 120H155Z M0 25V-144M0 25-155 120M0 25 155 120" fill="none" stroke={C.jade} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
        {[[0,-144],[-155,120],[155,120]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="24" fill={C.forest} stroke={C.jade} strokeWidth="6"/>)}
        <rect x="-42" y="-17" width="84" height="84" rx="20" fill={C.jade}/>
      </g>
      {[{t:a,x:mix(655,1238,a),y:mix(597,400,a)},{t:b,x:mix(655,1238,b),y:mix(597,784,b)}].map((v,i)=><circle key={i} cx={v.x} cy={v.y} r="13" fill={C.ivory} opacity={v.t>0&&v.t<1?1:0}/>)}
    </svg>
    <ClientWindow id="A" x={1250} y={275} show={p(f, 32, 58)}/>
    <ClientWindow id="B" x={1250} y={659} show={p(f, 77, 103)}/>
    <Text x={155} y={806} size={38}>Same pinned root</Text>
    <Text x={155} y={866} size={31} width={850} style={{color: C.jade, fontWeight: 450}}>{short(evidence.graph_digest)}</Text>
    <Text x={1040} y={954} size={31} style={{opacity: p(f, 84, 106), color: C.jade, fontWeight: 450}}>Project-operated clients · shared RPC provider</Text>
  </Frame>;
}

function LiveWindow({cut, title, beforeTitle, resultAt = 0, label, footer, duration}: {cut: CaptureCut; title: string; beforeTitle?: string; resultAt?: number; label: string; footer: string; duration: number}) {
  const f = useCurrentFrame();
  const scale = 1736 / cut.crop.width;
  return <Frame label={label}>
    <Text x={92} y={151} size={91}>{beforeTitle&&f<resultAt?beforeTitle:title}</Text>
    <div style={{position: 'absolute', left: 92, top: 300, width: 1736, height: 650, border: '1px solid #9bb5a6', background: '#edf1e9', borderRadius: 20, overflow: 'hidden', boxShadow: '0 22px 46px #102a241b', transform: `translateY(${mix(15, 0, p(f, 0, 14))}px)`}}>
      <OffthreadVideo muted src={staticFile(cut.file)} trimBefore={Math.round(cut.start * 30)} playbackRate={Math.min(1.25, cut.duration / duration)} style={{position: 'absolute', width: cut.source_width * scale, height: cut.source_height * scale, maxWidth: 'none', left: -cut.crop.x * scale, top: -cut.crop.y * scale}}/>
    </div>
    <Text x={96} y={985} size={30} style={{fontWeight: 450, color: '#456353'}}>{footer}</Text>
  </Frame>;
}

function Withdraw({f, evidence}: {f: number; evidence: TwoClientFilmEvidence}) {
  const cut = p(f, 38, 66), seal = p(f, 82, 111);
  return <Frame dark label="Process illustration · actual Tiramisu transaction">
    <Text x={92} y={158} size={104}>Withdraw the review.</Text>
    <svg width="1920" height="1080" style={{position: 'absolute', inset: 0}}>
      <path d="M370 611H802" stroke={C.jade} strokeWidth="6" fill="none"/>
      <path d={`M802 611H${mix(1295, 943, cut)}`} stroke={C.jade} strokeWidth="6" fill="none" opacity={1-cut}/>
      <path d="M1065 459 1005 596 1073 596 1013 745" fill="none" stroke={C.amber} strokeWidth="7" strokeLinecap="round" opacity={cut}/>
      <path d="M1099 598H1295" stroke={C.amber} strokeWidth="3" strokeDasharray="12 12" fill="none" opacity={cut}/>
    </svg>
    <div style={{position: 'absolute', left: 95, top: 434, width: 445, height: 356, background: '#193A30', border: '2px solid #99dab09a', borderRadius: 25, transform: `rotate(${mix(0,-6,cut)}deg) translateY(${mix(0,30,cut)}px)`}}>
      <Text x={35} y={31} size={35} style={{color: C.jade}}>Signed review</Text>
      <div style={{position: 'absolute', left: 33, top: 122,opacity:1-cut}}><Check color={C.jade}/></div>
      <svg width="50" height="50" style={{position:'absolute',left:33,top:122,opacity:cut}}><path d="M12 12 38 38M38 12 12 38" stroke={C.amber} strokeWidth="4" strokeLinecap="round"/></svg>
      <Text x={35} y={235} size={48}>Withdrawn</Text>
      <div style={{position: 'absolute', inset: 15, border: '4px solid #d9af5e', borderRadius: 18, opacity: seal, transform: 'rotate(3deg)'}}/>
    </div>
    <ClientWindow id="B" x={1295} y={484} show={1} subtitle="Last read admitted"/>
    <Text x={650} y={357} size={34} width={550} style={{color: C.amber, opacity: p(f, 67, 91), fontWeight: 450}}>The next request reads again</Text>
    <Text x={96} y={876} size={34} style={{color: C.jade, fontWeight: 450}}>Withdrawal block {evidence.withdrawal.block}</Text>
    <Text x={96} y={943} size={31} style={{color: C.ivory, fontWeight: 450}}>Transaction {short(evidence.withdrawal.tx_hash)}</Text>
  </Frame>;
}

function Outcome({f, evidence}: {f: number; evidence: TwoClientFilmEvidence}) {
  const b = evidence.clients.find(c=>c.id==='B')!, a = evidence.clients.find(c=>c.id==='A')!;
  return <Frame dark label="Recorded observations · project-controlled wallets and clients">
    <Text x={92} y={156} size={96}>Recheck before each task.</Text>
    {[{id:'B' as const,x:94,row:b,at:0},{id:'A' as const,x:1004,row:a,at:42}].map(({id,x,row,at})=><React.Fragment key={id}>
      <ClientWindow id={id} x={x} y={405} show={p(f,at,at+25)} refused/>
      <Text x={x+2} y={725} size={35} style={{color:C.jade,opacity:p(f,at+21,at+46)}}>Review read at block {row.after_block}</Text>
    </React.Fragment>)}
    <Text x={96} y={846} size={35} style={{opacity:p(f,34,52),fontWeight:450}}>Six deterministic guard cases. No model inference.</Text>
    <Text x={96} y={913} size={31} style={{color:'#bad3c2',opacity:p(f,47,65),fontWeight:450}}>RPC completeness is trusted.</Text>
    <Text x={96} y={963} size={31} style={{color:'#bad3c2',opacity:p(f,61,79),fontWeight:450}}>Execution is not independently attested.</Text>
  </Frame>;
}

export function TwoClientChapter({evidence}: {evidence: TwoClientFilmEvidence}) {
  const f = useCurrentFrame();
  return <AbsoluteFill>
    {f<180&&<Branch f={f} evidence={evidence}/>}
    <Sequence from={180} durationInFrames={240}><LiveWindow cut={evidence.captures.accepted} beforeTitle="Each client reads for itself." resultAt={75} title="Both clients admit the task." label="Recorded live application · before withdrawal" footer="Same session · separate fresh reads · six deterministic cases each" duration={8}/></Sequence>
    {f>=420&&f<600&&<Withdraw f={f-420} evidence={evidence}/>}
    <Sequence from={600} durationInFrames={150}><LiveWindow cut={evidence.captures.b_refused} beforeTitle="B reads current evidence." resultAt={100} title="B’s next task is refused." label="Recorded live application · after withdrawal becomes visible" footer="Client B’s next request · current review checked before the task" duration={5}/></Sequence>
    <Sequence from={750} durationInFrames={150}><LiveWindow cut={evidence.captures.a_refused} beforeTitle="Now A checks for itself." resultAt={78} title="A’s next task is refused." label="Recorded live application · a second consumer request" footer="Client A makes its own fresh read · no cached admission reused" duration={5}/></Sequence>
    {f>=900&&<Outcome f={f-900} evidence={evidence}/>}
  </AbsoluteFill>;
}

/** Native-motion-only review. It never shows a made-up capture or npm claim. */
export function MotionPreview({evidence, part}: {evidence: TwoClientFilmEvidence; part: 'branch' | 'withdrawal' | 'scope'}) {
  const f=useCurrentFrame();
  return part==='branch'?<Branch f={f} evidence={evidence}/>:part==='withdrawal'?<Withdraw f={f} evidence={evidence}/>:<Outcome f={f} evidence={evidence}/>;
}

export function NpmChapter({evidence}: {evidence: TwoClientFilmEvidence}) {
  const f=useCurrentFrame(),line=p(f,21,57),branch=p(f,95,141);
  return <Frame label="Public SDK · exact registry version">
    <Text x={92} y={158} size={106}>Build your own reader.</Text>
    <div style={{position:'absolute',left:95,top:390,width:1730,height:236,background:C.forest,color:C.ivory,borderRadius:24,overflow:'hidden',boxShadow:'0 25px 55px #102a2420'}}>
      <Text x={42} y={44} size={29} style={{color:C.jade,fontWeight:450}}>npm install</Text>
      <div style={{position:'absolute',left:40,top:102,fontSize:69,letterSpacing:'-.03em',whiteSpace:'nowrap',clipPath:`inset(0 ${(1-line)*100}% 0 0)`}}>npm i @ajnasnb/arkiv-graph@0.3.0</div>
    </div>
    <svg width="1920" height="1080" style={{position:'absolute',inset:0}}><path d="M960 626V712Q960 743 909 743H335M960 743H1569" stroke={C.forest} strokeWidth="3" fill="none" pathLength="1" strokeDasharray="1" strokeDashoffset={1-branch}/></svg>
    {[{x:98,title:'Browser'},{x:751,title:'Node.js'},{x:1405,title:'MCP'}].map((n,i)=><div key={n.title} style={{position:'absolute',left:n.x,top:774,width:417,height:116,border:'1px solid #102a2455',borderRadius:18,display:'flex',alignItems:'center',justifyContent:'center',background:'#fffdf8',fontSize:43,opacity:p(f,92+i*18,117+i*18),transform:`translateY(${mix(16,0,p(f,92+i*18,117+i*18))}px)`}}>{n.title}</div>)}
    <Text x={98} y={950} size={30} style={{fontWeight:450,color:'#456353',opacity:p(f,95,117)}}>Read the graph directly from Arkiv. Verify it locally.</Text>
  </Frame>;
}
