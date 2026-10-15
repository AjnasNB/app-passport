# Mobile performance evidence

The hosted app was measured on 15 October 2026 before and after the mobile fixes. This is a project-run **mobile lab navigation audit**, not field Core Web Vitals, a physical-phone test, a user study or a hackathon score.

The [published JSON](../apps/web/public/data/mobile-performance.json) includes all 18 reported samples, individual warnings, timing ranges, machine/browser details and complete Lighthouse configuration. It is also available at [the live evidence URL](https://arkivgraph.ajnasnb.com/data/mobile-performance.json).

## Results

Each cell is the median of three fresh-browser runs per route and release. The median is computed separately for each metric; it is not a selected best run. All 18 reported runs completed without Lighthouse run warnings.

| Route | Lighthouse performance | LCP | TBT | CLS |
| --- | --- | --- | --- | --- |
| overview | 87 → 98 | 2.902 → 1.996 s | 82.0 → 4.5 ms | 0.114 → 0.000 |
| context | 88 → 98 | 2.896 → 2.067 s | 47.0 → 0.0 ms | 0.114 → 0.000 |
| two-client | 41 → 96 | 3.069 → 2.414 s | 1921.0 → 0.0 ms | 0.540 → 0.011 |

Overview's reported total transfer fell from **777,910 to 138,083 bytes** (82.2% reduction); its reported script transfer fell from 258,896 to 77,485 bytes. That comparison uses the worker-free route. Lighthouse undercounts dedicated-worker transfer in this Chrome run, so the two-client byte totals must not be presented as complete network accounting.

The two-client route's median main-thread blocking fell from 1,921 ms to 0 ms in this lab. The historical verifier still checks the signed snapshots, graph membership, source binding and reported lifecycle. Those checks now run in a dedicated worker, with failure/timeout refusing the report. A paint or TBT result does not mean that background verification finished at first paint. Consumers stay disabled until the report passes.

## What changed

- AI, graph, context, SDK and two-client workspaces load as separate route chunks. The two-client live model loads on an actual request.
- Static views render before the artifact catalog loads and do not start live admission reads or WebSocket subscriptions.
- The build wrapper forces production React and JSX output even when a developer shell exports `NODE_ENV=development`.
- Historical session checks run off the UI thread without skipping verification. Aborted/unavailable workers refuse; new requests still use current evidence and the per-client trust journal.
- The critical font is preloaded, mobile hero actions keep stable rows and loading sections reserve space. The completed-session notice appears inside the verified report.
- The launch-video element and its poster are created when its disclosure is opened; opening the site no longer downloads the hidden poster.

The browser regressions cover idle mobile views making zero admission API/WebSocket reads and a missing verifier worker refusing the session. Existing two-client fixture tests still cover a verified historical result followed by a fresh refusal, and an unavailable new read removing an earlier positive decision.

## Reproduce a comparison

Use Node 22.19 or later, the installed dependencies, and Chrome. The audit is pinned to Lighthouse 13.5.0. On Windows the harness defaults to installed Chrome. Elsewhere, install Playwright Chromium or set `PASSPORT_CHROME_PATH` to an existing Chrome executable.

```sh
npm ci
npx playwright install chromium
npm exec --yes --package lighthouse@13.5.0 -- node scripts/mobile-performance.mjs baseline
# Deploy the candidate, keeping the same machine, browser and network.
npm exec --yes --package lighthouse@13.5.0 -- node scripts/mobile-performance.mjs final
```

The harness accepts `PASSPORT_BASE_URL` for the owned hostname or localhost, and `LIGHTHOUSE_MODULE` for an already installed Lighthouse `core/index.js`. It writes full raw Lighthouse reports to the ignored `.local/mobile-performance` folder. It publishes the compact JSON only after both complete sets exist. The historical baseline in this release was measured on the preceding live deployment; rerunning against the current app records a new baseline, not the old one.

Configuration: 412 × 823 CSS pixels, DPR 1.75, mobile form factor, simulated 150 ms RTT / 1,638.4 Kbps throughput and 4× CPU slowdown. Every sample uses a fresh Chrome profile with Lighthouse storage reset. Browser caches are cold; this does not purge Cloudflare's edge cache. Avoid concurrent builds/tests while measuring. The report records the application deployment and entry asset measured; an evidence-only republish can have a later deployment ID.

## Limits

These results do not establish a 75th-percentile real-user experience or INP. TBT is a laboratory main-thread responsiveness proxy, not INP. Later interactions, live verification, other browsers, desktop load, slower devices and different networks can behave differently. The retained 0.011 two-client layout shift is below the published 0.1 good threshold in this lab; it is not a field guarantee.

[Web Vitals](https://web.dev/articles/vitals) explains why lab results do not replace field measurement. [Lighthouse performance scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring) describes score weighting and variability.
