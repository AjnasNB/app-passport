"""Extend the original licensed score and narration for the real release chapter.

Run only after render-release-chapter.py --prepare-only has bound real evidence.
No music from the user's reference is copied.
"""
from pathlib import Path
import json
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

root=Path(__file__).resolve().parent.parent
work=root/'.local/graph-release'
public=work/'public'
session=json.loads((root/'apps/web/public/data/two-client-session.json').read_text(encoding='utf-8'))
assert session['status']=='completed'
public.mkdir(parents=True,exist_ok=True)
cache=Path.home()/'.cache/hyperframes/tts'
engine=Kokoro(str(cache/'models/kokoro-v1.0.onnx'),str(cache/'voices/voices-v1.0.bin'))
rate=24000
chapter=np.zeros(rate*44,dtype=np.float32)
cues=[
  (0,5.4,'Two separate readers verify the same graph, source bytes, and current review.'),
  (6,7.2,'Each makes a fresh read. Both admit the task. Six guard tests pass, without a model.'),
  (14,5.3,'The reviewer withdraws its review in a new Arkiv transaction.'),
  (20,4.5,'Once visible, B reads again. Its next task is refused.'),
  (25,4.5,'A makes its own fresh read. The task is refused too.'),
  (30,5.3,'Both clients and wallets belong to this project. Every new task checks again.'),
  (36,7.1,'Install the public SDK. Build a browser, Node, or M C P reader that verifies Arkiv records locally.'),
]
timing=[]
for i,(start,limit,text) in enumerate(cues):
  speed=.93 if i==4 else 1.03
  for attempt in range(5):
    audio,sr=engine.create(text,voice='af_heart',speed=speed,lang='en-us')
    assert sr==rate
    duration=len(audio)/sr
    if duration<=limit:break
    speed*=duration/limit*1.015
  if duration>limit+.05:
    raise RuntimeError('Release narration exceeds its scene budget')
  at=round((start+.18)*rate)
  chapter[at:at+len(audio)]+=audio
  timing.append({'id':'release-'+str(i+1),'start':78+start+.18,'duration':round(duration,3),'text':text,'speed':round(speed,3)})
  print(json.dumps({'release_voice':i+1,'seconds':round(duration,3)}),flush=True)
old,sr=sf.read(root/'.local/graph-journey/public/narration.wav',dtype='float32')
assert sr==rate
voice=np.concatenate([old[:78*rate],chapter,old[90*rate:96*rate]])
sf.write(public/'narration.wav',voice,rate)
score,sr=sf.read(root/'.local/graph-journey/public/score.wav',dtype='float32',always_2d=True)
parts=[score[:78*sr].copy(),score[8*sr:52*sr].copy(),score[90*sr:96*sr].copy()]
fade=int(.01*sr)
for left,right in zip(parts,parts[1:]):
  left[-fade:]*=np.linspace(1,0,fade)[:,None]
  right[:fade]*=np.linspace(0,1,fade)[:,None]
sf.write(public/'score.wav',np.concatenate(parts),sr)
license=json.loads((root/'.local/graph-journey/public/score.wav.license.json').read_text(encoding='utf-8'))
license.update(file='score.wav',derived_from='Original Arkiv Graph score; existing0–78s, original8–52s arranged for the release, existing90–96s closing cadence. No external reference audio.')
(public/'score.wav.license.json').write_text(json.dumps(license,indent=2),encoding='utf-8')
old_timing=json.loads((root/'.local/graph-journey/voice-timing.json').read_text(encoding='utf-8'))
all_timing=[row for row in old_timing if row['start']<78]+timing
for row in old_timing:
  if row['start']>=90:
    copy=dict(row);copy['start']+=32;all_timing.append(copy)
(work/'voice-timing.json').write_text(json.dumps(sorted(all_timing,key=lambda row:row['start']),indent=2),encoding='utf-8')
spec=json.loads((root/'.local/graph-journey/mix.json').read_text(encoding='utf-8'))
spec['duration']=128
spec['tracks'][0]['file']='public/narration.wav'
spec['tracks'][1]['file']='public/score.wav'
spec['tracks'][1]['gain_points']=[row for row in spec['tracks'][1]['gain_points'] if row[0]<78]+[[127.2,0],[127.6,-18],[127.85,-60],[128,-60]]
spec['tracks'][1]['gain_points']=sorted(spec['tracks'][1]['gain_points']+[[90.6,0],[91,-6],[91.9,-6],[92.3,0],[96.6,0],[97,-5],[97.9,-5],[98.3,0]],key=lambda row:row[0])
spec['sections']={'hook':0,'infrastructure':8,'context':20,'AI_journey':32,'application':56,'gate':72,'two_readers':78,'accepted_reads':84,'withdrawal':92,'B_refused':98,'A_refused':103,'observation_scope':108,'npm':114,'close':122}
(work/'mix.json').write_text(json.dumps(spec,indent=2),encoding='utf-8')
print(json.dumps({'duration':128,'new_chapter':[78,122],'original_music_arranged':True,'synthetic_voice':'Kokoro af_heart'}))
