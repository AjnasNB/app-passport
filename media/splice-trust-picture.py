"""Replace one exact controls chapter through OpenMontage, keeping 30 fps timing."""
from pathlib import Path
import argparse,os,sys,json
ROOT=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser()
parser.add_argument('--base',required=True)
parser.add_argument('--controls',required=True)
parser.add_argument('--mobile')
parser.add_argument('--roots')
parser.add_argument('--output',required=True)
args=parser.parse_args()
base=Path(args.base).resolve();controls=Path(args.controls).resolve();output=Path(args.output).resolve()
assert base.is_file() and controls.is_file() and output not in [base,controls]
sys.path.insert(0,str(Path(os.environ.get('OPENMONTAGE_ROOT',str(ROOT.parent/'.local/media-work/openmontage'))).resolve()))
from tools.video.video_compose import VideoCompose
class ConstantFrames(VideoCompose):
    def run_command(self,cmd,*,timeout=None,cwd=None):
        if cmd[0]=='ffmpeg' and ('-filter_complex' in cmd or '-vf' in cmd):
            cmd=cmd[:-1]+['-r','30','-fps_mode','cfr','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709',cmd[-1]]
        return super().run_command(cmd,timeout=600,cwd=cwd)
if args.roots:
    roots=Path(args.roots).resolve()
    assert roots.is_file() and output!=roots
    cuts=[dict(source=str(base),in_seconds=0,out_seconds=44),
          dict(source=str(roots),in_seconds=0,out_seconds=20),
          dict(source=str(base),in_seconds=64,out_seconds=72)]
else:
    cuts=[dict(source=str(base),in_seconds=0,out_seconds=72)]
cuts += [dict(source=str(controls),in_seconds=0,out_seconds=8)]
if args.mobile:
    mobile=Path(args.mobile).resolve()
    assert mobile.is_file() and output!=mobile
    cuts += [dict(source=str(base),in_seconds=80,out_seconds=112),
             dict(source=str(mobile),in_seconds=0,out_seconds=16),
             dict(source=str(base),in_seconds=128,out_seconds=162)]
else:
    cuts += [dict(source=str(base),in_seconds=80,out_seconds=162)]
result=ConstantFrames()._compose(dict(output_path=str(output),edit_decisions=dict(cuts=cuts),crf=20,profile='youtube_landscape'))
if not result.success:raise RuntimeError(result.error)
print(json.dumps(dict(output=str(output),roots_span=[44,64] if args.roots else None,controls_span=[72,80],mobile_span=[112,128] if args.mobile else None,fps=30,duration=162,bytes=output.stat().st_size)))
