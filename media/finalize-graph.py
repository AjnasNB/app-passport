"""Attach the final mastered original soundtrack through OpenMontage."""
import os,sys,json,shutil,hashlib
from pathlib import Path
root=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(Path(os.environ['OPENMONTAGE_ROOT']).resolve()))
from tools.video.video_compose import VideoCompose
work=root/'.local/graph-launch'
class TimedMux(VideoCompose):
 def run_command(self,cmd,*,timeout=None,cwd=None):
  # The master WAV is already exactly 72s. Infinite padding is unnecessary.
  if cmd[0]=='ffmpeg':
   at=cmd.index('-af');cmd=cmd[:at]+cmd[at+2:]
   cmd=cmd[:-1]+['-t','72','-bsf:v','h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1',cmd[-1]]
  return super().run_command(cmd,timeout=120,cwd=cwd)
result=TimedMux()._mux_external_audio(work/'arkiv-graph-launch-2.mp4',work/'public/mix-final.wav')
if not result.success:raise RuntimeError(result.error)
report=json.loads((work/'public/mix.report.json').read_text())
report['output']='public/mix-final.wav';report['voice_stem']='public/mix-final.voice.wav'
(work/'mix.report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
public=root/'apps/web/public/media/arkiv-graph'
voice=json.loads((public/'narration-provenance.json').read_text())
voice['generated_audio_sha256']=hashlib.sha256((work/'public/narration.wav').read_bytes()).hexdigest()
(public/'narration-provenance.json').write_text(json.dumps(voice,indent=2),encoding='utf-8')
print(json.dumps({'final_audio_attached':True,'video':'arkiv-graph-launch-2.mp4','score_and_narration':'original','mix_lufs':report['integrated_lufs']}))
