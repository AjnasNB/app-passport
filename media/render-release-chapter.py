"""Prepare, inspect or render the evidence-bound two-client/npm chapter.

Uses the installed OpenMontage Remotion composer. It never changes public media.
The input capture.json is operator evidence, not a synthetic result fixture.
"""
from pathlib import Path
import argparse, base64, hashlib, json, os, shutil, sys

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--capture', default=str(ROOT / '.local/two-client-recording/capture.json'))
parser.add_argument('--session', default=str(ROOT / 'apps/web/public/data/two-client-session.json'))
parser.add_argument('--npm-proof', default=str(ROOT / '.local/npm-release/registry-proof.json'))
parser.add_argument('--browser-checks', default=str(ROOT / '.local/two-client-live-recording/browser-checks.json'))
parser.add_argument('--lifecycle-only', action='store_true')
parser.add_argument('--npm-only', action='store_true')
parser.add_argument('--opening-fix', action='store_true')
parser.add_argument('--close-only', action='store_true')
parser.add_argument('--prepare-only', action='store_true')
parser.add_argument('--snapshots', action='store_true')
args = parser.parse_args()

def load(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))

if args.lifecycle_only and args.npm_only:raise ValueError('Choose one partial chapter.')
capture, session, browser = load(args.capture), load(args.session), load(args.browser_checks)
npm = {'name':'@ajnasnb/arkiv-graph','version':'0.3.0','published':False} if args.lifecycle_only else load(args.npm_proof)
if session['status'] != 'completed':
    raise ValueError('A completed real three-transaction session is required.')
if capture['session_id'] != session['session_id']:
    raise ValueError('Capture and signed session identifiers differ.')
if len(session['transactions']) != 3 or len(session['observations']) != 4:
    raise ValueError('Expected passport, review, withdrawal and four ordered observations.')
observations = session['observations']
if [(r['consumer'],r['admission']['allowed']) for r in observations] != [('A',True),('B',True),('B',False),('A',False)]:
    raise ValueError('Actual observations do not establish A/B acceptance then B/A refusal.')
if not all(r['admission']['status'] == 'withdrawn' for r in observations[2:]):
    raise ValueError('The refused requests must identify the withdrawn review.')
withdrawal = next(t for t in session['transactions'] if t['kind']=='withdrawal')
if not args.lifecycle_only and (npm.get('name') != '@ajnasnb/arkiv-graph' or npm.get('version') != '0.3.0' or npm.get('published') is not True):
    raise ValueError('Exact npm registry publication proof required; do not show an unpublished release.')

montage = Path(os.environ['OPENMONTAGE_ROOT']).resolve()
sys.path.insert(0,str(montage))
from tools.video.video_compose import VideoCompose
composer = montage / 'remotion-composer'
stage = composer / 'projects/arkiv-two-client-release'
work = ROOT / '.local/graph-release'
public = work / 'public'
stage.mkdir(parents=True,exist_ok=True)
public.mkdir(parents=True,exist_ok=True)
shutil.copyfile(ROOT/'media/two-client-motion.tsx',stage/'two-client-motion.tsx')

cuts = {}
for key, seconds in [('accepted',8),('b_refused',5),('a_refused',5)]:
    cut = capture['cuts'][key]
    source = Path(cut.get('video',capture.get('video',''))).resolve()
    if not source.is_file():
        raise ValueError('A real recording is missing: '+key)
    target_name = key + source.suffix
    shutil.copyfile(source,public/target_name)
    start, duration = float(cut['start']), float(cut['duration'])
    if start < 0 or not .75*seconds <= duration <= 1.25*seconds:
        raise ValueError('Capture duration is outside the honest playback range: '+key)
    crop = cut['crop']
    width,height = int(capture['width']),int(capture['height'])
    if not (0 <= crop['x'] and 0 <= crop['y'] and crop['width'] > 0 and crop['height'] > 0 and crop['x']+crop['width'] <= width and crop['y']+crop['height'] <= height):
        raise ValueError('Recording crop exceeds source frame: '+key)
    if abs(crop['width']/crop['height'] - 1736/650) > .04:
        raise ValueError('Use a 2.671:1 crop to preserve readable framing: '+key)
    cuts[key] = {'file':target_name,'start':start,'duration':duration,'source_width':width,'source_height':height,'crop':crop}

if browser.get('passed') is not True or len(browser['requests'])!=4 or not all(r['status']==200 and r['session_id']==session['session_id'] for r in browser['requests']):
    raise ValueError('Four successful actual-browser reads of this session are required.')
clients = []
for client in ['A','B']:
    before = next(r for r in observations if r['consumer']==client and r['phase']=='before-withdrawal')
    after = next(r for r in observations if r['consumer']==client and r['phase']=='after-withdrawal')
    reads=[r for r in browser['requests'] if r['url'].endswith('consumer='+client)]
    if len(reads)!=2:raise ValueError('Expected before/after browser reads for '+client)
    clients.append({'id':client,'before':before['admission']['status'],'after':after['admission']['status'],'before_block':str(reads[0]['block']),'after_block':str(reads[1]['block'])})
evidence = {
    'session_id':session['session_id'], 'graph_digest':session['graph']['graph_digest'],
    'withdrawal':{'tx_hash':withdrawal['tx_hash'],'entity_key':withdrawal['entity_key'],'block':str(withdrawal['created_at_block'])},
    'clients':clients,'captures':cuts,
    'npm':{'name':npm['name'],'version':npm['version'],'published':npm['published'],'registry_url':'https://www.npmjs.com/package/@ajnasnb/arkiv-graph/v/0.3.0'},
}
(work/'evidence.json').write_text(json.dumps(evidence,indent=2),encoding='utf-8')
font = next((ROOT/'apps/web/public/fonts').glob('*.woff2'))
font_url = 'data:font/woff2;base64,'+base64.b64encode(font.read_bytes()).decode()
entry = """import React from 'react';import{Composition,registerRoot,AbsoluteFill,Sequence}from'remotion';
import{TwoClientChapter,NpmChapter,type TwoClientFilmEvidence}from'./two-client-motion';
const evidence=EVIDENCE as unknown as TwoClientFilmEvidence;
function Film(){return <AbsoluteFill><style>{`@font-face{font-family:DM Sans;src:url('FONT')format('woff2');font-weight:100 900}`}</style><Sequence durationInFrames={1080}><TwoClientChapter evidence={evidence}/></Sequence><Sequence from={1080} durationInFrames={240}><NpmChapter evidence={evidence}/></Sequence></AbsoluteFill>}
registerRoot(()=><Composition id='TwoClientRelease' component={Film} durationInFrames={FRAMECOUNT} fps={30} width={1920} height={1080}/>);
""".replace('EVIDENCE',json.dumps(evidence,ensure_ascii=False)).replace('FONT',font_url)
seconds=6 if args.opening_fix or args.close_only else 36 if args.lifecycle_only else 8 if args.npm_only else 44
if args.lifecycle_only:
    entry=entry.replace("<Sequence from={1080} durationInFrames={240}><NpmChapter evidence={evidence}/></Sequence>","")
if args.npm_only:
    entry=entry.replace("<Sequence durationInFrames={1080}><TwoClientChapter evidence={evidence}/></Sequence>","").replace("from={1080}","from={0}")
entry=entry.replace('FRAMECOUNT',str(seconds*30))
if args.close_only:
    shutil.copyfile(ROOT/'media/graph-motion.tsx',stage/'graph-motion.tsx')
    entry="import React from'react';import{AbsoluteFill,Composition,registerRoot}from'remotion';import{Close}from'./graph-motion';function Film(){return <AbsoluteFill><style>{`@font-face{font-family:DM Sans;src:url('"+font_url+"')format('woff2');font-weight:100 900}`}</style><Close/></AbsoluteFill>}registerRoot(()=><Composition id='TwoClientRelease' component={Film} durationInFrames={180} fps={30} width={1920} height={1080}/>);"
(stage/'index.tsx').write_text(entry,encoding='utf-8')
(work/('source-proof-close.json' if args.close_only else 'source-proof-opening.json' if args.opening_fix else 'source-proof-npm.json' if args.npm_only else 'source-proof-lifecycle.json' if args.lifecycle_only else 'source-proof.json')).write_text(json.dumps({'motion_sha256':hashlib.sha256((ROOT/'media/two-client-motion.tsx').read_bytes()).hexdigest(),'close_motion_sha256':hashlib.sha256((ROOT/'media/graph-motion.tsx').read_bytes()).hexdigest() if args.close_only else None,'session_file_sha256':hashlib.sha256(Path(args.session).read_bytes()).hexdigest(),'capture_file_sha256':hashlib.sha256(Path(args.capture).read_bytes()).hexdigest(),'browser_checks_sha256':hashlib.sha256(Path(args.browser_checks).read_bytes()).hexdigest(),'npm_proof_sha256':None if args.lifecycle_only else hashlib.sha256(Path(args.npm_proof).read_bytes()).hexdigest(),'duration':seconds,'frames':seconds*30,'fps':30,'npm_published':npm['published']},indent=2),encoding='utf-8')
if args.prepare_only:
    print(json.dumps({'prepared':True,'entry':str(stage/'index.tsx'),'evidence':str(work/'evidence.json')}))
    sys.exit()

class LocalRenderer(VideoCompose):
    def run_command(self,cmd,*,timeout=None,cwd=None):
        if cmd[:3]==['npx','remotion','render']:
            cmd=[shutil.which('node'),str(composer/'node_modules/@remotion/cli/remotion-cli.js'),*cmd[2:],'--browser-executable=C:/Program Files/Google/Chrome/Application/chrome.exe','--pixel-format=yuv420p','--color-space=bt709','--log=error']
        return super().run_command(cmd,timeout=timeout,cwd=cwd)
tool=LocalRenderer()
if args.snapshots:
    frames=[150] if args.opening_fix or args.close_only else [150,345,555,705,855,1047] if args.lifecycle_only else [170] if args.npm_only else [150,345,555,705,855,1047,1250]
    for frame in frames:
        result=tool.run_command([shutil.which('node'),str(composer/'node_modules/@remotion/cli/remotion-cli.js'),'still',str(stage/'index.tsx'),'TwoClientRelease',str(work/f'chapter-{frame}.png'),'--frame='+str(frame),'--public-dir='+str(public),'--browser-executable=C:/Program Files/Google/Chrome/Application/chrome.exe','--scale=.67','--log=error'],timeout=120,cwd=composer)
        if result.returncode!=0:
            raise RuntimeError('Release snapshot failed: '+str(result.stderr)[-1000:])
    print(json.dumps({'snapshot_frames':frames}))
    sys.exit()
filename='closing-fix.mp4' if args.close_only else 'opening-fix.mp4' if args.opening_fix else 'lifecycle-chapter.mp4' if args.lifecycle_only else 'npm-chapter.mp4' if args.npm_only else 'two-client-chapter.mp4'
result=tool._render_via_atelier({'output_path':str(work/filename)},{'render_runtime':'remotion','composition_mode':'atelier','total_duration':seconds,'bespoke':{'entry':str(stage/'index.tsx'),'composition_id':'TwoClientRelease','public_dir':str(public),'crf':21,'concurrency':2,'art_direction':'Native branching graph, actual recorded accepted client reads, signed withdrawal severs review path, actual next B then A refused reads. npm only appears after registry proof. Scope limitations remain explicit.'}})
(work/(filename+'.report.json')).write_text(json.dumps({'success':result.success,'data':result.data,'error':result.error},indent=2,default=str),encoding='utf-8')
print(json.dumps({'render_success':result.success,'chapter_seconds':seconds}))
sys.exit(0 if result.success else 1)
