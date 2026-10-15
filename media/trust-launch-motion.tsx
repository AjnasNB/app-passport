import React, {CSSProperties, ReactNode} from 'react';
import {AbsoluteFill, Freeze, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';

/** Original, seek-safe native scenes. Captured UI is always a real recording. */
type Cut = {file: string; start: number; duration: number; width: number; height: number;
  crop: {x: number; y: number; width: number; height: number};
  camera?: {at:number;x:number;y:number;width:number;height:number}[]; evidence_kind: string};
type Revision = {payload: {sequence: number; previous_root: string; root: string; issuer: string; previous_revision_digest: string}};
export type FilmEvidence = {
  art?: string | null;
  captures: Record<'ai' | 'root-read' | 'root-controls' | 'two-client-refusal' | 'mobile', Cut>;
  root: {entities: number; transactions: number; tx_hash: string; confirmed_block: string;
    revisions: Revision[]; config: {authority: string; genesis_root: string; registry_id: string; policy_digest: string}};
  trust: {passed: number; total: number; live: {provider_count: number; block: string; revision_count: number}};
  mobile: {sample_count: number; routes: {route: string; before: number; after: number; lcp_ms: number}[]};
  npm: {packages: {name: string; version: string; published: boolean; reviewed_tarball_match: boolean}[]};
  ai: {model: string; source_count: number; chars: number; cases: number; selected_nodes: number; total_nodes: number; graph_digest: string};
  session: {id: string; withdrawal: {tx_hash: string; created_at_block: string | number};
    observations: {consumer: string; phase: string; block?: string; admission: {allowed: boolean; status: string}}[]};
};

const C = {forest: '#102A24', ink: '#163A30', ivory: '#F6F3EC', paper: '#FFFDF8', jade: '#99DAB0', amber: '#E2B966', muted: '#4B6558'};
const ease = (x: number) => 1 - (1 - x) ** 3;
const p = (f: number, a: number, b: number) => ease(Math.max(0, Math.min(1, (f - a) / (b - a))));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const short = (s: string, n = 14) => s.replace(/^sha256:/, '').slice(0, n) + '…';
const plate = {border: '1px solid #102A2438', background: C.paper, boxShadow: '0 23px 46px #102a2414'};

function Text({children, x, y, size = 60, width, style}: {children: ReactNode; x: number; y: number; size?: number; width?: number; style?: CSSProperties}) {
  return <div style={{position: 'absolute', left: x, top: y, width, fontSize: size, lineHeight: 1.08,
    letterSpacing: size >= 60 ? '-.045em' : '-.015em', fontWeight: 540, ...style}}>{children}</div>;
}

function Stage({children, label, dark = false, footer}: {children: ReactNode; label: string; dark?: boolean; footer?: string}) {
  return <AbsoluteFill style={{background: dark ? C.forest : C.ivory, color: dark ? C.ivory : C.forest,
    fontFamily: 'DM Sans', overflow: 'hidden'}}>
    <Text x={92} y={68} size={32} style={{fontWeight: 450, color: dark ? C.jade : C.muted, letterSpacing: '.005em'}}>{label}</Text>
    <Text x={1570} y={68} size={32} width={258} style={{textAlign: 'right'}}>Arkiv Graph</Text>
    {children}
    {footer && <Text x={92} y={984} size={32} width={1736} style={{fontWeight: 450, color: dark ? '#C7DECE' : C.muted}}>{footer}</Text>}
  </AbsoluteFill>;
}

function Check({color = C.forest, progress = 1, size = 54}: {color?: string; progress?: number; size?: number}) {
  return <svg width={size} height={size} viewBox="0 0 54 54"><path d="M10 28 22 40 45 13" fill="none" stroke={color}
    strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1-progress}/></svg>;
}
function Cross({color = C.amber, size = 54}: {color?: string; size?: number}) {
  return <svg width={size} height={size} viewBox="0 0 54 54"><path d="M13 13 41 41M41 13 13 41" stroke={color} strokeWidth="4" strokeLinecap="round"/></svg>;
}
function Lock({color = C.jade, width = 72}: {color?: string; width?: number}) {
  return <svg width={width} height={width} viewBox="0 0 72 72"><path d="M21 30V22C21 1 51 1 51 22V30" stroke={color} strokeWidth="4" fill="none"/>
    <rect x="13" y="30" width="46" height="35" rx="8" fill="none" stroke={color} strokeWidth="4"/><path d="M36 42V54" stroke={color} strokeWidth="4" strokeLinecap="round"/></svg>;
}

function Path({d, f, a = 0, b = 40, color = C.jade, dash = false, width = 3}: {d: string; f: number; a?: number; b?: number; color?: string; dash?: boolean; width?: number}) {
  return <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" pathLength="1"
    strokeDasharray={dash ? '.018 .016' : '1'} strokeDashoffset={dash ? -f*.0007 : 1-p(f,a,b)} opacity={dash ? p(f,a,b) : 1}/>;
}

function Orb({x, y, r = 28, color = C.jade, ring = false, alpha = 1}: {x: number; y: number; r?: number; color?: string; ring?: boolean; alpha?: number}) {
  return <g opacity={alpha}><circle cx={x} cy={y} r={r} fill={ring ? C.forest : color} stroke={color} strokeWidth={ring ? 4 : 0}/>
    {ring && <circle cx={x} cy={y} r={r*.36} fill={color}/>}</g>;
}

function NodeMesh({f, x = 0, y = 0, scale = 1, dark = true, detach = false}: {f: number; x?: number; y?: number; scale?: number; dark?: boolean; detach?: boolean}) {
  const points = [[0,0],[-310,-135],[-275,205],[260,-230],[350,110],[37,302],[-557,40],[592,-57]];
  const links = [[0,1],[0,2],[0,3],[0,4],[0,5],[1,6],[2,6],[3,7],[4,7],[1,3],[2,5]];
  const color = dark ? C.jade : C.forest;
  const cut = detach ? p(f, 70, 110) : 0;
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    {links.map(([a,b],i)=><Path key={i} d={`M${points[a][0]} ${points[a][1]} Q${(points[a][0]+points[b][0])/2} ${points[b][1]} ${points[b][0]+(b===4?cut*70:0)} ${points[b][1]}`}
      f={f} a={i*3} b={40+i*3} color={a===0&&b===4&&detach?C.amber:color} width={3} dash={a===0&&b===4&&detach}/>)}
    {points.map(([a,b],i)=><Orb key={i} x={a+(i===4?cut*70:0)} y={b} r={i===0?54:29} color={i===4&&detach?C.amber:color} ring={i%3===0} alpha={p(f,i*4,i*4+20)}/>)}
    {[0,1,2].map(i=>{const q=((f+i*38)%138)/138;return <circle key={i} cx={mix(-310,260,q)} cy={-135-95*Math.sin(q*Math.PI)} r="8" fill={dark?C.ivory:C.amber} opacity={p(f,34,55)}/>;})}
  </g>;
}

function Hook({f, e}: {f: number; e: FilmEvidence}) {
  const detach = p(f,78,122);
  return <Stage dark label="Process illustration · the stale-approval problem" footer="The question is current authorization, not whether the bytes still hash correctly.">
    {e.art && <AbsoluteFill style={{opacity:.11, transform:`scale(${mix(1.1,1.19,p(f,0,240))})`}}><Img src={staticFile(e.art)} style={{width:'100%',height:'100%',objectFit:'cover'}}/></AbsoluteFill>}
    <svg width="1920" height="1080" style={{position:'absolute',inset:0,opacity:.5}}><NodeMesh f={f} x={1450} y={570} scale={1.18} detach/></svg>
    <Text x={92} y={215} size={127} width={1100}>Approval can<br/>go stale.</Text>
    <div style={{position:'absolute',left:95,top:640,width:650,height:205,border:'2px solid #99DAB066',borderRadius:22,background:C.ink,transform:`perspective(1200px) rotateY(${mix(0,-5,detach)}deg)`}}>
      <Text x={30} y={28} size={35} style={{color:C.jade}}>Same bytes</Text><Text x={30} y={91} size={57}>Different decision.</Text>
      <div style={{position:'absolute',right:28,top:28}}><Check color={C.jade}/></div>
      <div style={{position:'absolute',inset:0,border:`3px solid ${C.amber}`,borderRadius:22,opacity:detach}}/>
    </div>
    <Text x={1125} y={837} size={44} style={{color:C.amber,opacity:detach}}>Recheck before the next task.</Text>
  </Stage>;
}

function Infrastructure({f}: {f: number}) {
  const camera = p(f,170,285);
  return <Stage label="Architecture illustration · Arkiv storage + SDK graph layer" footer="Arkiv indexes entities. The SDK assembles, verifies and traverses the graph.">
    <Text x={92} y={155} size={96}>Shared records.<br/>Connected evidence.</Text>
    <svg width="1920" height="1080" style={{position:'absolute',inset:0}}>
      <g transform={`translate(${mix(0,-160,camera)} 0) scale(${mix(1,1.1,camera)})`}>
        {[0,1,2].map(i=><g key={i} transform={`translate(${200+i*18} ${490+i*45})`} opacity={p(f,i*12,24+i*12)}><rect width="375" height="125" rx="14" fill={i===2?C.forest:'#E4E9E0'} stroke={C.forest} strokeWidth="2"/>
          <path d="M25 35H240M25 61H314M25 87H280" stroke={i===2?C.jade:'#9BAC9D'} strokeWidth="5" strokeLinecap="round"/></g>)}
        <Path d="M650 650H875" f={f} a={55} b={105} color={C.forest}/>
        <g transform="translate(879 469)" opacity={p(f,66,96)}><rect width="360" height="322" rx="20" fill={C.paper} stroke={C.forest} strokeWidth="2"/>
          <path d="M42 65H290M42 116H211M42 169H260M42 222H160" stroke={C.forest} strokeWidth="6" strokeLinecap="round"/>
          <g transform={`translate(276 219) scale(${mix(.6,1,p(f,100,134))})`}><circle r="49" fill={C.jade}/><path d="M-24 0-6 18 27-22" fill="none" stroke={C.forest} strokeWidth="5" strokeLinecap="round"/></g></g>
        <Path d="M1245 650H1445" f={f} a={117} b={160} color={C.forest}/>
        <NodeMesh f={f-112} x={1618} y={630} scale={.38} dark={false}/>
      </g>
    </svg>
    <Text x={215} y={850} size={42}>Indexed entities</Text>
    <Text x={900} y={895} size={42}>Signed manifest</Text>
    <Text x={1454} y={850} size={42}>Local graph</Text>
    <Text x={1265} y={320} size={32} width={525} style={{color:C.muted,opacity:p(f,170,205)}}>Complete membership, then bounded traversal.</Text>
  </Stage>;
}

function Recording({cut, targetSeconds, x = 92, y = 300, width = 1736, height = 650, scaleMotion = false}: {
  cut: Cut; targetSeconds: number; x?: number; y?: number; width?: number; height?: number; scaleMotion?: boolean}) {
  const f=useCurrentFrame();
  let crop=cut.crop;
  if(cut.camera?.length){
    const seconds=f/30;
    const left=[...cut.camera].reverse().find(point=>point.at<=seconds)??cut.camera[0];
    const right=cut.camera.find(point=>point.at>seconds)??left;
    const t=right===left?0:p(seconds,left.at,right.at);
    crop={x:mix(left.x,right.x,t),y:mix(left.y,right.y,t),width:mix(left.width,right.width,t),height:mix(left.height,right.height,t)};
  }
  const scale= Math.min(width/crop.width,height/crop.height);
  const rate=Math.max(.75,Math.min(1.25,cut.duration/targetSeconds));
  const naturalHold=Math.max(0,Math.floor(cut.duration/rate*30)-2);
  // Stay inside OffthreadVideo's trimmed range when a short portrait clip is
  // intentionally held through the longer lab-chart scene.
  const holdFrame=cut.file.startsWith('mobile')?Math.min(280,naturalHold):naturalHold;
  return <div style={{position:'absolute',left:x,top:y,width,height,border:'1px solid #102A2448',borderRadius:21,overflow:'hidden',background:'#E4EAE1',boxShadow:'0 23px 46px #102a2418',
    transform:scaleMotion?`perspective(1800px) rotateY(${mix(-2,0,p(f,0,45))}deg) translateY(${mix(10,0,p(f,0,45))}px)`:undefined}}>
    <div style={{position:'absolute',left:(width-crop.width*scale)/2,top:(height-crop.height*scale)/2,width:crop.width*scale,height:crop.height*scale,overflow:'hidden'}}>
      <Freeze frame={Math.min(f,holdFrame)}><OffthreadVideo muted src={staticFile(cut.file)} trimBefore={Math.round(cut.start*30)} trimAfter={Math.round((cut.start+cut.duration)*30)} playbackRate={rate}
        style={{position:'absolute',width:cut.width*scale,height:cut.height*scale,maxWidth:'none',left:-crop.x*scale,top:-crop.y*scale}}/></Freeze>
    </div>
  </div>;
}

function AI({f,e}: {f:number;e:FilmEvidence}) {
  return <Stage label="Recorded live application · AI Passport reference app" footer="Hosted Llama 3.2 inference · project-generated receipt · provider computation is not attested.">
    <Text x={92} y={155} size={91}>Useful AI, grounded in source.</Text>
    <Text x={92} y={261} size={32} style={{fontWeight:450,color:C.muted}}>Coding guards  ·  Exact rupee tools  ·  UPI learning game</Text>
    <Recording cut={e.captures.ai} targetSeconds={12} y={310} height={530} scaleMotion/>
    <svg width="1920" height="1080" style={{position:'absolute',inset:0}}><Path d="M275 905H1651" f={f} a={28} b={103} color={C.forest}/>
      {[275,704,1149,1651].map((x,i)=><circle key={x} cx={x} cy={905} r="10" fill={i===3?C.amber:C.forest} opacity={p(f,29+i*23,44+i*23)}/>)}</svg>
    {[['Source bytes',92],['Bounded context',545],['Hosted model',1030],['6 guard cases',1483]].map(([label,x],i)=><Text key={label} x={Number(x)} y={869} size={33}
      style={{background:C.ivory,padding:'10px 18px 10px 0',opacity:p(f,22+i*23,40+i*23),fontWeight:450}}>{label}</Text>)}
  </Stage>;
}

function Lifecycle({f,e}: {f:number;e:FilmEvidence}) {
  const withdrawn=p(f,100,169),aRead=p(f,0,80),bRead=p(f,40,120);
  const nextB=p(f,174,244),nextA=p(f,245,320),after=f>=320;
  return <Stage dark label="Historical testnet observations · process illustration" footer="Project-controlled readers and wallets · deterministic guard checks, not model inference.">
    <Text x={92} y={155} size={99}>The next task checks again.</Text>
    <Text x={92} y={300} size={42} style={{color:after?C.amber:C.jade}}>Before: both admitted · Next: both refused</Text>
    <svg width="1920" height="1080" style={{position:'absolute',inset:0}}>
      <Path d="M390 552H829M960 552H1513" f={f} a={0} b={58}/>
      <g opacity={withdrawn}><path d="M914 429 858 539 923 539 864 672" stroke={C.amber} fill="none" strokeWidth="7" strokeLinecap="round"/>
        <circle cx="914" cy="552" r="130" stroke={C.amber} strokeWidth="2" strokeDasharray="8 12" fill={C.forest}/>
        <path d="M872 510 954 592M954 510 872 592" stroke={C.amber} strokeWidth="7" strokeLinecap="round"/></g>
      {[{x:390,read:aRead,next:nextA},{x:1513,read:bRead,next:nextB}].map(({x,read,next})=><g key={x} transform={`translate(0 ${mix(135,0,read)})`} opacity={read}>
        <circle cx={x} cy={552} r={mix(72,90,read)} stroke={next>.9?C.amber:C.jade} fill={C.ink} strokeWidth="3"/></g>)}
      {f>=174&&f<245&&<g transform={`translate(${mix(1513,914,nextB)} 552)`}><rect x="-62" y="-39" width="124" height="78" rx="13" fill={C.amber}/><path d="M-35-13 0 12 35-13" fill="none" stroke={C.forest} strokeWidth="4"/></g>}
      {f>=245&&f<321&&<g transform={`translate(${mix(390,914,nextA)} 552)`}><rect x="-62" y="-39" width="124" height="78" rx="13" fill={C.amber}/><path d="M-35-13 0 12 35-13" fill="none" stroke={C.forest} strokeWidth="4"/></g>}
    </svg>
    <Text x={368} y={516+mix(135,0,aRead)} size={63} style={{opacity:aRead}}>A</Text><Text x={1491} y={516+mix(135,0,bRead)} size={63} style={{opacity:bRead}}>B</Text>
    <Text x={200} y={707} size={41} style={{color:C.jade,opacity:aRead}}>Before: admitted</Text>
    <Text x={1323} y={707} size={41} style={{color:C.jade,opacity:bRead}}>Before: admitted</Text>
    {[{x:195,q:nextA},{x:1318,q:nextB}].map(({x,q})=><div key={x} style={{position:'absolute',left:x+mix(x<1000?-400:400,0,q),top:779,width:445,height:102,
      border:'2px solid #E2B966',borderRadius:14,background:'#2B3A2B',opacity:q,transform:`perspective(800px) rotateX(${mix(-25,0,q)}deg)`}}><Text x={23} y={24} size={40} style={{color:C.amber}}>Next read: refused</Text></div>)}
    <Text x={700} y={744} size={39} width={450} style={{textAlign:'center',color:C.amber,opacity:withdrawn}}>Review withdrawn</Text>
    <Text x={92} y={904} size={32} style={{color:'#C7DECE'}}>Actual transaction {short(e.session.withdrawal.tx_hash,23)} · one completed historical session</Text>
  </Stage>;
}

function RevisionPlate({x,y,index,f,e}: {x:number;y:number;index:number;f:number;e:FilmEvidence}) {
  const r=e.root.revisions[index],show=p(f,index*55+64,index*55+100);
  return <div style={{position:'absolute',left:x,top:y,width:550,height:310,border:'2px solid #99DAB089',borderRadius:22,background:C.ink,
    opacity:show,transform:`perspective(1400px) rotateY(${mix(-9,0,show)}deg) translateY(${mix(28,0,show)}px)`}}>
    <Text x={30} y={28} size={34} style={{color:C.jade}}>Signed revision {r.payload.sequence}</Text>
    <svg width="550" height="190" style={{position:'absolute',left:0,top:0}}>
      {index===1&&<Path d="M66 137H178" f={f} a={index*55+98} b={index*55+126}/>}
      <Orb x={index===0?105:66} y={137} r={24} ring/>
      {index===1&&<Orb x={178} y={137} r={24} alpha={p(f,index*55+115,index*55+139)}/>}
    </svg>
    <Text x={index===0?165:232} y={113} size={index===0?49:38}>{index===0?'1 node':'2 nodes · 1 edge'}</Text>
    <Text x={30} y={187} size={32} style={{fontWeight:450}}>root {short(r.payload.root,18)}</Text>
    <Text x={30} y={244} size={32} style={{fontWeight:450,color:'#C7DECE'}}>Previous root + revision digest</Text>
  </div>;
}

function Roots({f,e}: {f:number;e:FilmEvidence}) {
  const camera=p(f,345,465),saved=p(f,290,334);
  return <Stage dark label="Process illustration · two actual signed revisions" footer="Both revisions and their tiny synthetic graphs were published together in one transaction.">
    <Text x={92} y={155} size={96}>Authorize change.<br/>Remember history.</Text>
    <div style={{position:'absolute',left:92,top:437,width:398,height:337,border:'2px solid #E2B96699',borderRadius:22,background:'#2B3A2B'}}>
      <div style={{position:'absolute',left:31,top:29}}><Lock color={C.amber}/></div><Text x={30} y={123} size={43}>Pinned authority</Text>
      <Text x={30} y={189} size={32} style={{color:C.amber,fontWeight:450}}>{short(e.root.config.authority,17)}</Text>
      <Text x={30} y={258} size={32}>Chain · registry · policy</Text>
    </div>
    <svg width="1920" height="1080" style={{position:'absolute',inset:0}}>
        <defs><mask id="root-checkpoint-reserve"><rect width="1920" height="1080" fill="white"/>
          <rect x="615" y="810" width="640" height="140" rx="18" fill="black"/>
        </mask></defs>
      <Path d="M493 586H621" f={f} a={39} b={78}/><Path d="M1171 586H1265" f={f} a={113} b={154}/>
        <g mask="url(#root-checkpoint-reserve)"><Path d="M1538 765V862H869" f={f} a={211} b={277} color={C.amber}/></g>
    </svg>
    <RevisionPlate x={620} y={440} index={0} f={f} e={e}/><RevisionPlate x={1265} y={440} index={1} f={f} e={e}/>
    {f>=360&&<div style={{position:'absolute',left:620,top:440,width:1195,height:320,border:'2px solid #99DAB089',borderRadius:22,background:C.ink,
      opacity:p(f,360,396),transform:`translateX(${mix(90,0,p(f,360,423))}px)`}}>
      <Text x={30} y={28} size={38} style={{color:C.jade}}>Selected revision 2 · complete membership</Text>
      <svg width="1195" height="260" style={{position:'absolute',left:0,top:0}}>
        <Path d="M250 153H887" f={f} a={405} b={497}/><Orb x={220} y={153} r={31} ring/>
        <Orb x={918} y={153} r={31} alpha={p(f,455,497)}/>
        {f>=477&&f<=550&&<rect x={mix(265,859,p(f,477,550))} y="131" width="54" height="43" rx="8" fill={C.amber}/>}
      </svg>
      <Text x={95} y={210} size={34}>Public handoff</Text><Text x={719} y={210} size={34}>Review requirement</Text>
      <Text x={30} y={272} size={32} style={{fontWeight:450,color:'#C7DECE',opacity:p(f,500,548)}}>Manifest + 2 nodes + 1 edge → retained checkpoint</Text>
      {f>=480&&<div style={{position:'absolute',inset:0,borderRadius:20,background:C.ink,opacity:p(f,480,519),transform:`translateY(${mix(100,0,p(f,480,552))}px)`}}>
        <div style={{position:'absolute',left:65,top:85}}><Check size={150} color={C.jade} progress={p(f,496,548)}/></div>
        <Text x={278} y={65} size={38} style={{color:C.jade}}>Keep the selected head locally</Text><Text x={278} y={135} size={56}>Sequence 2 retained</Text>
        <Text x={278} y={230} size={32} style={{fontWeight:450}}>The AI graph keeps its original pinned root.</Text>
      </div>}
    </div>}
    <div style={{position:'absolute',left:625,top:815,width:620,height:116,border:'2px solid #E2B96699',borderRadius:17,background:'#2B3A2B',opacity:saved,
      transform:`translateY(${mix(12,0,saved)}px) scale(${mix(1,1.025,camera)})`}}><Text x={28} y={26} size={36}>Saved checkpoint: sequence 2</Text>
      <div style={{position:'absolute',right:23,top:23}}><Check color={C.amber}/></div></div>
    <Text x={1282} y={872} size={32} width={550} style={{color:C.jade,opacity:p(f,385,420),fontWeight:450}}>Authorizes root selection.<br/>Does not certify the source truth.</Text>
    <Text x={92} y={855} size={32} width={450} style={{color:C.amber,opacity:p(f,394,430),fontWeight:450}}>Separate demo registry.<br/>AI graph remains pinned.</Text>
  </Stage>;
}

function RootRead({e}: {e:FilmEvidence}) {
  return <Stage label="Recorded live application · actual current RPC read" footer="Two registry revisions + complete graph membership · one provider, explicit snapshot.">
    <Text x={92} y={155} size={93}>Read the real registry.</Text>
    <Recording cut={e.captures['root-read']} targetSeconds={8} scaleMotion/>
  </Stage>;
}
function RootControls({e}: {e:FilmEvidence}) {
  return <Stage label="Recorded application · controlled signed-evidence replay" footer="Observed rollback + root-byte tampering · local test controls, not a real provider attack.">
    <Text x={92} y={155} size={93}>Rollback or tampering? Refuse.</Text>
    <Text x={92} y={258} size={32} style={{fontWeight:450,color:C.muted}}>Keep the accepted checkpoint. Reject the altered candidate.</Text>
    <Recording cut={e.captures['root-controls']} targetSeconds={8} scaleMotion/>
  </Stage>;
}

function Journal({f}: {f:number}) {
  const phase=p(f,112,162),check=p(f,208,245),locked=p(f,318,354),race=p(f,420,457);
  return <Stage dark label="Process illustration · controlled withdrawal safeguards" footer="Protection follows observed history. Clearing local storage loses that history.">
    <Text x={92} y={155} size={98}>A withdrawal is not forgotten.</Text>
    <svg width="1920" height="1080" style={{position:'absolute',inset:0}}>
      <Path d="M485 525H741M1210 525H1482" f={f} a={24} b={93}/>
      <Path d="M958 707V836H1510V708" f={f} a={277} b={330} color={C.amber}/>
      <g transform={`translate(${mix(334,927,p(f,30,94))} 524)`} opacity={1-p(f,94,112)}><rect x="-103" y="-67" width="206" height="134" rx="14" fill={C.amber}/><path d="M-46-25 46 25M46-25-46 25" stroke={C.forest} strokeWidth="5"/></g>
    </svg>
    <div style={{position:'absolute',left:94,top:385,width:390,height:320,border:'2px solid #99DAB07A',borderRadius:21,background:C.ink}}>
      <Text x={28} y={31} size={36} style={{color:C.jade}}>Incoming evidence</Text>
      <Text x={28} y={108} size={48}>{phase>.5?'Review appears':'Target missing'}</Text>
      <Text x={28} y={211} size={32} style={{fontWeight:450}}>Signed withdrawal first</Text>
    </div>
    <div style={{position:'absolute',left:740,top:385,width:470,height:320,border:'2px solid #E2B96699',borderRadius:21,background:'#2B3A2B'}}>
      <Text x={29} y={31} size={36} style={{color:C.amber}}>Persistent journal</Text>
      <Text x={29} y={108} size={48}>Retain withdrawal</Text>
      <Text x={29} y={211} size={32} style={{fontWeight:450}}>Persist before admission</Text>
      <div style={{position:'absolute',right:29,top:37,opacity:p(f,94,115)}}><Check color={C.amber}/></div>
    </div>
    <div style={{position:'absolute',left:1480,top:385,width:345,height:320,border:'2px solid #E2B96699',borderRadius:21,background:'#2B3A2B',opacity:check}}>
      <div style={{position:'absolute',left:30,top:35}}><Cross/></div><Text x={30} y={114} size={51}>Refuse</Text>
      <Text x={30} y={215} size={32}>Matched on return</Text>
    </div>
    <div style={{position:'absolute',left:92,top:801,width:1124,height:125,border:'1px solid #99DAB070',borderRadius:18,background:C.ink,opacity:locked}}>
      <div style={{position:'absolute',left:28,top:23}}><Lock width={68}/></div>
      <Text x={121} y={27} size={36}>One shared browser lock</Text><Text x={121} y={76} size={32} style={{fontWeight:450,color:'#C7DECE'}}>Read → merge → persist → decide</Text>
    </div>
    <Text x={1320} y={868} size={34} width={500} style={{color:C.amber,opacity:race,fontWeight:450}}>Persistence fails?<br/>The task stays blocked.</Text>
  </Stage>;
}

function Refusal({e}: {e:FilmEvidence}) {
  return <Stage label="Recorded live application · new read of the public session" footer="Historical acceptance is history. Current withdrawal refuses the next task.">
    <Text x={92} y={155} size={97}>Fresh reads still refuse.</Text>
    <Recording cut={e.captures['two-client-refusal']} targetSeconds={14} scaleMotion/>
  </Stage>;
}

function Mobile({f,e}: {f:number;e:FilmEvidence}) {
  const names:Record<string,string>={overview:'Overview',context:'AI context','two-client':'Two-client',twoClient:'Two-client'};
  const focus=p(f,335,424);
  return <Stage label="Project-run simulated mobile lab audit · Lighthouse 13.5" footer="18 audits · 3-run medians per route and release · simulated desktop lab, not physical-phone or field data.">
    <Text x={92} y={155} size={95}>Measured in a mobile lab.</Text>
    <div style={{position:'absolute',left:92,top:400,width:1135,height:570,transformOrigin:'0% 70%',transform:`scale(${mix(1,1.04,focus)})`}}>
      {[0,25,50,75,100].map(n=><div key={n} style={{position:'absolute',left:65,top:470-n*3.64,width:1024,borderTop:'1px solid #102A2420'}}><span style={{position:'absolute',left:-55,top:-16,fontSize:32,color:C.muted}}>{n}</span></div>)}
      {e.mobile.routes.map((route,i)=>{const x=140+i*352,beforeGrow=p(f,0,60),grow=p(f,60+i*70,130+i*70);return <React.Fragment key={route.route}>
        <div style={{position:'absolute',left:x,top:470-route.before*beforeGrow*3.64,width:78,height:route.before*beforeGrow*3.64,background:'#BFCBBE',borderRadius:'8px 8px 0 0'}}/>
        <div style={{position:'absolute',left:x+94,top:470-route.after*grow*3.64,width:mix(106,i===2?146:106,focus),height:route.after*grow*3.64,background:C.forest,borderRadius:'8px 8px 0 0',opacity:i<2?mix(1,.48,focus):1}}/>
        <Text x={x-2} y={479-route.before*beforeGrow*3.64-51} size={40} width={82} style={{textAlign:'center',fontWeight:450,color:C.muted,opacity:beforeGrow}}>{route.before}</Text>
        <Text x={x+93} y={479-route.after*grow*3.64-68} size={57} width={108} style={{textAlign:'center',opacity:grow}}>{route.after}</Text>
        <Text x={x-53} y={500} size={34} width={300} style={{textAlign:'center',fontWeight:450}}>{names[route.route]??route.route}</Text>
      </React.Fragment>;})}
    </div>
    <div style={{position:'absolute',left:92,top:274,width:1135,height:96,borderRadius:15,background:C.forest,color:C.ivory,opacity:p(f,340,402),
      clipPath:`inset(0 ${(1-p(f,340,425))*100}% 0 0)`}}><Text x={25} y={12} size={34}>Two-client: signature checks retained.</Text><Text x={25} y={56} size={32} style={{color:C.jade,fontWeight:450}}>Historical verification moved into a worker.</Text></div>
    <div style={{position:'absolute',left:1412,top:324,width:330,height:584,border:'7px solid #102A24',borderRadius:42,background:C.paper,overflow:'hidden',boxShadow:'0 25px 46px #102A2418'}}>
      <Recording cut={e.captures.mobile} targetSeconds={16} x={0} y={0} width={330} height={584}/>
    </div>
    <Text x={1247} y={915} size={32} width={580} style={{textAlign:'center',color:C.muted}}>Recorded mobile viewport</Text>
    <div style={{position:'absolute',left:185,top:392,display:'flex',gap:45,fontSize:32}}><span style={{color:C.muted}}>Before</span><span>After optimization</span></div>
  </Stage>;
}

function WhyArkiv({f}: {f:number}) {
  const gather=p(f,160,250),bypass=p(f,232,323),direct=p(f,300,390);
  return <Stage dark label="Architecture illustration · shared discovery beyond one application" footer="A similar public protocol could support this design. Arkiv supplies its indexed entity layer.">
    <Text x={92} y={155} size={109}>Why Arkiv?</Text>
    <Text x={92} y={298} size={36} style={{color:C.jade,fontWeight:450}}>Private database: its operator controls discovery.</Text>
    <svg width="1920" height="1080" style={{position:'absolute',inset:0}}>
      <NodeMesh f={f-82} x={963} y={610} scale={.63}/>
      <Path d="M94 471H518Q572 471 610 523L784 601" f={f} a={20} b={103} color={C.amber}/>
      <Path d="M1145 610H1447Q1502 610 1502 555V464H1812" f={f} a={136} b={220}/>
      <Path d="M1145 610H1447Q1502 610 1502 667V778H1812" f={f} a={180} b={266}/>
      <g transform={`translate(${mix(1075,1567,p(f,190,275))} ${mix(610,466,p(f,190,275))})`} opacity={f>=190&&f<276?1:0}><rect x="-60" y="-39" width="120" height="78" rx="13" fill={C.amber}/><path d="M-37-13 0 14 37-13" fill="none" stroke={C.forest} strokeWidth="4"/></g>
      <g transform={`translate(${mix(1075,1567,p(f,277,378))} ${mix(610,780,p(f,277,378))})`} opacity={f>=277&&f<379?1:0}><rect x="-60" y="-39" width="120" height="78" rx="13" fill={C.amber}/><path d="M-37-13 0 14 37-13" fill="none" stroke={C.forest} strokeWidth="4"/></g>
    </svg>
    <div style={{position:'absolute',left:92,top:390,width:434,height:354,border:'1px solid #E2B96670',borderRadius:21,background:'#2B3A2B',transform:`translateX(${mix(0,-610,bypass)}px) rotateY(${mix(0,-14,bypass)}deg)`}}>
      <Text x={29} y={31} size={38} style={{color:C.amber}}>One hash</Text><Text x={29} y={102} size={50}>Identifies bytes.</Text>
      <Text x={29} y={212} size={33} width={365} style={{color:'#E6D8B9',fontWeight:450}}>It does not discover a current signed review.</Text>
    </div>
    <div style={{position:'absolute',left:92,top:390,width:434,height:354,border:'2px solid #99DAB089',borderRadius:21,background:C.ink,
      opacity:direct,transform:`translateX(${mix(-90,0,direct)}px)`}}><Text x={29} y={31} size={36} style={{color:C.jade}}>Direct RPC reader</Text><Text x={29} y={107} size={47}>Our API<br/>can be bypassed.</Text>
      <Text x={29} y={255} size={32} style={{fontWeight:450}}>Local signature verification</Text></div>
    <Text x={720} y={827} size={47} width={520} style={{textAlign:'center'}}>Public indexed records</Text>
    {['SDK reader','Another application'].map((label,i)=><div key={label} style={{position:'absolute',left:1450,top:397+i*314,width:375,height:145,border:'1px solid #99DAB080',borderRadius:18,background:C.ink,
      opacity:p(f,163+i*38,202+i*38),transform:`translateX(${mix(25,0,gather)}px)`}}><Text x={25} y={35} size={36}>{label}</Text><Text x={25} y={93} size={32} style={{color:C.jade,fontWeight:450}}>Verify locally</Text></div>)}
    <Text x={92} y={823} size={33} width={520} style={{color:C.amber,fontWeight:450}}>Independent of our API.<br/>Still dependent on the RPC.</Text>
  </Stage>;
}

function Npm({f,e}: {f:number;e:FilmEvidence}) {
  const graph=e.npm.packages.find(p=>p.name==='@ajnasnb/arkiv-graph')!;
  const passport=e.npm.packages.find(p=>p.name==='@ajnasnb/ai-passport')!;
  const unpack=p(f,145,225);
  return <Stage label="Verified public registry releases · installation is not outside adoption" footer="Public MIT source · exact package bytes checked · reproducible schema, queries and evidence.">
    <Text x={92} y={155} size={106}>Install. Reproduce. Build.</Text>
    <div style={{position:'absolute',left:92,top:359,width:1736,height:342,borderRadius:22,background:C.forest,color:C.ivory,overflow:'hidden',boxShadow:'0 27px 56px #102A241B',
      transformOrigin:'50% 0%',transform:`translateY(${mix(0,-80,unpack)}px) scale(${mix(1,.92,unpack)})`}}>
      <Text x={36} y={33} size={32} style={{color:C.jade,fontWeight:450}}>Public npm releases</Text>
      {[graph,passport].map((v,i)=><Text key={v.name} x={36} y={103+i*103} size={61} style={{fontWeight:500,whiteSpace:'nowrap',clipPath:`inset(0 ${(1-p(f,12+i*47,63+i*47))*100}% 0 0)`}}>npm i {v.name}@{v.version}</Text>)}
    </div>
    <svg width="1920" height="1080" style={{position:'absolute',inset:0}}><Path d="M960 625V666M960 666H356M960 666H1566" f={f} a={196} b={274} color={C.forest}/></svg>
    {[{name:'Core graph',entry:'@ajnasnb/arkiv-graph'},{name:'AI context',entry:'/context'},{name:'Root trust',entry:'/trust'}].map((v,i)=>{const q=p(f,208+i*35,282+i*27);return <div key={v.name} style={{position:'absolute',left:92+i*609,top:706,width:518,height:210,
      ...plate,borderRadius:18,opacity:q,transform:`perspective(1200px) translateY(${mix(105,0,q)}px) rotateX(${mix(-20,0,q)}deg)`}}><Text x={29} y={31} size={40}>{v.name}</Text>
      <Text x={29} y={115} size={i===0?33:45} style={{color:C.muted,fontWeight:450}}>{v.entry}</Text></div>;})}
  </Stage>;
}

function Close({f,e}: {f:number;e:FilmEvidence}) {
  return <Stage dark label="Current trust boundary · testnet demonstration" footer="arkivgraph.ajnasnb.com  ·  github.com/AjnasNB/arkiv-graph">
    <svg width="1920" height="1080" style={{position:'absolute',inset:0,opacity:.28}}><NodeMesh f={f} x={1540} y={568} scale={.68}/></svg>
    <Text x={92} y={188} size={115}>Trust has a boundary.</Text>
    <Text x={94} y={399} size={53} width={1300}>One live RPC provider.</Text>
    <Text x={94} y={499} size={53} width={1400}>Metadata and query completeness are trusted.</Text>
    <div style={{position:'absolute',left:94,top:647,width:1425,height:145,borderTop:'2px solid #E2B96699',opacity:p(f,37,59)}}>
      <Text x={0} y={31} size={47} style={{color:C.amber}}>Unseen omissions are not solved.</Text>
    </div>
    <Text x={94} y={835} size={51} style={{color:C.jade,opacity:p(f,75,104)}}>Inspect the evidence. Build your reader.</Text>
  </Stage>;
}

export function TrustLaunch({evidence}: {evidence:FilmEvidence}) {
  return <AbsoluteFill>
    <Sequence from={0} durationInFrames={240}><Scene render={f=><Hook f={f} e={evidence}/>}/></Sequence>
    <Sequence from={240} durationInFrames={360}><Scene render={f=><Infrastructure f={f}/>}/></Sequence>
    <Sequence from={600} durationInFrames={360}><Scene render={f=><AI f={f} e={evidence}/>}/></Sequence>
    <Sequence from={960} durationInFrames={360}><Scene render={f=><Lifecycle f={f} e={evidence}/>}/></Sequence>
    <Sequence from={1320} durationInFrames={600}><Scene render={f=><Roots f={f} e={evidence}/>}/></Sequence>
    <Sequence from={1920} durationInFrames={240}><RootRead e={evidence}/></Sequence>
    <Sequence from={2160} durationInFrames={240}><RootControls e={evidence}/></Sequence>
    <Sequence from={2400} durationInFrames={540}><Scene render={f=><Journal f={f}/>}/></Sequence>
    <Sequence from={2940} durationInFrames={420}><Refusal e={evidence}/></Sequence>
    <Sequence from={3360} durationInFrames={480}><Scene render={f=><Mobile f={f} e={evidence}/>}/></Sequence>
    <Sequence from={3840} durationInFrames={420}><Scene render={f=><WhyArkiv f={f}/>}/></Sequence>
    <Sequence from={4260} durationInFrames={360}><Scene render={f=><Npm f={f} e={evidence}/>}/></Sequence>
    <Sequence from={4620} durationInFrames={240}><Scene render={f=><Close f={f} e={evidence}/>}/></Sequence>
  </AbsoluteFill>;
}

function Scene({render}:{render:(frame:number)=>ReactNode}) {
  const frame=useCurrentFrame();
  return <>{render(frame)}</>;
}
