import json
from pathlib import Path
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro
root=Path(__file__).resolve().parent.parent
work=root/'.local/graph-launch'
(work/'public').mkdir(parents=True,exist_ok=True)
cache=Path.home()/'.cache/hyperframes/tts'
engine=Kokoro(str(cache/'models/kokoro-v1.0.onnx'),str(cache/'voices/voices-v1.0.bin'))
scenes=[
 (0,8,'Your data has connections. Your AI needs context. I built Arkiv Graph to bring them together.'),
 (8,12,'Built on Arkiv, it connects signed records into graphs. A complete manifest lets another reader verify every member and relationship.'),
 (20,12,'Follow a task to its context and original sources. Verify the bytes, then deliver bounded evidence to AI. Only selected, verified context reaches the model.'),
 (32,6.5,'AI Passport puts it to work. A real model builds a guard that passes six boundary tests.'),
 (38.5,4.5,'The graph links this learning tool to its original sources.'),
 (43,5,'Its safety game cites the original NPCI guidance.'),
 (48,6,'Withdraw a required review, and this evidence gate stops inference.'),
 (54,12,'The SDK and MCP read Arkiv directly. Choose your accepted authors and graph revision. Build another application on the same infrastructure.'),
 (66,6,'Arkiv Graph. Connected evidence for useful AI. Try it now.')
]
rate=24000;mix=np.zeros(rate*72,dtype=np.float32);report=[]
for i,(start,slot,text) in enumerate(scenes):
 speed=1.03
 for attempt in range(5):
  audio,sr=engine.create(text,voice='af_heart',speed=speed,lang='en-us')
  duration=len(audio)/sr
  if duration<=slot-.6:break
  speed*=duration/(slot-.6)*1.025
 if duration>slot-.4:raise RuntimeError('Narration does not fit cue')
 at=round((start+.2)*rate);mix[at:at+len(audio)]+=audio
 report.append({'id':i+1,'start':start+.2,'duration':round(duration,3),'text':text,'speed':round(speed,3)})
 print(json.dumps({'voice_segment':i+1,'duration':round(duration,3)}),flush=True)
sf.write(work/'public/narration.wav',mix,rate)
(work/'voice-timing.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
