"""Render original Arkiv Graph motion and actual site footage with OpenMontage."""
import os,sys,json,shutil,base64
from pathlib import Path
root=Path(__file__).resolve().parent.parent
openmontage=Path(os.environ['OPENMONTAGE_ROOT']).resolve()
sys.path.insert(0,str(openmontage))
from tools.video.video_compose import VideoCompose
composer=openmontage/'remotion-composer'
stage=composer/'projects/arkiv-graph';stage.mkdir(parents=True,exist_ok=True)
work=root/'.local/graph-launch';public=work/'public';public.mkdir(parents=True,exist_ok=True)
shutil.copyfile(root/'media/graph-film.tsx',stage/'index.tsx')
shutil.copyfile(root/'media/graph-motion.tsx',stage/'motion-scenes.tsx')
font=next((root/'apps/web/public/fonts').glob('*.woff2'))
(stage/'font-data.ts').write_text('export const fontData="data:font/woff2;base64,'+base64.b64encode(font.read_bytes()).decode()+'";',encoding='utf-8')
capture=json.loads((root/'.local/graph-recording/capture.json').read_text(encoding='utf-8'))
proof=json.loads((root/'apps/web/public/data/graph-infrastructure-evaluation.json').read_text(encoding='utf-8'))
graph=json.loads((root/'apps/web/public/data/evidence-graph.json').read_text(encoding='utf-8'))
source=next(n for n in graph['nodes'] if n['label']=='release.ts')
(stage/'capture-meta.ts').write_text('export const captureInfo='+json.dumps(capture['events'])+';\nexport const readerEvidence='+json.dumps({'nodes':proof['generic_graph']['nodes'],'edges':proof['generic_graph']['edges'],'passed':proof['passed'],'total':proof['total'],'version':proof['generic_sdk']})+';\nexport const sourceEvidence='+json.dumps({'digest':source['digest']})+';',encoding='utf-8')
shutil.copyfile(capture['video'],public/'live-demo.webm')
for image in ['gate-detail.png','gate-status.png']:
 shutil.copyfile(root/'.local/graph-recording'/image,public/image)
class LocalRenderer(VideoCompose):
 def run_command(self,cmd,*,timeout=None,cwd=None):
  if cmd[:3]==['npx','remotion','render']:
   cmd=[shutil.which('node'),str(composer/'node_modules/@remotion/cli/remotion-cli.js'),*cmd[2:],'--browser-executable=C:/Program Files/Google/Chrome/Application/chrome.exe','--pixel-format=yuv420p','--color-space=bt709','--log=error']
   if os.environ.get('GRAPH_FILM_FRAMES'):cmd.append('--frames='+os.environ['GRAPH_FILM_FRAMES'])
  return super().run_command(cmd,timeout=timeout,cwd=cwd)
tool=LocalRenderer()
filename=os.environ.get('GRAPH_FILM_OUTPUT','arkiv-graph-launch.mp4')
frame_range=os.environ.get('GRAPH_FILM_FRAMES')
duration=(int(frame_range.split('-')[1])-int(frame_range.split('-')[0])+1)/30 if frame_range else 72
result=tool._render_via_atelier({'output_path':str(work/filename)},{'render_runtime':'remotion','composition_mode':'atelier','total_duration':duration,'bespoke':{'entry':str(stage/'index.tsx'),'composition_id':'ArkivGraph','public_dir':str(public),'crf':20,'concurrency':3,'art_direction':'Original physical sources become graph identities; complete manifest rejects a missing member; source-tethered AI context; real new-domain recordings; independent SDK/MCP proof; no slideshow. Original composed piano and hip-hop bed, dropout at review refusal, final chime at 70 seconds.'}})
(work/'openmontage-review.json').write_text(json.dumps({'success':result.success,'data':result.data,'error':result.error},indent=2,default=str),encoding='utf-8')
print(json.dumps({'render_success':result.success,'output':str(work/filename),'error_present':bool(result.error)},default=str))
if not result.success:sys.exit(1)
