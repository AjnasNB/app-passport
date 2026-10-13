import json
from pathlib import Path
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro
root=Path(__file__).resolve().parent.parent
work=root/'.local/passport-film'
(work/'public').mkdir(parents=True,exist_ok=True)
cache=Path.home()/'.cache/hyperframes/tts'
engine=Kokoro(str(cache/'models/kokoro-v1.0.onnx'),str(cache/'voices/voices-v1.0.bin'))
scenes=[(0,9,'Your next AI agent should know exactly which tools and context it receives. A familiar name is not enough.'),(9,9,'I built App Passport, using Qarinah for local context and Arkiv for signed, current review records.'),(18,10,'Here is a real Qarinah packet, compiled from a synthetic repository. Verify it against live evidence.'),(28,10,'Change the source, modify the packet, or withdraw a review. The same policy stops the handoff.'),(38,10,'Ten real tool artifacts pass controlled protocol checks. Change a file, and its passport no longer matches.'),(48,10,'A second application can use the SDK and read Arkiv directly. No website account or signing wallet is needed.'),(58,12,'Private memory stays local. The public demo uses free testnet tokens. App Passport. Know what your AI uses.')]
rate=24000;mix=np.zeros(rate*70,dtype=np.float32);report=[]
for i,(start,slot,text) in enumerate(scenes):
 speed=1.0
 for attempt in range(4):
  audio,sr=engine.create(text,voice='af_heart',speed=speed,lang='en-us')
  duration=len(audio)/sr
  if duration<=slot-.9:break
  speed*=duration/(slot-.9)*1.03
 if duration>slot-.5:raise RuntimeError('Voice does not fit its window')
 at=round((start+.4)*rate);mix[at:at+len(audio)]+=audio
 report.append({'start':start+.4,'duration':round(duration,3),'text':text})
 print(json.dumps({'voice_segment':i+1,'duration':round(duration,3)}),flush=True)
sf.write(work/'public/narration.wav',mix,rate)
(work/'voice-timing.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
