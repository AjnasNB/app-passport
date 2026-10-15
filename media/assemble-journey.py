"""Insert the rendered AI chapter and attach the full original mastered arrangement."""
import os,sys,json,shutil
from pathlib import Path
root=Path(__file__).resolve().parent.parent;sys.path.insert(0,str(Path(os.environ['OPENMONTAGE_ROOT']).resolve()))
from tools.video.video_compose import VideoCompose
work=root/'.local/graph-journey';final=root/'.local/graph-journey-final';final.mkdir(parents=True,exist_ok=True)
original=root/'.local/graph-launch-final/arkiv-graph-launch.mp4'
cuts=[{'source':str(original),'in_seconds':0,'out_seconds':32},{'source':str(work/'journey-chapter.mp4'),'in_seconds':0,'out_seconds':24},{'source':str(original),'in_seconds':32,'out_seconds':38.5},{'source':str(root/'.local/graph-launch/graph-number-source-patch.mp4'),'in_seconds':0,'out_seconds':4.5},{'source':str(original),'in_seconds':43,'out_seconds':72}]
class ConstantFrames(VideoCompose):
 def run_command(self,cmd,*,timeout=None,cwd=None):
  if cmd[0]=='ffmpeg' and ('-filter_complex' in cmd or '-vf' in cmd):
   cmd=cmd[:-1]+['-r','30','-fps_mode','cfr',cmd[-1]]
  return super().run_command(cmd,timeout=timeout,cwd=cwd)
result=ConstantFrames()._compose({'output_path':str(final/'arkiv-graph-launch.mp4'),'edit_decisions':{'cuts':cuts},'crf':20,'profile':'youtube_landscape'})
if not result.success:raise RuntimeError(result.error)
class TimedMux(VideoCompose):
 def run_command(self,cmd,*,timeout=None,cwd=None):
  if cmd[0]=='ffmpeg' and '-af' in cmd and cmd[cmd.index('-af')+1]=='apad':
   at=cmd.index('-af');cmd=cmd[:at]+cmd[at+2:];cmd=cmd[:-1]+['-t','96','-bsf:v','h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1',cmd[-1]]
  return super().run_command(cmd,timeout=240,cwd=cwd)
result=TimedMux()._mux_external_audio(final/'arkiv-graph-launch.mp4',work/'public/mix-final.wav')
if not result.success:raise RuntimeError(result.error)
scenes=[('hook',0,8),('infrastructure',8,12),('context',20,12),('source_path',32,6),('bounded_evidence',38,6),('live_inspector',44,6),('model_and_receipt',50,6),('coding',56,6.5),('numbers',62.5,4.5),('safety',67,5),('gate',72,6),('readers',78,12),('close',90,6)]
config={'name':'Arkiv Graph: inspectable AI journey','width':1920,'height':1080,'fps':30,'duration':96,'platform':'youtube','poster':7.9,'audio':'../graph-journey/mix.json','scenes':[{'id':name,'start':start,'duration':duration} for name,start,duration in scenes],'expect':{'duration':96,'tolerance':.1,'platform':'youtube','lufs':-16,'audio':True,'captions':True,'max_size_mb':25}}
(final/'showtime.json').write_text(json.dumps(config,indent=2),encoding='utf-8')
(final/'storyboard.md').write_text('# Arkiv Graph: actual AI evidence journey\n\nThe preserved launch story now includes a24s source-to-model explanation at32-56s. Native graph/source motions and a real exact-evidence inspector are followed by the previously recorded six-case guard, deterministic India number example, NPCI learning game and real withheld inference. Illustrations are labeled. Current selected run values come from an actual hosted evaluation. A receipt is project-generated and does not attest provider computation.\n\nMusic changes section at8,20,32,56,72,78,90; the designed inference-refusal dropout is76-78; the final chime is94. Result-reading and final URL holds are intentional.\n\n'+ '\n'.join(f'- {start:g}-{start+duration:g}s: {name}' for name,start,duration in scenes),encoding='utf-8')
audio=final/'arkiv-graph-launch.work/audio';audio.mkdir(parents=True,exist_ok=True)
report=json.loads((work/'public/mix.report.json').read_text(encoding='utf-8'));report['output']='mix-final.wav';report['voice_stem']='mix-final.voice.wav'
(audio/'mix.report.json').write_text(json.dumps(report,indent=2),encoding='utf-8');shutil.copyfile(work/'public/mix-final.voice.wav',audio/'mix-final.voice.wav')
(final/'arkiv-graph-launch.report.json').write_text(json.dumps({'output':str(final/'arkiv-graph-launch.mp4'),'audio':{'speech_stem':str(audio/'mix-final.voice.wav')},'renderer':'OpenMontage/Remotion; 24s native AI journey inserted; original master rearranged','source_cuts':cuts},indent=2),encoding='utf-8')
print(json.dumps({'final':str(final/'arkiv-graph-launch.mp4'),'seconds':96,'bytes':(final/'arkiv-graph-launch.mp4').stat().st_size}))
