"""Build semantic subtitle clauses from the script and measured speech timing."""
from pathlib import Path
import json,textwrap
work=Path(__file__).resolve().parent.parent/'.local/graph-launch'
timing=json.loads((work/'voice-timing.json').read_text(encoding='utf-8'))
heard=json.loads((work/'voice/readback-final.json').read_text(encoding='utf-8'))
lines=[];cues=[]
for t in timing:
 tokens=t['text'].split();a=t['start'];b=a+t['duration']
 words=[w for w in heard['words'] if a-.2<=w['start']<b+.15]
 aligned=len(words)==len(tokens)
 groups=[];group=[]
 for i,token in enumerate(tokens):
  if group and len(' '.join([x[1] for x in group]+[token]))>78:
   groups.append(group);group=[]
  group.append((i,token))
 if group:groups.append(group)
 if len(groups)>1 and len(groups[-1])<3:
  moved=groups[-2].pop();groups[-1].insert(0,moved)
 def at(i):return words[i]['start'] if aligned else a+(b-a)*i/len(tokens)
 for g in groups:
  start=at(g[0][0]);end=at(g[-1][0]+1) if g[-1][0]+1<len(tokens) else b
  text=' '.join(x[1] for x in g);cues.append({'start':max(0,start-.05),'end':end,'text':text})
 lines.append({'id':'line-'+str(t['id']),'start':a,'end':b,'text':t['text'],'words':[{'start':w['start'],'end':w['end']} for w in words] if aligned else []})
for i,c in enumerate(cues):
 next_start=cues[i+1]['start'] if i+1<len(cues) else 71.8
 c['end']=min(next_start-.03,max(c['end'],c['start']+len(c['text'])/19.5))
 if c['end']<=c['start']:raise RuntimeError('Invalid subtitle interval')
def ts(s):
 ms=round(s*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);sec,ms=divmod(ms,1000);return f'{h:02}:{m:02}:{sec:02},{ms:03}'
subtitle=[]
for i,c in enumerate(cues):
 text='\n'.join(textwrap.wrap(c['text'],width=42,break_long_words=False));subtitle.append(f"{i+1}\n{ts(c['start'])} --> {ts(c['end'])}\n{text}\n")
(work/'arkiv-graph-launch-2.srt').write_text('\n'.join(subtitle),encoding='utf-8')
(work/'voice/timeline.json').write_text(json.dumps({'lines':lines},indent=2),encoding='utf-8')
(work/'caption-check.json').write_text(json.dumps({'cues':len(cues),'maximum_chars_per_second':max(len(c['text'])/(c['end']-c['start']) for c in cues),'maximum_line_chars':max(len(l) for c in cues for l in textwrap.wrap(c['text'],42))},indent=2),encoding='utf-8')
print((work/'caption-check.json').read_text())
