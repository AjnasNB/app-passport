"""Join a corrected quiz chapter through OpenMontage and attach the full master."""
import os,sys,json,shutil
from pathlib import Path
root=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(Path(os.environ['OPENMONTAGE_ROOT']).resolve()))
from tools.video.video_compose import VideoCompose
work=root/'.local/graph-launch';final=root/'.local/graph-launch-final';final.mkdir(exist_ok=True)
cuts=[{'source':str(work/'arkiv-graph-launch-3.mp4'),'in_seconds':0,'out_seconds':43},{'source':str(work/'graph-quiz-patch.mp4'),'in_seconds':0,'out_seconds':5},{'source':str(work/'arkiv-graph-launch-3.mp4'),'in_seconds':48,'out_seconds':72}]
tool=VideoCompose();result=tool._compose({'output_path':str(final/'arkiv-graph-launch.mp4'),'edit_decisions':{'cuts':cuts},'crf':18})
if not result.success:raise RuntimeError(result.error)
class TimedMux(VideoCompose):
 def run_command(self,cmd,*,timeout=None,cwd=None):
  if cmd[0]=='ffmpeg' and '-af' in cmd and cmd[cmd.index('-af')+1]=='apad':
   at=cmd.index('-af');cmd=cmd[:at]+cmd[at+2:]
   cmd=cmd[:-1]+['-t','72','-bsf:v','h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1',cmd[-1]]
  return super().run_command(cmd,timeout=180,cwd=cwd)
result=TimedMux()._mux_external_audio(final/'arkiv-graph-launch.mp4',work/'public/mix-final.wav')
if not result.success:raise RuntimeError(result.error)
for name in ['showtime.json','storyboard.md']:
 shutil.copyfile(work/name,final/name)
shutil.copyfile(work/'arkiv-graph-launch-2.srt',final/'arkiv-graph-launch.srt')
(final/'voice').mkdir(exist_ok=True);shutil.copyfile(work/'voice/timeline.json',final/'voice/timeline.json')
report=json.loads((work/'public/mix.report.json').read_text());report['output']='mix-final.wav';report['voice_stem']='mix-final.voice.wav'
audio=final/'arkiv-graph-launch.work/audio';audio.mkdir(parents=True,exist_ok=True)
(audio/'mix.report.json').write_text(json.dumps(report,indent=2),encoding='utf-8');shutil.copyfile(work/'public/mix-final.voice.wav',audio/'mix-final.voice.wav')
(final/'arkiv-graph-launch.report.json').write_text(json.dumps({'output':str((final/'arkiv-graph-launch.mp4').resolve()),'audio':{'speech_stem':str((audio/'mix-final.voice.wav').resolve())},'renderer':'OpenMontage; corrected 43-48s chapter; master attached without changing video timing','source_cuts':cuts},indent=2),encoding='utf-8')
print(json.dumps({'final':str(final/'arkiv-graph-launch.mp4'),'corrected_chapter':[43,48],'master_restored':True}))
