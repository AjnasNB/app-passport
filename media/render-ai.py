import os,sys,json,subprocess,shutil,base64
from pathlib import Path
root=Path(__file__).resolve().parent.parent
openmontage=Path(os.environ['OPENMONTAGE_ROOT']).resolve()
sys.path.insert(0,str(openmontage))
from tools.video.video_compose import VideoCompose
composer=openmontage/'remotion-composer'
stage=composer/'projects/ai-passport'
stage.mkdir(parents=True,exist_ok=True)
shutil.copyfile(root/'media/ai-film.tsx',stage/'index.tsx')
work=root/'.local/ai-film'
(stage/'font-data.ts').write_text('export const fontData="data:font/woff2;base64,'+base64.b64encode((work/'public/font.woff2').read_bytes()).decode()+'";',encoding='utf-8')
capture=json.loads((root/'.local/ai-recording/capture.json').read_text(encoding='utf-8'))
(stage/'capture-meta.ts').write_text('export const captureInfo='+json.dumps({'start':0,'toolsAt':capture['tools_at']})+';',encoding='utf-8')
class LocalRenderer(VideoCompose):
 def run_command(self,cmd,*,timeout=None,cwd=None):
  if cmd[:3]==['npx','remotion','render']:
   cmd=[shutil.which('node'),str(composer/'node_modules/@remotion/cli/remotion-cli.js'),*cmd[2:],'--browser-executable=C:/Program Files/Google/Chrome/Application/chrome.exe','--log=error']
  return super().run_command(cmd,timeout=timeout,cwd=cwd)
tool=LocalRenderer()
result=tool._render_via_atelier({'output_path':str(work/'ai-passport-demo.mp4')},{'render_runtime':'remotion','composition_mode':'atelier','total_duration':75,'bespoke':{'entry':str(stage/'index.tsx'),'composition_id':'AIPassport','public_dir':str(work/'public'),'crf':22,'concurrency':3,'art_direction':'Forest green, warm paper, physical layered artifact, separate producer and reviewer seal, moving record paths, live website capture. No slide template or stock scene registry.'}})
(work/'openmontage-review.json').write_text(json.dumps({'success':result.success,'data':result.data,'error':result.error},indent=2,default=str),encoding='utf-8')
print(json.dumps({'render_success':result.success,'output':str(work/'ai-passport-demo.mp4'),'review_status':result.data.get('final_review_status') if result.data else None,'error_present':bool(result.error)},default=str))
if not result.success:sys.exit(1)
