import json
from pathlib import Path
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro
root=Path(__file__).resolve().parent.parent
work=root/'.local/ai-film'
(work/'public').mkdir(parents=True,exist_ok=True)
cache=Path.home()/'.cache/hyperframes/tts'
engine=Kokoro(str(cache/'models/kokoro-v1.0.onnx'),str(cache/'voices/voices-v1.0.bin'))
scenes=[(0,9,'An AI answer needs a trail. Which memory, which tool, and which source did it use?'),(9,9,'I built AI Passport: useful AI, selected Qarinah memory, and a shared evidence graph on Arkiv.'),(18,10,'This is the live application. A real model builds a release guard, and six boundary tests check it.'),(28,10,'Withdraw the review, change the source, or modify the packet. The evidence gate stops inference.'),(38,10,'India number learning uses exact arithmetic. UPI Safety Quest is a playable game, with an optional AI coach.'),(48,14,'Signed nodes connect sources, context, tools, and real runs. A separate SDK or MCP client reads Arkiv directly, using its own accepted authors.'),(62,13,'Ten real tools tested. Eight live flow checks. Seventy one local checks. Private memory stays local. AI Passport. Run AI. Trace its inputs.')]
rate=24000;mix=np.zeros(rate*75,dtype=np.float32);report=[]
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
