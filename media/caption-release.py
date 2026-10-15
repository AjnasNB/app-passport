"""Build release subtitles from measured synthesis timing and independent read-back."""
from pathlib import Path
import argparse, json, re, textwrap
root=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser()
parser.add_argument('--work',default=str(root/'.local/graph-release'))
parser.add_argument('--final',default=str(root/'.local/graph-release-final'))
parser.add_argument('--duration',type=float,default=128)
args=parser.parse_args()
work=Path(args.work);final=Path(args.final)
final.mkdir(exist_ok=True)
timing=json.loads((work/'voice-timing.json').read_text(encoding='utf-8'))
heard=json.loads((work/'readback.json').read_text(encoding='utf-8'))
cues=[]
lines=[]
for row in timing:
  a=row['start'];b=a+row['duration'];caption_text=row['text'].replace('M C P','MCP');tokens=caption_text.split()
  words=[w for w in heard['words'] if a-.2<=w['start']<b+.15]
  aligned=len(words)==len(tokens)
  groups=[];group=[]
  for i,token in enumerate(tokens):
    if group and len(' '.join(x[1] for x in group)+' '+token)>78:
      groups.append(group);group=[]
    group.append((i,token))
  if group:groups.append(group)
  if len(groups)>1 and len(groups[-1])<3:groups[-1].insert(0,groups[-2].pop())
  def at(i):return words[i]['start'] if aligned else a+(b-a)*i/len(tokens)
  for group in groups:
    start=at(group[0][0])
    end=at(group[-1][0]+1) if group[-1][0]+1<len(tokens) else b
    cues.append({'start':max(0,start-.05),'end':end,'text':' '.join(x[1] for x in group)})
  lines.append({'id':str(row['id']),'start':a,'end':b,'text':caption_text})
for i,cue in enumerate(cues):
  next_start=cues[i+1]['start'] if i+1<len(cues) else args.duration-.2
  cue['end']=min(next_start-.03,max(cue['end'],cue['start']+len(cue['text'])/19.5))
  if cue['end']<=cue['start']:raise RuntimeError('Invalid caption interval')
def ts(seconds):
  ms=round(seconds*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
  return f'{h:02}:{m:02}:{s:02},{ms:03}'
subtitle='\n'.join(f"{i+1}\n{ts(c['start'])} --> {ts(c['end'])}\n"+'\n'.join(textwrap.wrap(c['text'],42,break_long_words=False))+'\n' for i,c in enumerate(cues))
(final/'arkiv-graph-launch.srt').write_text(subtitle,encoding='utf-8')
(final/'arkiv-graph-launch.vtt').write_text('WEBVTT\n\n'+re.sub(r'(\d{2}:\d{2}:\d{2}),(\d{3})',r'\1.\2',subtitle),encoding='utf-8')
(final/'voice').mkdir(exist_ok=True)
(final/'voice/timeline.json').write_text(json.dumps({'lines':lines},indent=2),encoding='utf-8')
print(json.dumps({'cues':len(cues),'maximum_chars_per_second':max(len(c['text'])/(c['end']-c['start']) for c in cues),'overlaps':sum(cues[i]['end']>cues[i+1]['start'] for i in range(len(cues)-1))}))
