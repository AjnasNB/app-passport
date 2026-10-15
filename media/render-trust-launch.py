"""Evidence-bound 162 s launch film, composed through local OpenMontage/Remotion.

Prepare a source ledger and deterministic scenes before rendering. Public artifacts
are never overwritten. Captures must be real owned-product recordings; the guard
illustrations and controlled fault replays remain visibly labelled.
"""
from pathlib import Path
import argparse, base64, hashlib, json, os, shutil, sys

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_WORK = ROOT / '.local/media-trust-refresh'
FPS = 30
SCENES = [
    dict(id='hook', start=0, duration=8, title='Approval can go stale.', kind='Process illustration',
         narration='An AI tool can keep yesterday’s approval after the evidence changes. How does the next reader know?',
         sources=['apps/web/public/data/two-client-session.json']),
    dict(id='infrastructure', start=8, duration=12, title='Shared records. Connected evidence.', kind='Architecture illustration',
         narration='I built Arkiv Graph: a graph SDK over Arkiv’s public indexed entities. Signed manifests bind every graph member. Readers assemble and traverse the graph locally.',
         sources=['packages/arkiv-graph/src/index.ts', 'arkiv/schema.md']),
    dict(id='ai', start=20, duration=12, title='Useful AI, grounded in source.', kind='Recorded live application',
         narration='AI Passport checks approval before inference. It links untrusted Qarinah context to source bytes. Try coding guards, rupee tools, and UPI safety.',
         sources=['apps/web/public/data/ai-journey-run.json', 'apps/web/public/data/browser-evaluation.json']),
    dict(id='lifecycle', start=32, duration=12, title='The next task checks again.', kind='Historical recorded lifecycle + process illustration',
         narration='In the recorded testnet lifecycle, two project-operated readers first admitted the task. A real review withdrawal followed. Each reader’s next request refused it. These guards are deterministic.',
         sources=['apps/web/public/data/two-client-session.json']),
    dict(id='roots', start=44, duration=20, title='Authorize change. Remember history.', kind='Process illustration · actual signed revisions',
         narration='Root updates now follow a pinned authority and scope. Signed revisions link the previous digest and root. A retained checkpoint rejects observed rollback. Two revisions and their tiny graphs were published together, in one transaction. The larger AI graph remains pinned.',
         sources=['apps/web/public/data/root-trust-config.json', 'apps/web/public/data/root-update-publication.json']),
    dict(id='root-read', start=64, duration=8, title='Read the real registry.', kind='Recorded live application · fresh RPC read',
         narration='The live reader verifies both signed revisions at one explicit snapshot, then reconstructs the complete current graph.',
         sources=['apps/web/public/data/trust-safeguards.json', 'apps/web/public/data/root-update-publication.json']),
    dict(id='root-controls', start=72, duration=8, title='Rollback or tampering? Refuse.', kind='Recorded app · controlled signed-evidence replay',
         narration='Controlled replays hide the newer head or edit signed root bytes. Both are refused. This is a local test.',
         sources=['apps/web/public/data/trust-safeguards.json', 'apps/web/public/data/browser-evaluation.json']),
    dict(id='journal', start=80, duration=18, title='A withdrawal is not forgotten.', kind='Process illustration · controlled safeguards',
         narration='A signed withdrawal can arrive before its target. The journal retains it, then checks it when the review reappears. State must persist before admission. A shared browser lock serializes tab updates. Deleting local history still removes this protection.',
         sources=['apps/web/public/data/trust-safeguards.json', 'apps/web/public/data/browser-evaluation.json', 'apps/web/src/two-client-model.ts', 'apps/web/src/TrustPanel.tsx']),
    dict(id='refusal', start=98, duration=14, title='Fresh reads still refuse.', kind='Recorded live application · current verification',
         narration='Here the deployed app reads the public session again and refuses a new task. The historical acceptance stays visible as history. Both clients and signing wallets are project-controlled; external adoption is not claimed.',
         sources=['apps/web/public/data/two-client-session.json', 'apps/web/public/data/browser-evaluation.json']),
    dict(id='mobile', start=112, duration=16, title='Measured in a mobile lab.', kind='Project-run simulated mobile lab measurements',
         narration='Repeated checks must stay usable on mobile. Eighteen simulated audits: three cold loads per route and phase. Median scores reached ninety-eight, ninety-eight, and ninety-six. Desktop lab results, not physical-phone or field data.',
         sources=['apps/web/public/data/mobile-performance.json']),
    dict(id='why', start=128, duration=14, title='Why Arkiv?', kind='Architecture illustration',
         narration='A hash identifies bytes. A private database depends on its operator. Arkiv provides shared indexed discovery. Readers can bypass our API. The SDK adds graph verification and AI context.',
         sources=['README.md', 'apps/web/public/data/backend-independence.json', 'arkiv/friction.md']),
    dict(id='npm', start=142, duration=12, title='Install. Reproduce. Build.', kind='Verified public npm releases',
         narration='Install Arkiv Graph zero point four, or AI Passport zero point six. Public schemas, queries and evidence make the demo reproducible. Outside usage is not yet proven.',
         sources=['apps/web/public/data/npm-release.json', 'apps/web/public/data/npm-trust-consumer.json']),
    dict(id='close', start=154, duration=8, title='Trust has a boundary.', kind='Current deployment trust disclosure',
         narration='One RPC remains trusted. Unseen omissions remain possible. Build your own reader.',
         sources=['apps/web/public/data/trust-safeguards.json']),
]

def load(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))

def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def evidence_from_public():
    pub = ROOT / 'apps/web/public/data'
    root, trust, mobile, npm, session, ai = [load(pub / f) for f in [
        'root-update-publication.json', 'trust-safeguards.json', 'mobile-performance.json',
        'npm-release.json', 'two-client-session.json', 'ai-journey-run.json']]
    assert root['entities'] == 8 and root['transactions'] == 1
    assert len(root['revisions']) == 2 and [r['payload']['sequence'] for r in root['revisions']] == [1, 2]
    assert [(len(g['nodes']), len(g['edges'])) for g in root['graphs']] == [(1,0),(2,1)]
    assert trust['passed'] == trust['total'] and trust['live']['provider_count'] == 1
    assert trust['live']['revision_count'] == 2
    assert mobile['sample_count'] == 18
    assert session['status'] == 'completed'
    assert ai['inference_run'] is True and ai['coding']['passed'] is True and len(ai['coding']['cases']) == 6
    assert [(r['consumer'], r['admission']['allowed']) for r in session['observations']] == [('A', True), ('B', True), ('B', False), ('A', False)]
    versions = {p['name']: p['version'] for p in npm['packages'] if p['published'] and p['reviewed_tarball_match']}
    assert versions == {'@ajnasnb/arkiv-graph': '0.4.0', '@ajnasnb/ai-passport': '0.6.0'}
    baseline = mobile['baseline']['routes']
    final = mobile.get('final', mobile.get('candidate', {}))['routes']
    measurements = []
    for before in baseline:
        after = next(r for r in final if r['route'] == before['route'])
        measurements.append(dict(route=before['route'], path=before['path'], before=before['median']['score'],
                                 after=after['median']['score'], lcp_ms=after['median']['largest-contentful-paint']))
    assert [r['before'] for r in measurements] == [87, 88, 41]
    assert [r['after'] for r in measurements] == [98, 98, 96]
    tx = next(t for t in session['transactions'] if t['kind'] == 'withdrawal')
    return dict(root=root, trust=trust, mobile=dict(routes=measurements, sample_count=mobile['sample_count'],
                configuration=mobile['configuration'], limitations=mobile['limitations']), npm=npm,
                session=dict(id=session['session_id'], graph=session['graph'], withdrawal=tx, observations=session['observations']),
                ai=dict(model=ai['model'], source_count=len(ai['model_evidence']['sources']), chars=ai['memory_chars'],
                        cases=len(ai['coding']['cases']), selected_nodes=ai['graph_selection']['nodes'],
                        total_nodes=ai['graph_selection']['total_nodes'], graph_digest=ai['graph_digest']))

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--work', default=str(DEFAULT_WORK))
    parser.add_argument('--captures', default=str(DEFAULT_WORK / 'captures/manifest.json'))
    parser.add_argument('--art', default=str(DEFAULT_WORK/'art/01-cover.png'), help='Optional single generated conceptual art image, used only behind the opening symbol')
    parser.add_argument('--manifest-only', action='store_true')
    parser.add_argument('--prepare-only', action='store_true')
    parser.add_argument('--snapshots', action='store_true')
    parser.add_argument('--frames', help='Comma-separated film frame numbers for targeted still QA')
    parser.add_argument('--from-second', type=float)
    parser.add_argument('--to-second', type=float)
    parser.add_argument('--chrome', default=os.environ.get('PASSPORT_CHROME_PATH', 'C:/Program Files/Google/Chrome/Application/chrome.exe'))
    args = parser.parse_args()
    partial_frames = None
    if args.from_second is not None or args.to_second is not None:
        if args.from_second is None or args.to_second is None or not 0 <= args.from_second < args.to_second <= 162:
            raise ValueError('Both bounded --from-second and --to-second are required for a partial render.')
        partial_frames = (round(args.from_second*FPS), round(args.to_second*FPS)-1)
    work = Path(args.work).resolve()
    work.mkdir(parents=True, exist_ok=True)
    evidence = evidence_from_public()
    assert all(a['start'] + a['duration'] == b['start'] for a, b in zip(SCENES, SCENES[1:]))
    total = SCENES[-1]['start'] + SCENES[-1]['duration']
    assert total == 162
    source_paths = sorted({p for s in SCENES for p in s['sources']})
    for source_path in source_paths:
        if not (ROOT/source_path).is_file():
            raise ValueError('Claim source is missing: '+source_path)
    ledger = dict(schema='arkiv-graph.trust-launch.plan.v1', duration=total, fps=FPS,
                  frames=total*FPS, width=1920, height=1080, scenes=SCENES,
                  source_files=[dict(path=p, sha256=sha(ROOT/p)) for p in source_paths],
                  captures_contract={
                      'root': 'Real product recordings only. Record success before choosing source cut times. No synthetic UI.',
                      'entries': ['ai', 'root-read', 'root-controls', 'two-client-refusal', 'mobile'],
                      'entry_fields': {'video': 'Absolute local video path', 'start': 'seconds within source',
                                       'duration': 'seconds selected from source', 'width': 'source pixels', 'height': 'source pixels',
                                       'crop': {'x': 0, 'y': 0, 'width': 'crop pixels', 'height': 'crop pixels'},
                                       'evidence_kind': 'fresh-live-rpc | recorded-live-ai | controlled-signed-evidence-replay | recorded-mobile-ui'},
                  }, constraints=[
                      'The two root revisions were published together in one transaction, not two temporal deployments.',
                      'The root-update graphs are tiny public synthetic demonstrations; AI graph remains pinned.',
                      'Withdrawal omission and cross-tab states are controlled demonstrations, not an attack against a provider.',
                      'Historical lifecycle and fresh refusal are separate and labelled.',
                      'Single provider completeness and metadata trust remains. No unseen non-omission proof.',
                      'Mobile metrics are lab medians; there is no field INP, physical-phone, or outside customer usage claim.',
                      'Generated art is conceptual; deck slides are never animated into the film.',
                  ])
    (work/'scene-manifest.json').write_text(json.dumps(ledger, indent=2, ensure_ascii=False), encoding='utf-8')
    (work/'narration.json').write_text(json.dumps([dict(id=s['id'], start=s['start'], duration=s['duration'], text=s['narration']) for s in SCENES], indent=2, ensure_ascii=False), encoding='utf-8')
    if args.manifest_only:
        print(json.dumps(dict(manifest=str(work/'scene-manifest.json'), narration=str(work/'narration.json'), duration=total,
                              words=sum(len(s['narration'].split()) for s in SCENES))))
        return
    captures = load(args.captures)
    captures = captures.get('captures', captures.get('entries', captures))
    public = work/'public'
    public.mkdir(exist_ok=True)
    mapped = {}
    required = {'ai': 12, 'root-read': 8, 'root-controls': 8, 'two-client-refusal': 14, 'mobile': 16}
    for key, seconds in required.items():
        cut = captures[key]
        source = Path(cut['video']).resolve()
        if not source.is_file():
            raise ValueError('Missing real capture: '+key)
        width, height = int(cut['width']), int(cut['height'])
        crop = cut.get('crop', dict(x=0, y=0, width=width, height=height))
        if crop == dict(x=0, y=0, width=width, height=height):
            if key == 'root-read':
                crop = dict(x=240,y=544,width=750,height=240)
            elif key == 'root-controls':
                crop = dict(x=240,y=248,width=1120,height=405)
        assert crop['x'] >= 0 and crop['y'] >= 0 and crop['width'] > 0 and crop['height'] > 0
        assert crop['x']+crop['width'] <= width and crop['y']+crop['height'] <= height
        assert float(cut['start']) >= 0 and float(cut['duration']) > 0
        if 'evidence_kind' not in cut:
            raise ValueError('Capture requires explicit evidence_kind: '+key)
        target = key+source.suffix
        shutil.copyfile(source, public/target)
        camera = cut.get('camera')
        if key == 'ai' and not camera:
            camera = [dict(at=t, **frame) for t, frame in [
                (0, dict(x=780,y=0,width=620,height=190)),
                (3.35, dict(x=780,y=0,width=620,height=190)),
                (3.85, dict(x=200,y=25,width=1200,height=365)),
                (9.25, dict(x=200,y=25,width=1200,height=365)),
                (9.8, dict(x=780,y=0,width=620,height=190)),
            ]]
        if key == 'root-read' and not camera:
            camera = [dict(at=t, **frame) for t, frame in [
                (0, dict(x=240,y=544,width=750,height=240)),
                (2.2, dict(x=240,y=544,width=750,height=240)),
                (4.2, dict(x=520,y=657,width=472,height=89)),
                (5.4, dict(x=520,y=657,width=472,height=89)),
                (7.5, dict(x=240,y=544,width=750,height=240)),
            ]]
        if key == 'root-controls' and not camera:
            camera = [dict(at=t, **frame) for t, frame in [
                (0, dict(x=240,y=248,width=1120,height=405)),
                (1.15, dict(x=240,y=248,width=1120,height=405)),
                (2.85, dict(x=270,y=430,width=1080,height=220)),
                (5.0, dict(x=270,y=430,width=1080,height=220)),
                (7.3, dict(x=240,y=248,width=1120,height=405)),
            ]]
        if key == 'two-client-refusal' and not camera:
            camera = [dict(at=t, **frame) for t, frame in [
                (0, dict(x=202,y=383,width=1196,height=234)),
                (4.8, dict(x=202,y=383,width=1196,height=234)),
                (5.7, dict(x=202,y=580,width=1196,height=310)),
                (9.7, dict(x=202,y=580,width=1196,height=310)),
                (10.5, dict(x=202,y=383,width=1196,height=234)),
            ]]
        if camera:
            if not all(a['at'] < b['at'] for a,b in zip(camera,camera[1:])):
                raise ValueError('Camera keyframes must have increasing output times: '+key)
            for point in camera:
                assert 0 <= point['at'] <= seconds
                assert 0 <= point['x'] and 0 <= point['y'] and point['width'] > 0 and point['height'] > 0
                assert point['x']+point['width'] <= width and point['y']+point['height'] <= height
        mapped[key] = dict(file=target, start=float(cut['start']), duration=float(cut['duration']),
                           width=width, height=height, crop=crop, evidence_kind=cut['evidence_kind'],
                           camera=camera, source_sha256=sha(source), notes=cut.get('notes', ''))
    evidence['captures'] = mapped
    if args.art and Path(args.art).is_file():
        art = Path(args.art).resolve()
        shutil.copyfile(art, public/('concept-art'+art.suffix))
        evidence['art'] = 'concept-art'+art.suffix
    else:
        evidence['art'] = None
    montage = Path(os.environ.get('OPENMONTAGE_ROOT', str(ROOT.parent/'.local/media-work/openmontage'))).resolve()
    composer = montage/'remotion-composer'
    stage = composer/'projects/arkiv-trust-launch'
    stage.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ROOT/'media/trust-launch-motion.tsx', stage/'trust-launch-motion.tsx')
    font = next((ROOT/'apps/web/public/fonts').glob('*.woff2'))
    font_url = 'data:font/woff2;base64,'+base64.b64encode(font.read_bytes()).decode()
    entry = ("import React from'react';import{Composition,registerRoot,AbsoluteFill}from'remotion';"
             "import{TrustLaunch,type FilmEvidence}from'./trust-launch-motion';"
             "const evidence="+json.dumps(evidence, ensure_ascii=False)+" as unknown as FilmEvidence;"
             "function Film(){return <AbsoluteFill><style>{`@font-face{font-family:DM Sans;src:url('"+font_url+
             "')format('woff2');font-weight:100 900}`}</style><TrustLaunch evidence={evidence}/></AbsoluteFill>}"
             "registerRoot(()=><Composition id='ArkivTrustLaunch' component={Film} durationInFrames={4860} fps={30} width={1920} height={1080}/>);")
    (stage/'index.tsx').write_text(entry, encoding='utf-8')
    (work/'film-evidence.json').write_text(json.dumps(evidence, indent=2), encoding='utf-8')
    proof_name = 'source-proof.json' if partial_frames is None else f'source-proof-{partial_frames[0]}-{partial_frames[1]}.json'
    (work/proof_name).write_text(json.dumps(dict(
        motion_sha256=sha(ROOT/'media/trust-launch-motion.tsx'), renderer_sha256=sha(Path(__file__)),
        evidence_sha256=sha(work/'film-evidence.json'), manifest_sha256=sha(work/'scene-manifest.json'),
        duration=total if partial_frames is None else (partial_frames[1]-partial_frames[0]+1)/FPS,
        frames=total*FPS if partial_frames is None else partial_frames[1]-partial_frames[0]+1,
        frame_range=partial_frames, fps=FPS, captures=mapped), indent=2), encoding='utf-8')
    if args.prepare_only:
        print(json.dumps(dict(prepared=True, entry=str(stage/'index.tsx'), public=str(public), evidence=str(work/'film-evidence.json'))))
        return
    sys.path.insert(0, str(montage))
    from tools.video.video_compose import VideoCompose
    class LocalRenderer(VideoCompose):
        def run_command(self, cmd, *, timeout=None, cwd=None):
            if cmd[:3] == ['npx', 'remotion', 'render']:
                cmd = [shutil.which('node'), str(composer/'node_modules/@remotion/cli/remotion-cli.js'), *cmd[2:],
                       '--browser-executable='+args.chrome, '--pixel-format=yuv420p', '--color-space=bt709',
                       '--codec=h264', '--image-format=jpeg', '--jpeg-quality=65', '--bundle-cache=false', '--log=error']
                if partial_frames is not None:
                    cmd.append(f'--frames={partial_frames[0]}-{partial_frames[1]}')
            return super().run_command(cmd, timeout=timeout, cwd=cwd)
    tool = LocalRenderer()
    if args.snapshots or args.frames:
        frames = [int(v) for v in args.frames.split(',')] if args.frames else [int((s['start']+s['duration']*.62)*FPS) for s in SCENES]
        for frame in frames:
            assert 0 <= frame < total*FPS
            result = tool.run_command([shutil.which('node'), str(composer/'node_modules/@remotion/cli/remotion-cli.js'),
                    'still', str(stage/'index.tsx'), 'ArkivTrustLaunch', str(work/f'frame-{frame:05}.png'),
                    '--frame='+str(frame), '--public-dir='+str(public), '--browser-executable='+args.chrome,
                    '--scale=.67', '--bundle-cache=false', '--log=error'], timeout=180, cwd=composer)
            if result.returncode:
                raise RuntimeError(str(result.stderr)[-1800:])
        print(json.dumps(dict(snapshot_frames=frames)))
        return
    bespoke = dict(entry=str(stage/'index.tsx'), composition_id='ArkivTrustLaunch', public_dir=str(public),
                   crf=20, concurrency=2, art_direction='Native connected evidence graph, real product recordings, explicit evidence labels and provider limits. No animated PPT.')
    filename = 'trust-launch-picture.mp4' if partial_frames is None else f'picture-{partial_frames[0]}-{partial_frames[1]}.mp4'
    seconds = total if partial_frames is None else (partial_frames[1]-partial_frames[0]+1)/FPS
    result = tool._render_via_atelier(dict(output_path=str(work/filename)),
            dict(render_runtime='remotion', composition_mode='atelier', total_duration=seconds, bespoke=bespoke))
    report_name = 'render-report.json' if partial_frames is None else f'render-report-{partial_frames[0]}-{partial_frames[1]}.json'
    (work/report_name).write_text(json.dumps(dict(success=result.success, data=result.data, error=result.error), indent=2, default=str), encoding='utf-8')
    print(json.dumps(dict(render_success=result.success, duration=seconds, output=str(work/filename))))
    sys.exit(0 if result.success else 1)

if __name__ == '__main__':
    main()
