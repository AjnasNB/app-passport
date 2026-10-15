"""Extend the original score and synthetic narration for the real AI journey."""
from pathlib import Path
import json,numpy as np,soundfile as sf
from kokoro_onnx import Kokoro
root=Path(__file__).resolve().parent.parent;work=root/'.local/graph-journey';public=work/'public';public.mkdir(parents=True,exist_ok=True)
evidence=json.loads((root/'.local/ai-journey-recording/run.json').read_text(encoding='utf-8'))
cache=Path.home()/'.cache/hyperframes/tts';engine=Kokoro(str(cache/'models/kokoro-v1.0.onnx'),str(cache/'voices/voices-v1.0.bin'))
words={1:'one',2:'two',3:'three',4:'four',5:'five',6:'six',7:'seven',8:'eight',9:'nine',10:'ten'}
events=len(evidence['model_evidence']['selected_events']);sources=len(evidence['model_evidence']['sources'])
scenes=[(0,'Choose a task. Its graph connects the sources and current reviews.'),(6,f"Qarinah selects {words.get(events,str(events))} current events. {words.get(sources,str(sources)).capitalize()} source excerpt becomes untrusted evidence."),(12,'Open the exact evidence message. Its byte identity is checked in your browser.'),(18,'The model runs. Tests check its guard. A receipt binds the reported inputs and result.')]
rate=24000;chapter=np.zeros(rate*24,dtype=np.float32);timing=[]
for i,(start,text) in enumerate(scenes):
 speed=1.03
 for attempt in range(5):
  audio,sr=engine.create(text,voice='af_heart',speed=speed,lang='en-us');duration=len(audio)/sr
  if duration<=5.4:break
  speed*=duration/5.4*1.025
 if duration>5.5:raise RuntimeError('Journey narration exceeds its chapter slot')
 at=round((start+.2)*rate);chapter[at:at+len(audio)]+=audio;timing.append({'id':'journey-'+str(i+1),'start':32+start+.2,'duration':round(duration,3),'text':text,'speed':round(speed,3)})
 print(json.dumps({'journey_voice':i+1,'seconds':round(duration,3)}),flush=True)
old,sr=sf.read(root/'.local/graph-launch/public/narration.wav',dtype='float32');assert sr==rate
voice=np.concatenate([old[:32*rate],chapter,old[32*rate:]])
bridge_text='AI Passport also has source-linked learning tools.'
bridge,bridge_rate=engine.create(bridge_text,voice='af_heart',speed=1.03,lang='en-us')
assert bridge_rate==rate and len(bridge)/rate<3.7
voice[round(62.5*rate):67*rate]=0
voice[round(62.7*rate):round(62.7*rate)+len(bridge)]=bridge
sf.write(public/'narration.wav',voice,rate)
score,sr=sf.read(root/'.local/launch-crew/sound/music-2.wav',dtype='float32',always_2d=True)
parts=[score[:32*sr].copy(),score[8*sr:32*sr].copy(),score[32*sr:].copy()]
# Keep bar timing while smoothing the sample joins of this original arrangement.
fade=int(.008*sr)
for left,right in zip(parts,parts[1:]):left[-fade:]*=np.linspace(1,0,fade)[:,None];right[:fade]*=np.linspace(0,1,fade)[:,None]
sf.write(public/'score.wav',np.concatenate(parts),sr)
license=json.loads((root/'.local/launch-crew/sound/music-2.wav.license.json').read_text(encoding='utf-8'));license['file']='score.wav';license['derived_from']='Original Arkiv Graph score: bars8-32 inserted at32s; no outside music';(public/'score.wav.license.json').write_text(json.dumps(license,indent=2),encoding='utf-8')
old_timing=json.loads((root/'.local/graph-launch/voice-timing.json').read_text(encoding='utf-8'))
for row in old_timing:
 if row['start']>=32:row['start']+=24
 if row['id']==5:row.update(text=bridge_text,duration=round(len(bridge)/rate,3))
all_timing=sorted(old_timing+timing,key=lambda row:row['start']);(work/'voice-timing.json').write_text(json.dumps(all_timing,indent=2),encoding='utf-8')
spec=json.loads((root/'.local/graph-launch/mix.json').read_text(encoding='utf-8'));spec['duration']=96;spec['tracks'][0]['file']='public/narration.wav';spec['tracks'][1]['file']='public/score.wav'
spec['tracks'][1]['gain_points']=[[t+24 if t>=32 else t,db] for t,db in spec['tracks'][1]['gain_points']]
spec['tracks'][1]['duck']['hold']=2.5
spec['tracks'][1]['gain_points']=sorted(spec['tracks'][1]['gain_points']+[[18.7,0],[19,-5],[19.8,-5],[20,0],[20.5,0]],key=lambda point:point[0])
spec['sections']={'hook':0,'infrastructure':8,'context':20,'AI_journey':32,'application':56,'gate':72,'readers':78,'close':90}
(work/'mix.json').write_text(json.dumps(spec,indent=2),encoding='utf-8')
print(json.dumps({'duration':96,'new_chapter':[32,56],'original_music_arranged':True,'synthetic_voice':'Kokoro af_heart'}))
