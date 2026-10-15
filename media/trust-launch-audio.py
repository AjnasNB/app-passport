"""Synthesize measured narration and rearrange our original score for the trust film.

Uses a generic local Kokoro voice, never a cloned identity or reference-video music.
The scene script is evidence-bound by render-trust-launch.py before this runs.
"""
from pathlib import Path
import argparse, hashlib, json
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--work', default=str(ROOT/'.local/media-trust-refresh'))
args = parser.parse_args()
work = Path(args.work)
public = work/'public'
public.mkdir(parents=True, exist_ok=True)
scenes = json.loads((work/'narration.json').read_text(encoding='utf-8'))
assert scenes[-1]['start'] + scenes[-1]['duration'] == 162
cache = Path.home()/'.cache/hyperframes/tts'
engine = Kokoro(str(cache/'models/kokoro-v1.0.onnx'), str(cache/'voices/voices-v1.0.bin'))
rate = 24000
voice = np.zeros(rate*162, dtype=np.float32)
timing = []
for row in scenes:
    cache_id = hashlib.sha256(json.dumps(row, sort_keys=True).encode()).hexdigest()[:20]
    stem = public/('voice-'+row['id']+'-'+cache_id+'.wav')
    info = stem.with_suffix('.json')
    speed = 1.00
    limit = row['duration']-.55
    if stem.is_file() and info.is_file():
        audio, sr = sf.read(stem, dtype='float32')
        speed = json.loads(info.read_text())['speed']
        duration = len(audio)/sr
    else:
        for attempt in range(5):
            audio, sr = engine.create(row['text'], voice='af_heart', speed=speed, lang='en-us')
            assert sr == rate
            duration = len(audio)/sr
            if duration <= limit:
                break
            speed *= duration/limit*1.012
    if duration > limit or speed > 1.22:
        raise RuntimeError(f"Shorten {row['id']}: {duration:.2f}s at speed {speed:.3f}")
    sf.write(stem, audio, rate)
    info.write_text(json.dumps(dict(speed=speed)), encoding='utf-8')
    start = row['start']+.18
    at = round(start*rate)
    voice[at:at+len(audio)] += audio
    timing.append(dict(id=row['id'], start=start, duration=round(duration, 4), text=row['text'], speed=round(speed, 4)))
    print(json.dumps(dict(scene=row['id'], seconds=round(duration, 3), speed=round(speed, 3))), flush=True)
sf.write(public/'narration.wav', voice, rate)
(work/'voice-timing.json').write_text(json.dumps(timing, indent=2), encoding='utf-8')

source = ROOT/'.local/graph-journey/public/score.wav'
music, sr = sf.read(source, dtype='float32', always_2d=True)
# Retain the opening and original closing cadence. Crossfade a middle passage to
# extend the project's own score; no commercial/reference recording is used.
parts = [music[:78*sr].copy(), music[8*sr:87*sr].copy(), music[90*sr:96*sr].copy()]
score = parts[0]
fade = int(.5*sr)
for part in parts[1:]:
    ramp = np.linspace(0, 1, fade, dtype=np.float32)[:,None]
    score[-fade:] = score[-fade:]*(1-ramp)+part[:fade]*ramp
    score = np.concatenate([score, part[fade:]])
assert len(score) == 162*sr
sf.write(public/'score.wav', score, sr)
license = json.loads(source.with_name(source.name+'.license.json').read_text(encoding='utf-8'))
license.update(file='score.wav', derived_from='Original Arkiv Graph score: first78s, middle8–87s, closing90–96s; two half-second crossfades. No reference music copied.')
(public/'score.wav.license.json').write_text(json.dumps(license, indent=2), encoding='utf-8')
spec = dict(duration=162, tracks=[
    dict(id='voice', kind='voice', file='public/narration.wav', gain_db=0,
         gain_points=[[0,0],[32.12,0],[32.16,-8],[32.18,-8],[34.18,0],
                      [44.12,0],[44.16,-3],[44.18,-3],[45.68,0],
                      [112.12,0],[112.16,-4],[112.18,-4],[114.18,0],[162,0]]),
    dict(id='bed', kind='music', file='public/score.wav', level='raw', gain_db=1,
         duck=dict(under='voice',depth_db=10,carve=.35,hold=2.5,release=.7),
         fade_out=1.3, gain_points=[[0,0],[32.12,0],[32.16,-3],[33.3,-3],[34.18,0],
                                  [160.6,0],[161.5,-18],[161.85,-60],[162,-60]])],
    sections={row['id']:row['start'] for row in scenes}, master=dict(lufs=-16,true_peak=-1.8))
(work/'mix.json').write_text(json.dumps(spec, indent=2), encoding='utf-8')
print(json.dumps(dict(duration=162, voice='Kokoro af_heart, synthetic generic voice', scenes=len(scenes))), flush=True)
