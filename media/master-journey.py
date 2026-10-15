"""Remaster the completed picture through OpenMontage without re-encoding it."""
from pathlib import Path
import os,sys,json,shutil
root=Path(__file__).resolve().parent.parent;sys.path.insert(0,str(Path(os.environ['OPENMONTAGE_ROOT']).resolve()))
from tools.video.video_compose import VideoCompose
work=root/'.local/graph-journey';final=root/'.local/graph-journey-final'
class TimedMux(VideoCompose):
 def run_command(self,cmd,*,timeout=None,cwd=None):
  if cmd[0]=='ffmpeg' and '-af' in cmd and cmd[cmd.index('-af')+1]=='apad':
   at=cmd.index('-af');cmd=cmd[:at]+cmd[at+2:];cmd=cmd[:-1]+['-t','96','-bsf:v','h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1',cmd[-1]]
  return super().run_command(cmd,timeout=180,cwd=cwd)
result=TimedMux()._mux_external_audio(final/'arkiv-graph-launch.mp4',work/'public/mix-final.wav')
if not result.success:raise RuntimeError(result.error)
audio=final/'arkiv-graph-launch.work/audio';report=json.loads((work/'public/mix.report.json').read_text(encoding='utf-8'));report['output']='mix-final.wav';report['voice_stem']='mix-final.voice.wav'
(audio/'mix.report.json').write_text(json.dumps(report,indent=2),encoding='utf-8');shutil.copyfile(work/'public/mix-final.voice.wav',audio/'mix-final.voice.wav')
print('Attached final96-second master without changing picture timing.')
