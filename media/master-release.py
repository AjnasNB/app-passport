"""Attach a revised master without re-encoding or changing the picture stream."""
from pathlib import Path
import argparse, json, os, shutil, sys
root=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser()
parser.add_argument('--work',default=str(root/'.local/graph-release'))
parser.add_argument('--base',default=str(root/'.local/graph-release-final/arkiv-graph-launch.mp4'))
parser.add_argument('--final',default=str(root/'.local/graph-release-audio2-final'))
args=parser.parse_args()
work=Path(args.work);base=Path(args.base);final=Path(args.final)
final.mkdir(parents=True,exist_ok=True)
target=final/'arkiv-graph-launch.mp4'
if target.resolve()!=base.resolve():shutil.copyfile(base,target)
sys.path.insert(0,str(Path(os.environ['OPENMONTAGE_ROOT']).resolve()))
from tools.video.video_compose import VideoCompose
class TimedMux(VideoCompose):
  def run_command(self,cmd,*,timeout=None,cwd=None):
    if cmd[0]=='ffmpeg' and '-af' in cmd and cmd[cmd.index('-af')+1]=='apad':
      at=cmd.index('-af');cmd=cmd[:at]+cmd[at+2:]
      cmd=cmd[:-1]+['-t','128','-bsf:v','h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1',cmd[-1]]
    return super().run_command(cmd,timeout=180,cwd=cwd)
tool=TimedMux()
result=tool._mux_external_audio(target,work/'public/mix-final.wav')
if not result.success:raise RuntimeError(result.error)
audio=final/'arkiv-graph-launch.work/audio'
audio.mkdir(parents=True,exist_ok=True)
report=json.loads((work/'public/mix.report.json').read_text(encoding='utf-8'))
report.update(output='mix-final.wav',voice_stem='mix-final.voice.wav')
(audio/'mix.report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
shutil.copyfile(work/'public/mix-final.voice.wav',audio/'mix-final.voice.wav')
config=json.loads((base.parent/'showtime.json').read_text(encoding='utf-8'))
config['audio']=os.path.relpath(work/'mix.json',final)
(final/'showtime.json').write_text(json.dumps(config,indent=2),encoding='utf-8')
shutil.copyfile(base.parent/'storyboard.md',final/'storyboard.md')
(final/'arkiv-graph-launch.report.json').write_text(json.dumps({'output':str(target),'audio':{'speech_stem':str(audio/'mix-final.voice.wav')},'renderer':'OpenMontage audio-only remaster; copy of original video stream','base_picture':str(base)},indent=2),encoding='utf-8')
hashes=[]
for path in [base,target]:
  probe=tool.run_command(['ffmpeg','-v','error','-i',str(path),'-map','0:v:0','-c:v','copy','-f','hash','-hash','sha256','-'],timeout=30)
  if probe.returncode!=0:raise RuntimeError('Video stream identity probe failed')
  hashes.append(str(probe.stdout).strip())
if hashes[0]!=hashes[1]:raise RuntimeError('Audio remaster changed encoded picture bytes')
(final/'picture-stream-proof.json').write_text(json.dumps({'identical':True,'encoded_video_sha256':hashes[0],'compared_files':[base.name,target.name],'scope':'Encoded picture packets are identical. Full container hash changes with revised audio.'},indent=2),encoding='utf-8')
print(json.dumps({'audio_only_remaster':True,'picture_stream_identical':True,'bytes':target.stat().st_size,'final':str(target)}))
