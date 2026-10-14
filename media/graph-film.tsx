import React from 'react';
import {AbsoluteFill,Composition,Sequence,registerRoot,useCurrentFrame,interpolate,Easing,staticFile,Html5Audio,OffthreadVideo,Img} from 'remotion';
import {Hook,Infrastructure,Context,Readers,Close} from './motion-scenes';
import {fontData} from './font-data';
import {captureInfo,readerEvidence,sourceEvidence} from './capture-meta';
const C={forest:'#102A24',ivory:'#F6F3EC',jade:'#99DAB0',amber:'#D9AF5E'};
const ramp=(f:number,a:number,b:number,x:number,y:number)=>interpolate(f,[a,b],[x,y],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:Easing.bezier(.22,1,.36,1)});
function ProductShot({kind,duration}:{kind:'coding'|'numbers'|'safety';duration:number}){
 const f=useCurrentFrame(),titles={coding:'A real guard. Six tested boundaries.',numbers:'India numbers. Exact paise.',safety:'Learn to spot a payment trap.'};
 const detail=f>=(kind==='coding'?75:48),scale=detail?(kind==='coding'?1.35:1.5):1.45,left=detail?(kind==='coding'?-1059.75:-292.5):-291,top=detail?(kind==='coding'?-330.75:-337.5):-326;
 return <AbsoluteFill style={{background:C.ivory,color:C.forest,padding:'64px 90px',overflow:'hidden'}}>
  <div style={{fontSize:25,letterSpacing:1.5}}>AI PASSPORT / WORKING REFERENCE APPLICATION</div>
  <h2 style={{fontSize:65,fontWeight:600,letterSpacing:-2.7,margin:'21px 0 0',lineHeight:1.08}}>{titles[kind]}</h2>
  <div style={{position:'absolute',left:90,top:244,width:1740,height:727,overflow:'hidden',borderRadius:19,border:'1px solid #b8ccc0',boxShadow:'0 18px 45px #102a2417',transform:`translateY(${ramp(f,0,14,12,0)}px)`}}>
   <div style={detail?{position:'absolute',left:25,top:35,width:850,height:kind==='safety'?690:620,overflow:'hidden',background:'#f6f9f7'}:{position:'absolute',inset:0,overflow:'hidden'}}><OffthreadVideo muted src={staticFile('live-demo.webm')} trimBefore={Math.round(captureInfo[kind]*30)} playbackRate={kind==='coding'?.68:kind==='numbers'?.75:.72} style={{position:'absolute',width:1600*scale,height:900*scale,maxWidth:'none',left,top}}/></div>
   {detail&&<div style={{position:'absolute',right:0,top:0,bottom:0,width:810,padding:'66px 44px',boxSizing:'border-box',background:C.ivory,borderLeft:'1px solid #b8ccc0'}}><div style={{fontSize:27,color:'#456353'}}>OBSERVED IN THE LIVE APPLICATION</div>{kind==='coding'?<><div style={{fontSize:95,fontWeight:600,letterSpacing:-4,marginTop:36}}>6 / 6 passed</div><div style={{fontSize:48,lineHeight:1.16,marginTop:50}}>Exact hash and<br/>current review</div><div style={{fontSize:48,lineHeight:1.16,marginTop:35}}>Withdrawn review<br/>Request rejected</div></>:kind==='numbers'?<><div style={{fontSize:71,fontWeight:600,letterSpacing:-3,marginTop:52}}>₹2,50,000.75</div><div style={{fontSize:48,lineHeight:1.25,marginTop:55}}>25,000,075 paise</div><div style={{fontSize:38,color:'#456353',marginTop:42}}>Exact integer calculation</div></>:<><div style={{fontSize:65,fontWeight:550,lineHeight:1.08,letterSpacing:-2,marginTop:48}}>Decline<br/>the request</div><div style={{fontSize:49,lineHeight:1.15,marginTop:58}}>NPCI guidance</div><div style={{fontSize:31,lineHeight:1.4,marginTop:31,color:'#456353'}}>A learning simulation.<br/>No payment initiated.</div></>}</div>}
  </div>
  <div style={{position:'absolute',left:94,right:94,bottom:47,display:'flex',justifyContent:'space-between',fontSize:23,color:'#416655'}}><span>Recorded on the live website · original public sources</span><span>arkivgraph.ajnasnb.com</span></div>
 </AbsoluteFill>;
}
function Gate(){const f=useCurrentFrame();return <AbsoluteFill style={{background:C.forest,color:C.ivory,overflow:'hidden'}}>
 <div style={{position:'absolute',left:93,top:65,fontSize:25,color:C.jade}}>CURRENT REVIEW / APPLICATION ADMISSION</div>
 <h2 style={{position:'absolute',left:92,top:142,margin:0,fontSize:112,fontWeight:600,letterSpacing:-5,lineHeight:1.02}}>Withdrawn review.<br/>Inference stopped.</h2>
 <div style={{position:'absolute',left:92,top:481,width:1736,height:368,overflow:'hidden',borderRadius:21,border:'1px solid #68967b',background:'white',transform:`translateY(${ramp(f,0,14,15,0)}px)`}}><Img src={staticFile(f<60?'gate-detail.png':'gate-status.png')} style={{position:'absolute',inset:f<60?0:45,width:f<60?'100%':'calc(100% - 90px)',height:f<60?'100%':'calc(100% - 90px)',objectFit:'contain'}}/></div>
 <div style={{position:'absolute',left:96,top:925,fontSize:29,color:C.jade}}>Actual live response · model call: not started</div>
 </AbsoluteFill>;}
function ReaderProof(){return <div style={{height:'100%',boxSizing:'border-box',padding:'14px 24px',fontSize:28,lineHeight:1.42,color:C.ivory,background:'#193A30',border:'1px solid #527260',borderRadius:17}}>
 <div>Direct RPC · no website backend</div><div style={{color:C.jade,fontWeight:600}}>{readerEvidence.nodes} nodes / {readerEvidence.edges} edges · MCP {readerEvidence.passed}/{readerEvidence.total}</div><div style={{fontSize:22,color:'#b2cdbd'}}>SDK {readerEvidence.version} · fresh package reader</div>
 </div>;}
function InfrastructureBeat(){const f=useCurrentFrame();if(f<165)return <Infrastructure/>;const q=f-165,rejected=q>=90;return <AbsoluteFill style={{background:C.forest,color:C.ivory,padding:'75px 94px',overflow:'hidden'}}>
 <div style={{color:C.jade,fontSize:25}}>SIGNED REVISION / STRUCTURAL VERIFICATION</div><h2 style={{fontSize:100,letterSpacing:-4,margin:'35px 0 0',lineHeight:1.05}}>{rejected?'Missing member? Reject.':'One complete manifest.'}</h2>
 <div style={{position:'absolute',left:96,top:349,width:1728,height:560,background:'#1c3b31',border:'1px solid #70917c',borderRadius:26,overflow:'hidden',transform:`translateY(${ramp(q,0,16,25,0)}px)`}}>
  <div style={{padding:'42px 55px',fontSize:37}}>Pinned root <span style={{color:C.jade,fontSize:31,marginLeft:30}}>724614507a2f…</span></div>
  <div style={{display:'flex',gap:32,padding:'35px 55px'}}>{Array.from({length:7},(_,i)=><div key={i} style={{height:147,width:185,background:i===6&&rejected?'#d9af5e':'#99dab0',color:C.forest,borderRadius:20,display:'grid',placeItems:'center',fontSize:43,fontWeight:550,opacity:ramp(q,i*4,24+i*4,0,1),transform:i===6?`translateY(${ramp(q,75,98,0,300)}px) rotate(${ramp(q,75,98,0,13)}deg)`:'none'}}>N{i+1}</div>)}</div>
  <div style={{position:'absolute',left:55,bottom:47,fontSize:40,color:rejected?C.amber:C.jade}}>{rejected?'Incomplete membership → verification fails':'7 nodes · 8 edges · 16 signed entities'}</div>
 </div><div style={{position:'absolute',left:100,bottom:60,fontSize:24,color:'#b3cdbf'}}>Illustrated member check · actual published revision counts</div>
 </AbsoluteFill>;}
function ContextBeat(){const f=useCurrentFrame();if(f<146||f>=226)return <Context/>;const q=f-146;return <AbsoluteFill style={{background:C.ivory,color:C.forest,padding:'75px 94px',overflow:'hidden'}}>
 <div style={{fontSize:26,color:'#456353'}}>ORIGINAL SOURCE / BYTE VERIFICATION</div><h2 style={{fontSize:105,letterSpacing:-4,margin:'35px 0 0'}}>Check the original bytes.</h2>
 <div style={{position:'absolute',left:98,top:356,width:1724,height:549,border:'1px solid #a8bbae',background:'#fffdf8',borderRadius:24,padding:'43px 54px',boxSizing:'border-box'}}><div style={{fontSize:42,fontWeight:550}}>release.ts</div><div style={{fontSize:28,color:'#597266',marginTop:24}}>sha256:{sourceEvidence.digest.slice(7,39)}…</div><pre style={{fontFamily:'DM Sans',fontSize:43,lineHeight:1.45,margin:'40px 0 0'}}>{'Original source → signed source identity\nFull file checked before excerpt selection'}</pre><div style={{position:'absolute',left:0,right:0,top:325+ramp(q,0,48,-100,118),height:65,background:'#99dab028',borderTop:'1px solid #99dab0',opacity:q<60?1:0}}/></div>
 <div style={{position:'absolute',left:103,bottom:65,fontSize:29,color:'#225b4b'}}>Digest matched · bounded excerpt follows</div>
 </AbsoluteFill>;}
function Film(){return <AbsoluteFill style={{fontFamily:'DM Sans',background:C.ivory}}><style>{`@font-face{font-family:"DM Sans";src:url("${fontData}") format("woff2");font-weight:100 900;font-display:block}`}</style>
 <Sequence durationInFrames={240}><Hook/></Sequence><Sequence from={240} durationInFrames={360}><InfrastructureBeat/></Sequence><Sequence from={600} durationInFrames={360}><ContextBeat/></Sequence>
 <Sequence from={960} durationInFrames={195}><ProductShot kind="coding" duration={195}/></Sequence><Sequence from={1155} durationInFrames={135}><ProductShot kind="numbers" duration={135}/></Sequence><Sequence from={1290} durationInFrames={150}><ProductShot kind="safety" duration={150}/></Sequence>
 <Sequence from={1440} durationInFrames={180}><Gate/></Sequence><Sequence from={1620} durationInFrames={360}><Readers verificationSlot={<ReaderProof/>}/></Sequence><Sequence from={1980} durationInFrames={180}><Close/></Sequence>
 <Html5Audio src={staticFile('mix.wav')}/>
 </AbsoluteFill>;}
registerRoot(()=> <Composition id="ArkivGraph" component={Film} durationInFrames={2160} fps={30} width={1920} height={1080}/>);
