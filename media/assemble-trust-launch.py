"""Attach the reviewed bounded audio master via OpenMontage; preserve picture timing."""
from pathlib import Path
import argparse, json, os, shutil, sys
ROOT=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser()
parser.add_argument('--work',default=str(ROOT/'.local/media-trust-refresh'))
args=parser.parse_args()
work=Path(args.work).resolve()
final=work/'final'
final.mkdir(parents=True,exist_ok=True)
sys.path.insert(0,str(Path(os.environ.get('OPENMONTAGE_ROOT',str(ROOT.parent/'.local/media-work/openmontage'))).resolve()))
from tools.video.video_compose import VideoCompose
picture=work/'trust-launch-picture.mp4'
master=work/'public/mix-final.wav'
plan=json.loads((work/'scene-manifest.json').read_text(encoding='utf-8'))
assert plan['duration']==162 and plan['frames']==4860
if not picture.is_file() or not master.is_file():raise RuntimeError('Picture and mastered audio must exist')
output=final/'arkiv-graph-launch.mp4'
shutil.copyfile(picture,output)
class TimedMux(VideoCompose):
    def run_command(self,cmd,*,timeout=None,cwd=None):
        if cmd[0]=='ffmpeg' and '-af' in cmd and cmd[cmd.index('-af')+1]=='apad':
            at=cmd.index('-af');cmd=cmd[:at]+cmd[at+2:]
            cmd=cmd[:-1]+['-t','162','-bsf:v','h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1',cmd[-1]]
        return super().run_command(cmd,timeout=300,cwd=cwd)
result=TimedMux()._mux_external_audio(output,master)
if not result.success:raise RuntimeError(result.error)
config=dict(name='Arkiv Graph: change you can verify',width=1920,height=1080,fps=30,duration=162,platform='youtube',poster=5.8,
    audio=os.path.relpath(work/'mix.json',final),
    scenes=[{k:s[k] for k in ('id','start','duration')} for s in plan['scenes']],
    expect=dict(duration=162,tolerance=.1,platform='youtube',lufs=-16,audio=True,captions=True,max_size_mb=25))
(final/'showtime.json').write_text(json.dumps(config,indent=2),encoding='utf-8')
(final/'storyboard.md').write_text('# Arkiv Graph trust launch\n\n'+ '\n'.join(f"- {s['start']}–{s['start']+s['duration']}s: {s['title']} ({s['kind']})" for s in plan['scenes']),encoding='utf-8')
audio=final/'arkiv-graph-launch.work/audio';audio.mkdir(parents=True,exist_ok=True)
report=json.loads((work/'public/mix.report.json').read_text(encoding='utf-8'))
report.update(output='mix-final.wav',voice_stem='mix-final.voice.wav')
(audio/'mix.report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
shutil.copyfile(work/'public/mix-final.voice.wav',audio/'mix-final.voice.wav')
(final/'arkiv-graph-launch.report.json').write_text(json.dumps(dict(output=str(output),audio=dict(speech_stem=str(audio/'mix-final.voice.wav')),renderer='Native Remotion motion graphics through OpenMontage; real owned-product recordings',source_manifest=str(work/'scene-manifest.json')),indent=2),encoding='utf-8')
print(json.dumps(dict(final=str(output),bytes=output.stat().st_size,duration=162)))
