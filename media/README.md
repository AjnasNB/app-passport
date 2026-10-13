# AppPassport film

I built the public SDK and Qarinah-Arkiv demo. This 70-second film combines motion graphics and a real browser recording of the deployed application.

The graphics depict an artifact and separate producer/reviewer statements. The recording checks a genuine Qarinah packet over a synthetic repository, source changes, a real withdrawn review, a real MCP Memory artifact and changed local bytes. The final numbers come from the published evaluation reports. Both demo wallets are project controlled; the controlled calls do not certify malware safety. No second LLM inference or external customer adoption is claimed.

`film.tsx` is an original Remotion composition, rendered through OpenMontage's `VideoCompose` API in its custom-composition mode. OpenMontage is a local production tool, not application code vendored into this MIT SDK. It retains its upstream AGPL-3.0 license: https://github.com/calesthio/OpenMontage. Remotion retains its own upstream license: https://www.remotion.dev/license.

Narration is locally generated synthetic speech using Kokoro (Apache-2.0 model) and kokoro-onnx (MIT). DM Sans uses SIL OFL; its license is included with the application font. The synthesized music is reused from the disclosed earlier ScamSignal film. The earlier film and deck are preserved.

Production scripts use a local OpenMontage checkout with the locked Remotion composer dependencies, Chrome, and a Python environment with kokoro-onnx, NumPy and SoundFile. Set OPENMONTAGE_ROOT to that checkout. Capture and generated assets go in ignored .local/passport-film. The renderer embeds the existing public font as a generated module; it does not require a system font or a remote font service. Media is not a dependency of the application runtime.

The application records, schemas and SDK remain reproducible independently of the film.

## AI Passport image-led deck

`ai-deck.mjs` assembles eight slides from original built-in image-generation artwork, editable diagrams, an editable measured chart and an actual public website capture. Generated logo, cover and India illustration are in `apps/web/public/brand`. They are conceptual artwork and do not depict customers. Prompt specifications remain private; generated assets are included. The deck is not animated into a film.

`capture-ai-demo.mjs` records a real coding run, working India tools and the live graph. The supplementary `ai-workspace-recording.mp4` is a silent live walkthrough, separately labelled from the earlier OpenMontage motion-graphics prototype. It does not imply that the earlier prototype film covers the new AI features.

## Updated AI Passport film

`ai-film.tsx`, `narrate-ai.py` and `render-ai.py` produce a 75-second original motion film through OpenMontage and its Remotion renderer. It shows the real coding/gate/India-tool website flow and a moving source/context/run graph. The original 70-second prototype is preserved separately. A targeted graph-scene repair removes a footer overlap. Narration uses local Kokoro af_heart and is synthetic. Final audio is normalized and measured; waveform metadata and real render evidence are in `/data/ai-video-evaluation.json`. No PPT slide is animated into the film.
