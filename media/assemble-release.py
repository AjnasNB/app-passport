"""Assemble the release picture through OpenMontage and attach its mastered audio."""
from pathlib import Path
import argparse, json, os, shutil, sys
root=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(Path(os.environ['OPENMONTAGE_ROOT']).resolve()))
from tools.video.video_compose import VideoCompose
work=root/'.local/graph-release'
parser=argparse.ArgumentParser()
parser.add_argument('--audio-work',default=str(work))
parser.add_argument('--final',default=str(root/'.local/graph-release-final'))
args=parser.parse_args()
audio_work=Path(args.audio_work)
final=Path(args.final)
final.mkdir(parents=True,exist_ok=True)
original=root/'.local/graph-journey-final/arkiv-graph-launch.mp4'
evidence=json.loads((work/'evidence.json').read_text(encoding='utf-8'))
if evidence['npm']['published'] is not True:raise ValueError('Public registry publication must be verified before final assembly.')
cuts=[{'source':str(original),'in_seconds':0,'out_seconds':78}]
if (work/'opening-fix.mp4').is_file():
  cuts += [{'source':str(work/'opening-fix.mp4'),'in_seconds':0,'out_seconds':6},{'source':str(work/'two-client-chapter.mp4'),'in_seconds':6,'out_seconds':36 if (work/'npm-chapter.mp4').is_file() else 44}]
else:
  cuts += [{'source':str(work/'two-client-chapter.mp4'),'in_seconds':0,'out_seconds':36 if (work/'npm-chapter.mp4').is_file() else 44}]
if (work/'npm-chapter.mp4').is_file():
  cuts += [{'source':str(work/'npm-chapter.mp4'),'in_seconds':0,'out_seconds':8}]
cuts += [{'source':str(work/'closing-fix.mp4'),'in_seconds':0,'out_seconds':6}] if (work/'closing-fix.mp4').is_file() else [{'source':str(original),'in_seconds':90,'out_seconds':96}]
class ConstantFrames(VideoCompose):
  def run_command(self,cmd,*,timeout=None,cwd=None):
    if cmd[0]=='ffmpeg' and ('-filter_complex' in cmd or '-vf' in cmd):
      cmd=cmd[:-1]+['-r','30','-fps_mode','cfr',cmd[-1]]
    return super().run_command(cmd,timeout=timeout,cwd=cwd)
result=ConstantFrames()._compose({'output_path':str(final/'arkiv-graph-launch.mp4'),'edit_decisions':{'cuts':cuts},'crf':23,'profile':'youtube_landscape'})
if not result.success:raise RuntimeError(result.error)
class TimedMux(VideoCompose):
  def run_command(self,cmd,*,timeout=None,cwd=None):
    if cmd[0]=='ffmpeg' and '-af' in cmd and cmd[cmd.index('-af')+1]=='apad':
      at=cmd.index('-af');cmd=cmd[:at]+cmd[at+2:]
      cmd=cmd[:-1]+['-t','128','-bsf:v','h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1',cmd[-1]]
    return super().run_command(cmd,timeout=300,cwd=cwd)
result=TimedMux()._mux_external_audio(final/'arkiv-graph-launch.mp4',audio_work/'public/mix-final.wav')
if not result.success:raise RuntimeError(result.error)
scenes=[('hook',0,8),('infrastructure',8,12),('context',20,12),('source_path',32,6),('bounded_evidence',38,6),('live_inspector',44,6),('model_and_receipt',50,6),('coding',56,6.5),('numbers',62.5,4.5),('safety',67,5),('gate',72,6),('separate_readers',78,6),('accepted_reads',84,8),('review_withdrawal',92,6),('B_next_request',98,5),('A_next_request',103,5),('scope',108,6),('npm',114,8),('close',122,6)]
config={'name':'Arkiv Graph: two readers, one live withdrawal','width':1920,'height':1080,'fps':30,'duration':128,'platform':'youtube','poster':7.9,'audio':os.path.relpath(audio_work/'mix.json',final),'scenes':[{'id':name,'start':start,'duration':duration} for name,start,duration in scenes],'expect':{'duration':128,'tolerance':.1,'platform':'youtube','lufs':-16,'audio':True,'captions':True,'max_size_mb':25}}
(final/'showtime.json').write_text(json.dumps(config,indent=2),encoding='utf-8')
(final/'storyboard.md').write_text('# Arkiv Graph release evidence\n\nExisting0–78s retain graph/source/actualAI inference and reference applications. A new44s chapter shows a real session: separate clients accept, a signed review is withdrawn, then B and A make fresh reads and refuse. This chapter runs a deterministic six-case guard, without model inference. Both wallets/clients are project-controlled. Direct graph and source verification depend on RPC completeness, and receipts do not independently attest execution. npm version and install command are bound to actual public registry evidence. Final6s retain the original brand close. Original composed music is arranged, not copied from the launch reference.\n\n'+'\n'.join(f'- {start:g}–{start+duration:g}s: {name}' for name,start,duration in scenes),encoding='utf-8')
audio=final/'arkiv-graph-launch.work/audio'
audio.mkdir(parents=True,exist_ok=True)
report=json.loads((audio_work/'public/mix.report.json').read_text(encoding='utf-8'))
report.update(output='mix-final.wav',voice_stem='mix-final.voice.wav')
(audio/'mix.report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
shutil.copyfile(audio_work/'public/mix-final.voice.wav',audio/'mix-final.voice.wav')
(final/'arkiv-graph-launch.report.json').write_text(json.dumps({'output':str(final/'arkiv-graph-launch.mp4'),'audio':{'speech_stem':str(audio/'mix-final.voice.wav')},'renderer':'OpenMontage / native Remotion; actual two-client live recording and original source-to-model journey','source_cuts':cuts,'evidence_file':str(work/'evidence.json')},indent=2),encoding='utf-8')
print(json.dumps({'final':str(final/'arkiv-graph-launch.mp4'),'seconds':128,'bytes':(final/'arkiv-graph-launch.mp4').stat().st_size}))
