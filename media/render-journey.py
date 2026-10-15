"""Render the source-to-model chapter through OpenMontage's Remotion composer."""
import os,sys,json,shutil,base64,argparse
from pathlib import Path
root=Path(__file__).resolve().parent.parent;montage=Path(os.environ['OPENMONTAGE_ROOT']).resolve();sys.path.insert(0,str(montage))
from tools.video.video_compose import VideoCompose
composer=montage/'remotion-composer';stage=composer/'projects/arkiv-ai-journey';stage.mkdir(parents=True,exist_ok=True)
work=root/'.local/graph-journey';public=work/'public';public.mkdir(parents=True,exist_ok=True)
shutil.copyfile(root/'media/ai-journey-motion.tsx',stage/'journey.tsx')
capture=json.loads((root/'.local/ai-journey-recording/capture.json').read_text(encoding='utf-8'));evidence=json.loads((root/'.local/ai-journey-recording/run.json').read_text(encoding='utf-8'))
shutil.copyfile(capture['video'],public/'ai-journey-live.webm')
font=next((root/'apps/web/public/fonts').glob('*.woff2'))
entry="import React from 'react';import{Composition,registerRoot,AbsoluteFill}from'remotion';import{Journey,type JourneyEvidence}from'./journey';const evidence="+json.dumps(evidence,ensure_ascii=False)+" as unknown as JourneyEvidence;const font='data:font/woff2;base64,"+base64.b64encode(font.read_bytes()).decode()+"';function Film(){return <AbsoluteFill style={{fontFamily:'DM Sans'}}><style>{`@font-face{font-family:DM Sans;src:url('${font}')format('woff2');font-weight:100 900}`}</style><Journey evidence={evidence} captureStart={"+str(capture['events']['inspector'])+"}/></AbsoluteFill>}registerRoot(()=><Composition id='AIJourney' component={Film} durationInFrames={720} fps={30} width={1920} height={1080}/>);"
(stage/'index.tsx').write_text(entry,encoding='utf-8')
class LocalRenderer(VideoCompose):
 def run_command(self,cmd,*,timeout=None,cwd=None):
  if cmd[:3]==['npx','remotion','render']:
   cmd=[shutil.which('node'),str(composer/'node_modules/@remotion/cli/remotion-cli.js'),*cmd[2:],'--browser-executable=C:/Program Files/Google/Chrome/Application/chrome.exe','--pixel-format=yuv420p','--color-space=bt709','--log=error']
  return super().run_command(cmd,timeout=timeout,cwd=cwd)
tool=LocalRenderer();snapshots='--snapshots' in sys.argv
if snapshots:
 for frame in [135,315,435,675]:
  target=work/f'chapter-{frame}.png';result=tool.run_command([shutil.which('node'),str(composer/'node_modules/@remotion/cli/remotion-cli.js'),'still',str(stage/'index.tsx'),'AIJourney',str(target),'--frame='+str(frame),'--public-dir='+str(public),'--browser-executable=C:/Program Files/Google/Chrome/Application/chrome.exe','--scale=.67','--log=error'],timeout=120,cwd=composer)
  if result.returncode!=0:raise RuntimeError('Journey snapshot failed: '+str(result.stderr)[-1000:])
 print(json.dumps({'snapshot_frames':[135,315,435,675]}));sys.exit()
result=tool._render_via_atelier({'output_path':str(work/'journey-chapter.mp4')},{'render_runtime':'remotion','composition_mode':'atelier','total_duration':24,'bespoke':{'entry':str(stage/'index.tsx'),'composition_id':'AIJourney','public_dir':str(public),'crf':18,'concurrency':3,'art_direction':'Native source paths fold into bounded untrusted evidence, actual exact-message inspector, model-to-validator receipt. Recorded evidence values only.'}})
(work/'render-report.json').write_text(json.dumps({'success':result.success,'data':result.data,'error':result.error},indent=2,default=str),encoding='utf-8')
print(json.dumps({'render_success':result.success,'chapter_seconds':24}));sys.exit(0 if result.success else 1)
