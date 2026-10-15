import React, {CSSProperties, ReactNode} from 'react';
import {AbsoluteFill, Easing, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';

/** Native, scene-local 24 s chapter. The parent Sequence starts this at the film's 32 s mark. */
export type JourneyEvidence = {
  model: string;
  graph_digest: string;
  graph_read_block: string;
  read_block: string;
  memory_chars: number;
  evidence_message_sha256: string;
  model_evidence: {
    contentRole: 'untrusted-data';
    selected_events: Array<{id: string; title: string; excerpt: string}>;
    sources: Array<{path: string; digest: string; text: string}>;
    tool_result: unknown;
  };
  graph_selection: {nodes: number; edges: number; total_nodes: number};
  coding: {passed: boolean; cases: unknown[]};
};

export type JourneyProps = {evidence: JourneyEvidence; captureStart?: number};

const C = {forest: '#102A24', ivory: '#F6F3EC', jade: '#99DAB0', amber: '#D9AF5E'};
const ease = Easing.bezier(.22, 1, .36, 1);
const p = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const span = (f: number, a: number, b: number, c: number, d: number) => p(f, a, b) * (1 - p(f, c, d));
const digest = (s: string, n = 14) => s.replace(/^sha256:/, '').slice(0, n);
const basename = (s: string) => s.split(/[\\/]/).filter(Boolean).pop() || s;
const number = (n: number) => n.toLocaleString('en-US');
const sourceLabel = (n: number) => `${n} source${n === 1 ? '' : 's'}`;
const paperShadow = '0 24px 64px rgba(16,42,36,.12), 0 4px 12px rgba(16,42,36,.04)';

function Text({children, x, y, size = 54, width, style}: {children: ReactNode; x: number; y: number; size?: number; width?: number; style?: CSSProperties}) {
  return <div style={{position: 'absolute', left: x, top: y, width, fontSize: size, lineHeight: 1.08, letterSpacing: size >= 60 ? '-.045em' : '-.025em', fontWeight: 550, ...style}}>{children}</div>;
}

function Check({progress = 1, size = 54, color = C.forest}: {progress?: number; size?: number; color?: string}) {
  return <svg width={size} height={size} viewBox="0 0 64 64"><path d="M13 33 27 47 52 18" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - progress}/></svg>;
}

function DocumentGlyph({color = C.forest}: {color?: string}) {
  return <svg width="92" height="108" viewBox="0 0 92 108"><path d="M16 5H58L78 25V102H16Z M58 5V25H78 M28 44H65 M28 59H65 M28 74H56" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function Arrow({f, a, b, x1, x2, y, dark = false}: {f: number; a: number; b: number; x1: number; x2: number; y: number; dark?: boolean}) {
  const t = p(f, a, b);
  return <svg width="1920" height="1080" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
    <path d={`M${x1} ${y}H${x2}`} fill="none" stroke={dark ? C.jade : C.forest} strokeOpacity={.36} strokeWidth="3" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - t}/>
    <path d={`M${x2 - 12} ${y - 9}L${x2} ${y}L${x2 - 12} ${y + 9}`} fill="none" stroke={dark ? C.jade : C.forest} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity={p(f, b - 10, b)}/>
    <g transform={`translate(${mix(x1, x2 - 12, t)} ${y})`} opacity={span(f, a, a + 8, b - 5, b + 8)}>
      <rect x="-14" y="-11" width="28" height="22" rx="4" fill={C.amber}/><path d="M-10-6 0 1 10-6" stroke={C.forest} strokeWidth="2" fill="none"/>
    </g>
  </svg>;
}

function FoldedSheet({x, y, w = 380, h = 340, children, accent = C.amber, opacity = 1, transform}: {x: number; y: number; w?: number; h?: number; children?: ReactNode; accent?: string; opacity?: number; transform?: string}) {
  return <div style={{position: 'absolute', left: x, top: y, width: w, height: h, opacity, transform, filter: 'drop-shadow(0 18px 22px rgba(16,42,36,.10))'}}>
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{position: 'absolute', inset: 0}}>
      <path d={`M18 1H${w - 56}L${w - 1} 56V${h - 18}Q${w - 1} ${h - 1} ${w - 18} ${h - 1}H18Q1 ${h - 1} 1 ${h - 18}V18Q1 1 18 1Z`} fill="#FFFDF8" stroke="rgba(16,42,36,.26)" strokeWidth="2"/>
      <path d={`M${w - 56} 1V40Q${w - 56} 56 ${w - 40} 56H${w - 1}`} fill={accent} fillOpacity=".3" stroke="rgba(16,42,36,.26)" strokeWidth="2"/>
    </svg>
    {children}
  </div>;
}

function SourceRoute({f, evidence}: {f: number; evidence: JourneyEvidence}) {
  const leave = p(f, 167, 180);
  const sourceCount = evidence.model_evidence.sources.length;
  const nodes = [
    {x: 98, w: 300, at: 0, label: 'Pinned root', kind: 'root'},
    {x: 542, w: 300, at: 30, label: 'Coding task', kind: 'task'},
    {x: 986, w: 300, at: 70, label: 'Review', kind: 'review'},
    {x: 1430, w: 398, at: 110, label: sourceLabel(sourceCount), kind: 'source'},
  ];
  return <AbsoluteFill style={{opacity: 1 - leave, transform: `translateY(${-34 * leave}px)`}}>
    <Text x={92} y={160} size={88}>Follow the task to its sources.</Text>
    <Arrow f={f} a={26} b={60} x1={398} x2={542} y={568}/>
    <Arrow f={f} a={66} b={100} x1={842} x2={986} y={568}/>
    <Arrow f={f} a={106} b={140} x1={1286} x2={1430} y={568}/>
    {nodes.map((n, i) => {
      const enter = p(f, n.at, n.at + 25);
      return <div key={n.kind} style={{position: 'absolute', left: n.x, top: mix(459, 414, enter), width: n.w, height: 308, opacity: enter, transform: `scale(${mix(.88, 1, enter)})`}}>
        {n.kind === 'source' ? <FoldedSheet x={0} y={0} w={n.w} h={308}>
          <div style={{position: 'absolute', left: 35, top: 30}}><DocumentGlyph/></div>
          <div style={{position: 'absolute', left: 35, bottom: 31, fontSize: 52, letterSpacing: '-.045em', fontWeight: 550}}>{n.label}</div>
        </FoldedSheet> : <>
          <div style={{position: 'absolute', inset: 0, background: n.kind === 'root' ? C.forest : '#FFFDF8', border: `2px solid ${n.kind === 'root' ? C.forest : 'rgba(16,42,36,.25)'}`, borderRadius: n.kind === 'task' ? 67 : n.kind === 'review' ? 22 : 28, boxShadow: paperShadow, clipPath: n.kind === 'review' ? 'polygon(12% 0,88% 0,100% 13%,100% 87%,88% 100%,12% 100%,0 87%,0 13%)' : undefined}}/>
          <svg width={n.w} height="308" style={{position: 'absolute', inset: 0}}>
            {n.kind === 'root' && <g fill="none" stroke={C.jade} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M150 49V136M122 66H178L170 103H130Z M137 136H163"/><circle cx="150" cy="92" r="58" strokeOpacity=".2"/></g>}
            {n.kind === 'task' && <g fill="none" stroke={C.forest} strokeWidth="4" strokeLinecap="round"><rect x="105" y="38" width="90" height="109" rx="15"/><path d="M124 88 141 104 175 68 M124 126H174"/></g>}
            {n.kind === 'review' && <g fill="none" stroke={C.forest} strokeWidth="4" strokeLinecap="round"><path d="M108 44H192V116H157L137 135V116H108Z"/><path d="M127 79 143 94 173 61"/></g>}
          </svg>
          <div style={{position: 'absolute', left: 24, right: 24, bottom: 36, fontSize: 52, textAlign: 'center', whiteSpace: 'nowrap', color: i === 0 ? C.ivory : C.forest, letterSpacing: '-.045em', fontWeight: 550}}>{n.label}</div>
        </>}
      </div>;
    })}
    <div style={{position: 'absolute', left: 99, top: 821, display: 'flex', gap: 22, alignItems: 'center', opacity: p(f, 143, 165)}}>
      <div style={{width: 11, height: 11, borderRadius: '50%', background: C.forest}}/>
      <span style={{fontSize: 34}}>{number(evidence.graph_selection.nodes)} selected nodes · {number(evidence.graph_selection.edges)} relationships</span>
    </div>
  </AbsoluteFill>;
}

function BoundEvidence({f, evidence}: {f: number; evidence: JourneyEvidence}) {
  const q = f - 180;
  const show = p(f, 176, 192) * (1 - p(f, 348, 360));
  const sources = evidence.model_evidence.sources;
  const events = evidence.model_evidence.selected_events;
  const source = sources[0];
  const close = p(q, 119, 149);
  const chips = events.slice(0, 3);
  return <AbsoluteFill style={{opacity: show}}>
    <Text x={92} y={160} size={82}>Verify sources. Bound the evidence.</Text>
    <div style={{position: 'absolute', left: 90, top: 385, width: 590, height: 500, transform: `translateX(${-26 * p(q, 128, 166)}px)`}}>
      {[2, 1].map(i => <div key={i} style={{position: 'absolute', left: 65 + i * 18, top: 31 - i * 16, width: 424, height: 418, border: '1px solid rgba(16,42,36,.22)', borderRadius: 18, background: '#ebe9e0', transform: `rotate(${i * 3}deg)`, opacity: p(q, 0, 20)}}/>)}
      <FoldedSheet x={44} y={22} w={452} h={424}>
        <div style={{position: 'absolute', left: 34, top: 31}}><DocumentGlyph/></div>
        <Text x={34} y={169} size={52} width={388}>{sources.length} original<br/>source{sources.length === 1 ? '' : 's'}</Text>
        {source && <Text x={34} y={303} size={32} width={380} style={{fontWeight: 450, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis'}}>{basename(source.path)}</Text>}
        {source && <Text x={34} y={357} size={32} width={390} style={{fontFamily: '"DM Sans", Arial, sans-serif', color: '#567165', fontWeight: 450}}>sha256:{digest(source.digest, 12)}…</Text>}
      </FoldedSheet>
      <svg width="590" height="500" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <path d="M18 139V27Q18 0 45 0H489Q522 0 522 33V449Q522 477 494 477H45Q18 477 18 449V344" fill="none" stroke={C.jade} strokeWidth="6" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - p(q, 16, 51)}/>
      </svg>
      <div style={{position: 'absolute', left: 442, top: 377, width: 94, height: 94, borderRadius: '50%', background: C.jade, border: `4px solid ${C.ivory}`, display: 'grid', placeItems: 'center', opacity: p(q, 43, 57), transform: `scale(${mix(.6, 1, p(q, 43, 60))})`}}><Check progress={p(q, 48, 68)} size={62}/></div>
    </div>
    <svg width="1920" height="1080" style={{position: 'absolute', inset: 0}}>
      <path d="M638 625C760 625 768 557 927 557" fill="none" stroke={C.forest} strokeOpacity=".32" strokeWidth="3" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - p(q, 49, 73)}/>
    </svg>
    <div style={{position: 'absolute', left: 925, top: 374, width: 902, height: 475, opacity: p(q, 30, 57)}}>
      <div style={{position: 'absolute', inset: 0, border: `2px solid ${C.forest}`, background: '#edece2', borderRadius: 23, boxShadow: paperShadow}}/>
      <svg width="902" height="475" style={{position: 'absolute', inset: 0}}><path d="M1 49 451 260 901 49" fill="none" stroke={C.forest} strokeOpacity=".2" strokeWidth="2"/><path d="M1 474 335 253M901 474 567 253" fill="none" stroke={C.forest} strokeOpacity=".13" strokeWidth="2"/></svg>
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 165, transformOrigin: '50% 0%', transform: `perspective(1000px) rotateX(${mix(-76, 0, close)}deg)`, backfaceVisibility: 'hidden'}}><svg width="902" height="165"><path d="M1 0H901L451 164Z" fill={C.jade} stroke={C.forest} strokeWidth="2"/></svg></div>
      <div style={{position: 'absolute', left: 47, right: 47, bottom: 36, height: 166, padding: '23px 28px', boxSizing: 'border-box', border: '1px solid rgba(16,42,36,.15)', borderRadius: 15, background: C.ivory, transform: `translateY(${mix(18, 0, close)}px)`}}>
        <div style={{fontSize: 52, letterSpacing: '-.035em', fontWeight: 550}}>{evidence.model_evidence.contentRole}</div>
        <div style={{fontSize: 33, marginTop: 18, fontWeight: 450}}>{number(evidence.memory_chars)} characters · {sourceLabel(sources.length)}</div>
      </div>
    </div>
    {chips.map((event, i) => {
      const enter = p(q, 63 + i * 11, 108 + i * 10);
      const absorb = p(q, 117 + i * 6, 139 + i * 6);
      const x = mix(512, 1030 + i * 42, enter);
      const y = mix(548 + i * 68, 419 + i * 60, enter) - Math.sin(enter * Math.PI) * (90 + i * 17);
      return <div key={event.id} style={{position: 'absolute', left: x, top: y, width: 580, height: 67, border: `1px solid ${C.forest}`, borderRadius: 12, background: i % 2 ? C.jade : '#FFFDF8', boxShadow: '0 8px 24px rgba(16,42,36,.09)', opacity: span(q, 59 + i * 11, 65 + i * 11, 133 + i * 6, 148 + i * 6), transform: `scale(${mix(1, .9, absorb)}) rotate(${mix(-4 + i * 3, 0, enter)}deg)`, overflow: 'hidden', padding: '14px 20px', boxSizing: 'border-box', fontSize: 32, fontWeight: 500, textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{event.title}</div>;
    })}
    <Text x={132} y={925} size={34} style={{opacity: p(q, 43, 64), fontWeight: 450}}>Source bytes verified</Text>
    <Text x={974} y={925} size={34} style={{opacity: p(q, 128, 151), fontWeight: 450}}>{events.length} selected event{events.length === 1 ? '' : 's'} in the bounded packet</Text>
  </AbsoluteFill>;
}

function RecordedInspector({f, captureStart}: {f: number; captureStart: number}) {
  // Camera coordinates are CSS pixels in the supplied 1600×900 live recording.
  // Reframe the real evidence panel; follow the exact-message disclosure when it opens.
  const scale = 1734 / 948;
  const sourceY = mix(195, 450, p(f, 451, 488));
  return <Sequence name="Recorded exact-evidence inspector" from={360} durationInFrames={180}>
    <AbsoluteFill style={{background: C.ivory, opacity: p(f, 360, 371) * (1 - p(f, 534, 540))}}>
      <Text x={92} y={142} size={78}>Inspect the exact evidence sent.</Text>
      <div style={{position: 'absolute', left: 92, top: 244, width: 1736, height: 740, boxSizing: 'border-box', background: '#e5e9e1', border: '1px solid rgba(16,42,36,.24)', borderRadius: 18, overflow: 'hidden', boxShadow: paperShadow, transform: `translateY(${mix(17, 0, p(f, 360, 378))}px)`}}>
        <OffthreadVideo muted src={staticFile('ai-journey-live.webm')} trimBefore={Math.round(captureStart * 30)} playbackRate={.85} style={{position: 'absolute', width: 1600 * scale, height: 900 * scale, maxWidth: 'none', left: -190 * scale, top: -sourceY * scale}}/>
      </div>
      <Text x={94} y={92} size={32} style={{fontWeight: 450, color: '#456353'}}>Recorded live application</Text>
    </AbsoluteFill>
  </Sequence>;
}

function ModelGlyph({f}: {f: number}) {
  return <svg width="104" height="104" viewBox="0 0 104 104"><g fill="none" stroke={C.jade} strokeWidth="3.5" strokeLinecap="round"><rect x="24" y="24" width="56" height="56" rx="18"/><path d="M38 5V20M66 5V20M38 84V99M66 84V99M5 38H20M5 66H20M84 38H99M84 66H99"/><path d="M38 41H65V63H38Z" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - p(f, 572, 597)}/></g></svg>;
}

function ReceiptFlow({f, evidence}: {f: number; evidence: JourneyEvidence}) {
  const q = f - 540;
  const cases = evidence.coding.cases;
  const passed = evidence.coding.passed;
  const packetEnter = p(q, 0, 24), modelEnter = p(q, 24, 48), validatorEnter = p(q, 60, 84), receiptEnter = p(q, 107, 132);
  return <AbsoluteFill style={{background: C.forest, color: C.ivory, opacity: p(f, 540, 550)}}>
    <Text x={92} y={160} size={88}>Evidence in. Validated output.</Text>
    <Arrow f={q} a={19} b={53} x1={422} x2={540} y={538} dark/>
    <Arrow f={q} a={54} b={85} x1={884} x2={1005} y={538} dark/>
    <Arrow f={q} a={93} b={124} x1={1349} x2={1470} y={538} dark/>
    <div style={{position: 'absolute', left: 92, top: mix(416, 378, packetEnter), width: 330, height: 330, boxSizing: 'border-box', opacity: packetEnter, border: `2px solid ${C.jade}`, borderRadius: 24, background: '#193A30', overflow: 'hidden'}}>
      <svg width="330" height="156"><path d="M1 1H329L165 132Z" fill={C.jade} fillOpacity=".24" stroke={C.jade} strokeWidth="2"/><rect x="138" y="111" width="54" height="39" rx="8" fill={C.jade}/><path d="M150 124H180M150 135H172" stroke={C.forest} strokeWidth="3" strokeLinecap="round"/></svg>
      <Text x={28} y={188} size={52}>Packet</Text><Text x={28} y={260} size={32} style={{fontWeight: 450, color: C.jade}}>{evidence.model_evidence.contentRole}</Text>
    </div>
    <div style={{position: 'absolute', left: 540, top: mix(416, 378, modelEnter), width: 344, height: 330, boxSizing: 'border-box', opacity: modelEnter, border: '1px solid rgba(153,218,176,.5)', borderRadius: 37, background: '#193A30'}}>
      <div style={{position: 'absolute', left: 32, top: 26}}><ModelGlyph f={f}/></div>
      <Text x={28} y={188} size={52}>Llama3.2</Text><Text x={28} y={260} size={32} style={{fontWeight: 450, color: C.jade}}>Hosted model</Text>
    </div>
    <div style={{position: 'absolute', left: 1005, top: mix(416, 378, validatorEnter), width: 344, height: 330, boxSizing: 'border-box', opacity: validatorEnter, border: '1px solid rgba(153,218,176,.5)', borderRadius: 24, background: '#193A30'}}>
      <div style={{position: 'absolute', left: 30, right: 30, top: 31, height: 124, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: 'repeat(2,1fr)', gap: 10}}>
        {cases.slice(0, 6).map((_, i) => <div key={i} style={{border: `1px solid ${passed ? C.jade : C.amber}`, borderRadius: 11, background: passed ? 'rgba(153,218,176,.13)' : 'rgba(217,175,94,.09)', display: 'grid', placeItems: 'center', opacity: p(q, 77 + i * 4, 88 + i * 4), transform: `scale(${mix(.72, 1, p(q, 77 + i * 4, 88 + i * 4))})`}}>{passed ? <Check progress={p(q, 80 + i * 4, 94 + i * 4)} color={C.jade} size={40}/> : <div style={{width: 12, height: 12, background: C.amber, borderRadius: '50%'}}/>}</div>)}
      </div>
      <Text x={28} y={188} size={52}>{cases.length} cases</Text><Text x={28} y={260} size={32} style={{fontWeight: 450, color: C.jade}}>{passed ? 'Validator passed' : 'Validator result'}</Text>
    </div>
    <div style={{position: 'absolute', left: 1470, top: mix(416, 378, receiptEnter), width: 358, height: 330, boxSizing: 'border-box', opacity: receiptEnter, transform: `perspective(1300px) rotateY(${mix(-18, 0, receiptEnter)}deg)`, border: `2px dashed ${C.amber}`, borderRadius: 20, background: '#2A382B'}}>
      <svg width="358" height="165"><path d="M37 30H321M37 57H259M37 84H291" fill="none" stroke={C.amber} strokeOpacity=".4" strokeWidth="5" strokeLinecap="round"/><path d="M37 129H321" fill="none" stroke={C.amber} strokeWidth="2"/></svg>
      <Text x={28} y={188} size={52}>Run receipt</Text><Text x={28} y={260} size={32} style={{fontWeight: 450, color: C.amber}}>Project generated</Text>
    </div>
    <div style={{position: 'absolute', left: 92, top: 811, width: 877, height: 155, borderTop: '2px solid rgba(153,218,176,.6)', opacity: p(q, 23, 44)}}>
      <Text x={0} y={23} size={34} style={{color: C.jade}}>Signed graph + source identity</Text>
      <Text x={0} y={82} size={32} style={{fontWeight: 450}}>graph {digest(evidence.graph_digest, 16)}… · {sourceLabel(evidence.model_evidence.sources.length)}</Text>
    </div>
    <div style={{position: 'absolute', left: 1042, top: 811, width: 786, height: 155, borderTop: `2px dashed ${C.amber}`, opacity: p(q, 129, 153)}}>
      <Text x={0} y={23} size={34} style={{color: C.amber}}>Evidence message SHA-256</Text>
      <Text x={0} y={82} size={32} style={{fontWeight: 450}}>sha256:{digest(evidence.evidence_message_sha256, 20)}…</Text>
    </div>
    <Text x={92} y={952} size={32} style={{fontWeight: 450, color: 'rgba(246,243,236,.75)', opacity: p(q, 105, 129)}}>Provider computation is not attested.</Text>
  </AbsoluteFill>;
}

export function Journey({evidence, captureStart = 0}: JourneyProps) {
  const f = useCurrentFrame();
  const dark = f >= 540;
  return <AbsoluteFill style={{background: C.ivory, color: C.forest, fontFamily: '"DM Sans", Arial, sans-serif', overflow: 'hidden'}}>
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 68% 40%,#FFFDF8 0%,rgba(255,253,248,0) 73%)'}}/>
    {f < 180 && <SourceRoute f={f} evidence={evidence}/>}
    {f >= 176 && f < 360 && <BoundEvidence f={f} evidence={evidence}/>}
    <RecordedInspector f={f} captureStart={captureStart}/>
    {f >= 540 && <ReceiptFlow f={f} evidence={evidence}/>}
    {(f < 360 || f >= 540) && <div style={{position: 'absolute', left: 93, top: 92, fontSize: 32, color: dark ? C.jade : '#456353', letterSpacing: '.005em', fontWeight: 450}}>Process illustration</div>}
    <div style={{position: 'absolute', right: 92, top: 92, fontSize: 32, color: dark ? C.ivory : C.forest, letterSpacing: '-.03em', fontWeight: 550}}>Arkiv Graph</div>
  </AbsoluteFill>;
}
