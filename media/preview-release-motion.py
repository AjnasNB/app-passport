"""Render three native-motion review frames bound to actual session observations.

This deliberately excludes npm and recorded UI until their inputs are available.
"""
from pathlib import Path
import base64, json, os, shutil, subprocess
root=Path(__file__).resolve().parent.parent
session=json.loads((root/'apps/web/public/data/two-client-session.json').read_text(encoding='utf-8'))
assert session['status']=='completed'
tx=next(t for t in session['transactions'] if t['kind']=='withdrawal')
clients=[]
for client in ['A','B']:
  before=next(r for r in session['observations'] if r['consumer']==client and r['phase']=='before-withdrawal')
  after=next(r for r in session['observations'] if r['consumer']==client and r['phase']=='after-withdrawal')
  clients.append({'id':client,'before':before['admission']['status'],'after':after['admission']['status'],'before_block':str(before['read']['block']),'after_block':str(after['read']['block'])})
evidence={'session_id':session['session_id'],'graph_digest':session['graph']['graph_digest'],'withdrawal':{'tx_hash':tx['tx_hash'],'entity_key':tx['entity_key'],'block':str(tx['created_at_block'])},'clients':clients}
composer=Path(os.environ['OPENMONTAGE_ROOT']).resolve()/'remotion-composer'
stage=composer/'projects/arkiv-two-client-preview'
work=root/'.local/graph-release-preview'
stage.mkdir(parents=True,exist_ok=True);work.mkdir(parents=True,exist_ok=True)
shutil.copyfile(root/'media/two-client-motion.tsx',stage/'two-client-motion.tsx')
font=next((root/'apps/web/public/fonts').glob('*.woff2'))
font_url='data:font/woff2;base64,'+base64.b64encode(font.read_bytes()).decode()
entry="""import React from'react';import{AbsoluteFill,Composition,registerRoot}from'remotion';import{MotionPreview,type TwoClientFilmEvidence}from'./two-client-motion';const evidence=EVIDENCE as unknown as TwoClientFilmEvidence;function Film({part}:{part:'branch'|'withdrawal'|'scope'}){return <AbsoluteFill><style>{`@font-face{font-family:DM Sans;src:url('FONT')format('woff2');font-weight:100 900}`}</style><MotionPreview evidence={evidence} part={part}/></AbsoluteFill>}registerRoot(()=> <><Composition id='Branch' component={Film} defaultProps={{part:'branch'}} durationInFrames={180} fps={30} width={1920} height={1080}/><Composition id='Withdrawal' component={Film} defaultProps={{part:'withdrawal'}} durationInFrames={180} fps={30} width={1920} height={1080}/><Composition id='Scope' component={Film} defaultProps={{part:'scope'}} durationInFrames={180} fps={30} width={1920} height={1080}/></>);""".replace('EVIDENCE',json.dumps(evidence)).replace('FONT',font_url)
(stage/'index.tsx').write_text(entry,encoding='utf-8')
for name in ['Branch','Withdrawal','Scope']:
  result=subprocess.run([shutil.which('node'),str(composer/'node_modules/@remotion/cli/remotion-cli.js'),'still',str(stage/'index.tsx'),name,str(work/(name.lower()+'.png')),'--frame=155','--browser-executable=C:/Program Files/Google/Chrome/Application/chrome.exe','--scale=.67','--log=error'],capture_output=True,text=True,cwd=composer,timeout=120)
  if result.returncode!=0:raise RuntimeError('Native review frame failed: '+result.stderr[-1000:])
print(json.dumps({'native_snapshots':3,'directory':str(work),'session_id':session['session_id'],'no_npm_claim':True}))
