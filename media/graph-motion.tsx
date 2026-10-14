import React, {CSSProperties, ReactNode} from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';

/* All timing is scene-local at 30 fps. The five exports need no props. */
const C = {forest: '#102A24', ivory: '#F6F3EC', jade: '#99DAB0', amber: '#D9AF5E'};
const smooth = (x: number) => x * x * (3 - 2 * x);
const phase = (f: number, a: number, b: number) => smooth(Math.max(0, Math.min(1, (f - a) / (b - a))));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const map = (f: number, range: number[], values: number[]) => interpolate(f, range, values, {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
const fade = (f: number, a: number, b: number, c?: number, d?: number) => phase(f, a, b) * (c === undefined || d === undefined ? 1 : 1 - phase(f, c, d));
const font: CSSProperties = {fontFamily: '"DM Sans", Arial, sans-serif', color: C.forest};
const shadow = '0 22px 50px rgba(16,42,36,.13), 0 3px 9px rgba(16,42,36,.05)';

function Stage({dark = false, children}: {dark?: boolean; children: ReactNode}) {
  return <AbsoluteFill style={{...font, overflow: 'hidden', background: dark ? C.forest : C.ivory, color: dark ? C.ivory : C.forest}}>
    <AbsoluteFill style={{background: dark
      ? 'radial-gradient(ellipse at 72% 20%, rgba(153,218,176,.105), transparent 62%)'
      : 'radial-gradient(ellipse at 64% 28%, #fffdf8 0%, rgba(255,253,248,0) 69%)'}} />
    {children}
  </AbsoluteFill>;
}

function Text({children, x, y, size = 64, width, style = {}}: {children: ReactNode; x: number; y: number; size?: number; width?: number; style?: CSSProperties}) {
  return <div style={{position: 'absolute', left: x, top: y, width, fontSize: size, lineHeight: 1.06, letterSpacing: size > 80 ? '-.055em' : '-.025em', fontWeight: 600, ...style}}>{children}</div>;
}

function Mark({size = 180, color = C.forest, fill = C.jade, progress = 1, ring = false}: {size?: number; color?: string; fill?: string; progress?: number; ring?: boolean}) {
  const nodes = [{x: 100, y: 26}, {x: 36, y: 145}, {x: 164, y: 145}];
  return <svg width={size} height={size} viewBox="0 0 200 200" style={{overflow: 'visible'}}>
    {ring && <circle cx="100" cy="100" r="95" fill="none" stroke={color} strokeOpacity=".18" strokeWidth="1" />}
    <g stroke={color} strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M100 26 L36 145 L164 145 Z" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - progress} />
      {nodes.map((n, i) => <path key={i} d={`M100 99 L${n.x} ${n.y}`} pathLength="1" strokeDasharray="1" strokeDashoffset={1 - progress} strokeWidth="5" />)}
    </g>
    {nodes.map((n, i) => <circle key={i} cx={n.x} cy={n.y} r="16" fill={fill} stroke={color} strokeWidth="5" />)}
    <rect x="77" y="76" width="46" height="46" rx="13" fill={color} />
    <circle cx="100" cy="99" r="8" fill={fill} />
  </svg>;
}

function Brand({dark = false}: {dark?: boolean}) {
  return <div style={{position: 'absolute', left: 94, top: 59, display: 'flex', gap: 15, alignItems: 'center'}}>
    <Mark size={46} color={dark ? C.jade : C.forest} fill={dark ? C.forest : C.ivory} />
    <span style={{fontSize: 28, fontWeight: 600, letterSpacing: '-.03em'}}>Arkiv Graph</span>
  </div>;
}

function Glyph({kind, size = 60, color = C.forest}: {kind: 'source' | 'task' | 'context' | 'browser' | 'sdk' | 'mcp' | 'lock'; size?: number; color?: string}) {
  const stroke = {fill: 'none', stroke: color, strokeWidth: 3.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  return <svg width={size} height={size} viewBox="0 0 64 64">
    {kind === 'source' && <g {...stroke}><path d="M16 7h23l10 11v38H16z" /><path d="M39 7v12h10M23 29h19M23 38h19M23 47h12" /></g>}
    {kind === 'task' && <g {...stroke}><rect x="9" y="10" width="46" height="46" rx="10" /><path d="M20 31l8 8 17-19M21 47h22" /></g>}
    {kind === 'context' && <g {...stroke}><rect x="11" y="13" width="42" height="39" rx="8" /><path d="M21 23h22M21 32h17M21 41h12M8 24H4M8 37H4M56 24h4M56 37h4" /></g>}
    {kind === 'browser' && <g {...stroke}><rect x="5" y="10" width="54" height="45" rx="7" /><path d="M5 23h54M16 17h1M25 17h1M22 39l8 8 14-16" /></g>}
    {kind === 'sdk' && <g {...stroke}><path d="M22 17L6 32l16 15M42 17l16 15-16 15M37 10L27 54" /></g>}
    {kind === 'mcp' && <g {...stroke}><path d="M9 15l17 17L9 49M26 15l17 17-17 17M44 15l13 13M44 49l13-13" /></g>}
    {kind === 'lock' && <g {...stroke}><rect x="14" y="27" width="36" height="30" rx="7" /><path d="M22 27v-9a10 10 0 0 1 20 0v9M32 39v6" /></g>}
  </svg>;
}

function SourceObject({x, y, width = 190, height = 236, rotation = 0, opacity = 1, label, accent = C.amber, scale = 1}: {x: number; y: number; width?: number; height?: number; rotation?: number; opacity?: number; label?: string; accent?: string; scale?: number}) {
  return <div style={{position: 'absolute', left: x - width / 2, top: y - height / 2, width, height, opacity, transform: `rotate(${rotation}deg) scale(${scale})`, background: '#FFFD F8'.replace(' ', ''), borderRadius: 18, boxShadow: shadow, border: '1px solid rgba(16,42,36,.12)', padding: 26, boxSizing: 'border-box'}}>
    <div style={{width: 42, height: 5, borderRadius: 4, background: accent, marginBottom: 20}} />
    <Glyph kind="source" size={54} />
    <div style={{marginTop: 20, width: '90%', height: 6, background: 'rgba(16,42,36,.15)', borderRadius: 5}} />
    <div style={{marginTop: 12, width: '72%', height: 6, background: 'rgba(16,42,36,.11)', borderRadius: 5}} />
    <div style={{marginTop: 12, width: '56%', height: 6, background: 'rgba(16,42,36,.08)', borderRadius: 5}} />
    {label && <div style={{position: 'absolute', bottom: 22, left: 24, fontSize: 19, fontWeight: 600}}>{label}</div>}
  </div>;
}

function Line({d, progress, color = C.jade, width = 5, opacity = 1, dash = false}: {d: string; progress: number; color?: string; width?: number; opacity?: number; dash?: boolean}) {
  return <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" pathLength="1" strokeDasharray={dash ? '.02 .018' : '1'} strokeDashoffset={dash ? 0 : 1 - progress} opacity={opacity} />;
}

function Node({x, y, r = 24, color = C.forest, fill = C.jade, scale = 1}: {x: number; y: number; r?: number; color?: string; fill?: string; scale?: number}) {
  return <g transform={`translate(${x},${y}) scale(${scale})`}><circle r={r + 10} fill={color} opacity=".055" /><circle r={r} fill={fill} stroke={color} strokeWidth="5" /></g>;
}

export function Hook() {
  const f = useCurrentFrame();
  const graph = phase(f, 75, 135);
  const settle = phase(f, 146, 196);
  const nodes = [{x: 1280, y: 290}, {x: 1047, y: 722}, {x: 1513, y: 722}];
  const objects = [
    {x: 1035, y: 259, tx: 1280, ty: 290, rot: -16},
    {x: 1544, y: 250, tx: 1280, ty: 290, rot: 15},
    {x: 1649, y: 589, tx: 1513, ty: 722, rot: 21},
    {x: 1490, y: 879, tx: 1513, ty: 722, rot: -12},
    {x: 1070, y: 872, tx: 1047, ty: 722, rot: 13},
    {x: 924, y: 540, tx: 1047, ty: 722, rot: -18},
  ];
  return <Stage>
    <Brand />
    <Text x={92} y={214} size={184} style={{transform: `translateY(${mix(0, -12, settle)}px)`, fontWeight: 650}}>Arkiv</Text>
    <Text x={92} y={385} size={184} style={{transform: `translateX(${mix(0, 16, settle)}px)`, fontWeight: 650}}>Graph</Text>
    <Text x={103} y={659} size={49} style={{opacity: fade(f, 0, 14), fontWeight: 450}}>Verified context for AI</Text>
    <div style={{position: 'absolute', left: 103, top: 843, display: 'flex', alignItems: 'center', gap: 15, opacity: fade(f, 151, 176)}}>
      <div style={{width: 8, height: 8, borderRadius: 10, background: C.forest}} />
      <span style={{fontSize: 27, letterSpacing: '-.02em'}}>Built on Arkiv</span>
    </div>
    <div style={{position: 'absolute', left: 900, top: 190, width: 775, height: 720, borderRadius: '50%', background: 'radial-gradient(ellipse,rgba(153,218,176,.19),transparent 70%)', opacity: graph}} />
    <svg width="1920" height="1080" style={{position: 'absolute', inset: 0}}>
      <Line d="M1280 290 L1047 722 L1513 722 Z" progress={graph} color={C.forest} width={17} />
      {nodes.map((n, i) => <Line key={i} d={`M1280 555 L${n.x} ${n.y}`} progress={phase(f, 98 + i * 5, 143 + i * 5)} color={C.forest} width={9} />)}
      <g opacity={phase(f, 102, 142)}>
        {nodes.map((n, i) => <Node key={i} x={n.x} y={n.y} r={47} fill={C.ivory} />)}
        <rect x="1198" y="473" width="164" height="164" rx="39" fill={C.forest} />
        <circle cx="1280" cy="555" r="23" fill={C.jade} />
      </g>
    </svg>
    {objects.map((o, i) => {
      const t = phase(f, 28 + i * 5, 98 + i * 5);
      return <SourceObject key={i} x={mix(o.x, o.tx, t)} y={mix(o.y, o.ty, t)} width={148} height={190} rotation={mix(o.rot, 0, t)} scale={mix(1, .28, t)} opacity={1 - phase(f, 91 + i * 5, 123 + i * 5)} />;
    })}
    <Text x={1106} y={860} size={25} width={350} style={{textAlign: 'center', opacity: fade(f, 157, 181), fontWeight: 450}}>Original sources</Text>
  </Stage>;
}

export function Infrastructure() {
  const f = useCurrentFrame();
  const form = phase(f, 14, 104);
  const manifest = phase(f, 123, 169);
  const reject = phase(f, 218, 248);
  const seal = phase(f, 271, 306);
  const cards = [{x: 417, y: 438}, {x: 753, y: 357}, {x: 886, y: 695}, {x: 466, y: 759}];
  const graphPositions = [{x: 336, y: 479}, {x: 715, y: 415}, {x: 839, y: 721}, {x: 426, y: 809}];
  return <Stage dark>
    <Brand dark />
    <Text x={94} y={143} size={116} style={{opacity: 1 - phase(f, 112, 129)}}>Built on Arkiv</Text>
    <Text x={94} y={143} size={116} style={{opacity: phase(f, 129, 149)}}>Complete manifest</Text>
    <div style={{position: 'absolute', left: 1074, top: 105, width: 690, height: 895, background: 'radial-gradient(ellipse,rgba(153,218,176,.10),transparent 68%)', opacity: manifest}} />
    <svg width="1920" height="1080" style={{position: 'absolute', inset: 0}}>
      <g opacity={form}>
        <Line d="M336 479 L715 415 L839 721 L426 809 Z M336 479 L839 721 M715 415 L426 809" progress={phase(f, 63, 121)} width={5} color={C.jade} opacity={.68} />
        <Line d="M564 623 L336 479 M564 623 L715 415 M564 623 L839 721 M564 623 L426 809" progress={phase(f, 92, 139)} color={C.jade} width={6} />
        {graphPositions.map((n, i) => <Node key={i} x={n.x} y={n.y} r={28} color={C.jade} fill={C.forest} scale={phase(f, 52 + i * 10, 77 + i * 10)} />)}
        <rect x="504" y="563" width="120" height="120" rx="29" fill={C.jade} />
        <circle cx="564" cy="623" r="18" fill={C.forest} />
      </g>
      <Line d="M624 623 C868 623 873 458 1138 458" progress={phase(f, 149, 182)} width={6} />
      <Line d="M424 906 C437 828 529 794 547 683" progress={phase(f, 202, 232)} width={5} color={C.amber} opacity={1 - reject * .76} />
    </svg>
    {cards.map((o, i) => {
      const p = phase(f, 15 + i * 8, 80 + i * 8);
      return <SourceObject key={i} x={mix(o.x, graphPositions[i].x, p)} y={mix(o.y + 224, graphPositions[i].y, p)} width={158} height={184} rotation={mix((i % 2 ? 1 : -1) * 9, 0, p)} opacity={fade(f, i * 7, 15 + i * 7, 70 + i * 9, 104 + i * 9)} scale={mix(1, .35, p)} accent={C.jade} />;
    })}
    <div style={{position: 'absolute', left: 1107, top: mix(403, 356, manifest), width: 610, height: 502, border: '1px solid rgba(153,218,176,.33)', background: 'linear-gradient(135deg,#214237,#17352C 70%)', borderRadius: 26, boxShadow: '0 30px 70px rgba(0,0,0,.25)', opacity: manifest, transform: `perspective(1800px) rotateY(${mix(-12, 0, manifest)}deg)`}}>
      <div style={{position: 'absolute', left: 35, top: 35, fontSize: 31, fontWeight: 550}}>Complete manifest</div>
      <div style={{position: 'absolute', right: 32, top: 27}}><Mark size={61} color={C.jade} fill={C.forest} progress={phase(f, 153, 186)} /></div>
      {['Root', 'Members', 'Relationships'].map((label, i) => <div key={label} style={{position: 'absolute', left: 35, right: 35, top: 124 + i * 94, height: 74, display: 'flex', alignItems: 'center', borderTop: '1px solid rgba(153,218,176,.18)', opacity: phase(f, 154 + i * 16, 177 + i * 16)}}>
        <div style={{width: 32, height: 32, border: `2px solid ${C.jade}`, borderRadius: i === 0 ? 9 : 18, marginRight: 20, background: i === 0 ? C.jade : 'transparent'}} />
        <span style={{fontSize: 27, color: C.ivory}}>{label}</span>
        <div style={{marginLeft: 'auto', display: 'flex', gap: 8}}>{[0, 1, 2, 3, 4, 5].map(k => <div key={k} style={{width: k === 3 ? 28 : 12, height: 7, borderRadius: 3, background: 'rgba(153,218,176,.45)'}} />)}</div>
      </div>)}
      <div style={{position: 'absolute', left: 35, right: 35, bottom: 27, display: 'flex', alignItems: 'center', gap: 13, opacity: seal}}>
        <Glyph kind="lock" size={35} color={C.jade} />
        <span style={{fontSize: 25, color: C.jade}}>Graph identity</span>
      </div>
    </div>
    <div style={{position: 'absolute', left: mix(363, 319, reject), top: mix(900, 912, reject), display: 'flex', alignItems: 'center', gap: 19, opacity: fade(f, 190, 207)}}>
      <div style={{width: 90, height: 68, border: `2px solid ${C.amber}`, borderRadius: 14, transform: `rotate(${mix(-5, -11, reject)}deg)`, display: 'grid', placeItems: 'center', background: C.forest}}>
        <svg width="38" height="38" viewBox="0 0 40 40"><path d="M10 10l20 20M30 10L10 30" stroke={C.amber} strokeWidth="4" strokeLinecap="round" opacity={reject} /><path d="M9 20h22" stroke={C.amber} strokeWidth="4" strokeLinecap="round" opacity={1 - reject} /></svg>
      </div>
      <span style={{fontSize: 25, color: C.amber, opacity: reject}}>Member mismatch</span>
    </div>
    <div style={{position: 'absolute', left: 95, top: 321, fontSize: 29, color: C.jade, opacity: fade(f, 50, 81, 122, 147)}}>Connected records</div>
    <div style={{position: 'absolute', left: 1095, top: 906, fontSize: 25, color: 'rgba(246,243,236,.62)', opacity: fade(f, 283, 310)}}>Pinned to the root</div>
  </Stage>;
}

function ObjectCard({x, y, title, kind, dark = false, color = C.jade, width = 310, opacity = 1, scale = 1}: {x: number; y: number; title: string; kind: 'task' | 'context' | 'source' | 'browser' | 'sdk' | 'mcp'; dark?: boolean; color?: string; width?: number; opacity?: number; scale?: number}) {
  return <div style={{position: 'absolute', left: x - width / 2, top: y - 124, width, height: 248, borderRadius: 25, background: dark ? '#193A30' : '#FFFDF8', color: dark ? C.ivory : C.forest, border: dark ? '1px solid rgba(153,218,176,.29)' : '1px solid rgba(16,42,36,.13)', boxShadow: dark ? '0 25px 55px rgba(0,0,0,.17)' : shadow, boxSizing: 'border-box', padding: 33, opacity, transform: `scale(${scale})`}}>
    <div style={{width: 75, height: 75, borderRadius: 19, background: color, display: 'grid', placeItems: 'center'}}><Glyph kind={kind} size={49} /></div>
    <div style={{marginTop: 30, fontSize: 35, fontWeight: 550, letterSpacing: '-.035em', whiteSpace: 'nowrap'}}>{title}</div>
  </div>;
}

export function Context() {
  const f = useCurrentFrame();
  const path = phase(f, 32, 112);
  const inspect = phase(f, 132, 176);
  const compact = phase(f, 224, 278);
  const delivery = phase(f, 280, 319);
  const sourceX = mix(1460, 1280, compact);
  return <Stage>
    <Brand />
    <Text x={93} y={161} size={137}>AI context</Text>
    <Text x={98} y={325} size={30} style={{fontWeight: 450, opacity: fade(f, 9, 25)}}>Task → Context → Original sources</Text>
    <svg width="1920" height="1080" style={{position: 'absolute', inset: 0}}>
      <Line d="M518 573 C685 573 669 573 766 573" progress={phase(f, 37, 70)} color={C.forest} width={6} />
      <Line d="M1074 573 C1225 573 1260 573 1305 573" progress={phase(f, 76, 109)} color={C.forest} width={6} />
      <Line d="M1280 742 C1280 848 1388 867 1487 867" progress={phase(f, 242, 301)} color={C.amber} width={4} opacity={.8} />
      <Line d="M1495 525 L1723 525" progress={delivery} color={C.forest} width={6} />
      <g opacity={1 - compact}>
        <circle cx={mix(518, 766, phase(f, 40, 70))} cy="573" r="12" fill={C.jade} opacity={fade(f, 32, 42, 69, 79)} />
        <circle cx={mix(1074, 1305, phase(f, 80, 115))} cy="573" r="12" fill={C.amber} opacity={fade(f, 75, 85, 115, 123)} />
      </g>
    </svg>
    <ObjectCard x={362} y={573} title="Task" kind="task" scale={mix(.97, 1, phase(f, 0, 33))} />
    <ObjectCard x={920} y={573} title="Context" kind="context" opacity={fade(f, 30, 57)} color={C.jade} scale={mix(.92, 1, path)} />
    <div style={{position: 'absolute', left: sourceX - 151, top: mix(449, 398, compact), width: 310, height: mix(248, 344, compact), border: `1px solid ${C.amber}`, borderRadius: 25, background: '#FFFDF8', boxShadow: shadow, opacity: fade(f, 74, 101), transform: `perspective(1600px) rotateY(${mix(-8, 0, inspect)}deg)`}}>
      <div style={{position: 'absolute', left: 30, top: 27, width: 73, height: 73, background: C.amber, borderRadius: 18, display: 'grid', placeItems: 'center'}}><Glyph kind="source" size={49} /></div>
      <div style={{position: 'absolute', left: 30, top: 134, fontSize: 31, fontWeight: 550, whiteSpace: 'nowrap', opacity: 1 - compact}}>Original sources</div>
      <div style={{position: 'absolute', left: 30, top: 132, fontSize: 31, fontWeight: 550, opacity: compact}}>AI context</div>
      <div style={{position: 'absolute', left: 30, top: 193, right: 30, opacity: inspect}}>
        {[.95, .78, .90].map((w, i) => <div key={i} style={{height: mix(6, 25, compact), marginBottom: mix(0, 13, compact), width: `${w * 100}%`, borderRadius: 5, background: i === 1 ? 'rgba(217,175,94,.26)' : 'rgba(16,42,36,.11)', transform: `translateX(${mix(10 * (i % 2 ? -1 : 1), 0, compact)}px)`}} />)}
      </div>
    </div>
    <div style={{position: 'absolute', left: 1255, top: 753, opacity: fade(f, 143, 169, 230, 250), display: 'flex', alignItems: 'center', gap: 15, color: C.forest}}>
      <div style={{width: 12, height: 12, background: C.amber, borderRadius: 10}} />
      <span style={{fontSize: 28}}>Verify source bytes</span>
    </div>
    <div style={{position: 'absolute', left: 1134, top: 767, opacity: compact}}>
      <div style={{fontSize: 27, fontWeight: 550}}>Bounded evidence</div>
      <div style={{fontSize: 22, marginTop: 12, color: 'rgba(16,42,36,.66)'}}>Untrusted context</div>
    </div>
    <SourceObject x={1560} y={867} width={146} height={170} rotation={mix(10, 3, compact)} opacity={compact} />
    <Text x={1431} y={977} size={23} width={270} style={{textAlign: 'center', opacity: compact, fontWeight: 450}}>Original sources</Text>
    <div style={{position: 'absolute', left: 1649, top: 447, opacity: delivery, width: 148, height: 148, borderRadius: 33, background: C.forest, boxShadow: shadow, display: 'grid', placeItems: 'center', transform: `scale(${mix(.85, 1, delivery)})`}}>
      <svg width="88" height="88" viewBox="0 0 88 88"><g stroke={C.jade} fill="none" strokeWidth="5" strokeLinecap="round"><path d="M44 14v60M14 44h60M23 23l42 42M65 23L23 65" /><circle cx="44" cy="44" r="16" fill={C.forest} /></g></svg>
    </div>
    <div style={{position: 'absolute', left: 256, top: 866, display: 'flex', gap: 15, alignItems: 'center', opacity: fade(f, 248, 275), border: '1px solid rgba(16,42,36,.18)', borderRadius: 16, padding: '15px 23px', background: 'rgba(246,243,236,.75)'}}>
      <Glyph kind="lock" size={32} /><span style={{fontSize: 25}}>Full store · local</span>
    </div>
    <Text x={802} y={795} size={24} width={240} style={{textAlign: 'center', fontWeight: 450, opacity: fade(f, 114, 139, 239, 265)}}>Graph identity</Text>
  </Stage>;
}

export type ReadersProps = {verificationSlot?: ReactNode};
export function Readers({verificationSlot}: ReadersProps = {}) {
  const f = useCurrentFrame();
  const select = phase(f, 170, 203);
  const rootScale = mix(1.08, .94, select);
  const active = map(f, [30, 100, 170, 240, 360], [0, 1, 2, 2, 2]);
  const routes = [
    {d: 'M523 552 C820 552 875 365 1041 365', sx: 35, ex: 91, y: 365, cx1: 820, cy1: 552, cx2: 875},
    {d: 'M523 552 C820 552 827 552 1041 552', sx: 89, ex: 145, y: 552, cx1: 820, cy1: 552, cx2: 827},
    {d: 'M523 552 C820 552 867 739 1041 739', sx: 144, ex: 199, y: 739, cx1: 820, cy1: 552, cx2: 867},
  ];
  return <Stage dark>
    <Brand dark />
    <Text x={94} y={150} size={135} style={{opacity: 1 - phase(f, 149, 167)}}>SDK + MCP</Text>
    <Text x={94} y={150} size={93} style={{opacity: select}}>Choose accepted authors</Text>
    <svg width="1920" height="1080" style={{position: 'absolute', inset: 0}}>
      {routes.map((r, i) => <Line key={i} d={r.d} progress={phase(f, r.sx, r.ex)} color={C.jade} width={5} opacity={.77} />)}
      <Line d="M1557 365 C1689 365 1699 522 1699 572 C1699 686 1621 739 1557 739" progress={phase(f, 222, 284)} color={C.amber} width={3} opacity={.65} />
      {routes.map((r, i) => {
        const t = phase(f, r.sx + 3, r.ex - 2), v = 1 - t;
        const x = v * v * v * 523 + 3 * v * v * t * r.cx1 + 3 * v * t * t * r.cx2 + t * t * t * 1041;
        const y = v * v * v * 552 + 3 * v * v * t * r.cy1 + 3 * v * t * t * r.y + t * t * t * r.y;
        return <circle key={i} cx={x} cy={y} r="11" fill={C.jade} opacity={fade(f, r.sx, r.sx + 7, r.ex - 7, r.ex + 5)} />;
      })}
    </svg>
    <div style={{position: 'absolute', left: 359, top: 388, transform: `scale(${rootScale})`, transformOrigin: 'center'}}><Mark size={328} color={C.jade} fill={C.forest} progress={phase(f, 0, 44)} /></div>
    <Text x={328} y={740} size={32} width={390} style={{textAlign: 'center', opacity: fade(f, 25, 49), color: C.ivory}}>Connected records</Text>
    {['Browser', 'SDK', 'MCP'].map((label, i) => {
      const born = phase(f, 36 + i * 53, 68 + i * 53);
      const x = 1300;
      const y = routes[i].y;
      const bright = 1 - Math.min(1, Math.abs(active - i));
      return <div key={label} style={{position: 'absolute', left: x - 259, top: y - 66, width: 518, height: 131, display: 'flex', alignItems: 'center', gap: 30, padding: '0 31px', boxSizing: 'border-box', borderRadius: 20, background: `rgba(153,218,176,${.07 + bright * .05})`, border: '1px solid rgba(153,218,176,.30)', opacity: born, transform: `translateX(${mix(38, 0, born)}px)`}}>
        <div style={{width: 71, height: 71, borderRadius: 17, background: C.jade, display: 'grid', placeItems: 'center'}}><Glyph kind={i === 0 ? 'browser' : i === 1 ? 'sdk' : 'mcp'} size={43} /></div>
        <span style={{fontSize: 42, letterSpacing: '-.035em', fontWeight: 550}}>{label}</span>
        <div style={{marginLeft: 'auto', width: 12, height: 12, borderRadius: 10, background: C.jade, opacity: .45 + bright * .55}} />
      </div>;
    })}
    <div style={{position: 'absolute', left: 95, top: 864, width: 783, height: 121, display: 'flex', alignItems: 'center', padding: '0 26px', boxSizing: 'border-box', border: '1px solid rgba(153,218,176,.28)', borderRadius: 19, background: '#193A30', opacity: select}}>
      <div style={{width: 288}}><div style={{fontSize: 24, color: C.jade, marginBottom: 13}}>Accepted authors</div><div style={{display: 'flex', gap: 12}}>{[0, 1, 2].map(i => <div key={i} style={{width: 29, height: 29, borderRadius: 50, background: i < 2 ? C.jade : 'transparent', border: `2px solid ${C.jade}`, opacity: i < 2 ? 1 : .28, transform: `scale(${mix(.8, 1, phase(f, 192 + i * 10, 221 + i * 10))})`}} />)}</div></div>
      <div style={{height: 68, width: 1, background: 'rgba(153,218,176,.2)', marginRight: 34}} />
      <div><div style={{fontSize: 24, color: C.jade, marginBottom: 15}}>Graph revision</div><div style={{display: 'flex', alignItems: 'center', gap: 13}}><div style={{width: 45, height: 7, borderRadius: 5, background: C.jade}} /><div style={{width: 110, height: 7, borderRadius: 5, background: 'rgba(153,218,176,.25)'}} /><div style={{width: 25, height: 7, borderRadius: 5, background: 'rgba(153,218,176,.25)'}} /></div></div>
    </div>
    <div style={{position: 'absolute', left: 1041, top: 852, width: 734, height: 157, opacity: fade(f, 200, 225)}}>
      {verificationSlot ? <div style={{width: '100%', height: '100%', overflow: 'hidden', borderRadius: 15, background: '#193A30'}}>{verificationSlot}</div> : <div style={{display: 'flex', width: '100%', gap: 19}}>
        <div style={{flex: 1, height: 123, border: '1px solid rgba(153,218,176,.3)', borderRadius: 17, display: 'flex', gap: 17, alignItems: 'center', padding: '0 23px', background: '#193A30'}}><Mark size={58} color={C.jade} fill={C.forest} /><span style={{fontSize: 24}}>Graph identity</span></div>
        <div style={{flex: 1, height: 123, border: '1px solid rgba(217,175,94,.4)', borderRadius: 17, display: 'flex', gap: 14, alignItems: 'center', padding: '0 23px', background: '#193A30'}}><Glyph kind="source" size={46} color={C.amber} /><span style={{fontSize: 23}}>Original sources</span></div>
      </div>}
    </div>
  </Stage>;
}

export function Close() {
  const f = useCurrentFrame();
  const converge = phase(f, 0, 69);
  const resolve = phase(f, 114, 126);
  const glow = 1 - phase(f, 127, 152);
  return <Stage>
    <svg width="1920" height="1080" style={{position: 'absolute', inset: 0, opacity: 1 - phase(f, 51, 92)}}>
      {[
        'M-130 754 C430 754 558 613 825 522',
        'M2070 760 C1492 760 1313 581 1095 522',
        'M960 -150 C960 65 960 227 960 321',
      ].map((d, i) => <Line key={i} d={d} progress={1} color={C.forest} width={4} opacity={.32} />)}
      <Node x={mix(-120, 825, converge)} y={mix(754, 522, converge)} r={19} fill={C.jade} />
      <Node x={mix(2040, 1095, converge)} y={mix(760, 522, converge)} r={19} fill={C.jade} />
      <Node x={960} y={mix(-80, 321, converge)} r={19} fill={C.jade} />
    </svg>
    <div style={{position: 'absolute', left: 755, top: 245, width: 410, height: 410, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(153,218,176,.32), transparent 70%)', transform: `scale(${1 + resolve * glow * .21})`, opacity: .5 + resolve * glow * .5}} />
    <div style={{position: 'absolute', left: 760, top: 248, transform: `scale(${mix(.91, 1, converge) + resolve * glow * .016})`}}><Mark size={400} color={C.forest} fill={C.jade} progress={phase(f, 0, 53)} /></div>
    <Text x={150} y={663} size={126} width={1620} style={{textAlign: 'center', fontWeight: 650}}>Arkiv Graph</Text>
    <Text x={300} y={844} size={43} width={1320} style={{textAlign: 'center', fontWeight: 450, letterSpacing: '-.025em', opacity: fade(f, 38, 63)}}>arkivgraph.ajnasnb.com</Text>
    <Text x={400} y={970} size={24} width={1120} style={{textAlign: 'center', fontWeight: 450, opacity: fade(f, 66, 83), color: 'rgba(16,42,36,.68)'}}>Built by Ajnas NB</Text>
  </Stage>;
}
