# Arkiv Graph + AI Passport

Arkiv Graph is an MIT TypeScript SDK for signed, connected records on Arkiv: indexed nodes and edges, a complete revision manifest, bounded traversal, a CLI and a stdio MCP server. AI Passport is the working reference application, combining Qarinah context, exact source checks, current review admission and useful AI tasks.

- [Live two-client demo](https://arkivgraph.ajnasnb.com/two-client/)
- [AI reference application](https://arkivgraph.ajnasnb.com/app/)
- [Judge evidence guide](https://arkivgraph.ajnasnb.com/judges.html)
- [SDK setup and limits](ARKIV_GRAPH.md), [architecture](ARCHITECTURE.md), [data contract](arkiv/schema.md)
- [Source](https://github.com/AjnasNB/arkiv-graph), [evaluation PDF](https://arkivgraph.ajnasnb.com/downloads/arkiv-graph-evaluation.pdf), [launch film](https://arkivgraph.ajnasnb.com/media/arkiv-graph-launch.mp4), [pitch PDF](https://arkivgraph.ajnasnb.com/downloads/arkiv-graph-pitch.pdf)

## Release

The public npm releases are **[`@ajnasnb/arkiv-graph` 0.3.0](https://www.npmjs.com/package/@ajnasnb/arkiv-graph)** and **[`@ajnasnb/ai-passport` 0.5.0](https://www.npmjs.com/package/@ajnasnb/ai-passport)**. Both registry tarballs were fetched without authentication and matched the reviewed builds; [release evidence](https://arkivgraph.ajnasnb.com/data/npm-release.json) records their versions, hashes and publication times. Publication does not establish external adoption or verified download statistics.

```sh
npm install @ajnasnb/arkiv-graph@0.3.0 @ajnasnb/ai-passport@0.5.0 qarinah@0.7.0
```

Both tarball release gates also passed in fresh folders outside the workspace, with Qarinah 0.7.0, no workspace symlinks or `NODE_PATH`, all seven package entrypoints imported, and a standalone TypeScript consumer compiled. The same builds remain downloadable:

```sh
npm install https://arkivgraph.ajnasnb.com/downloads/ajnasnb-arkiv-graph-0.3.0.tgz https://arkivgraph.ajnasnb.com/downloads/ajnasnb-ai-passport-0.5.0.tgz qarinah@0.7.0
```

Install both tarballs together because the application adapter depends on the exact graph release. The generic graph package alone has no Qarinah, passport or model dependency.

## A real review withdrawal, two separate consumers

Open the [two-client page](https://arkivgraph.ajnasnb.com/two-client/) and select **Read both clients**. Every request independently reads the current graph and session review, assembles the signed manifest through the generic SDK, traverses `context:handoff`, validates the Qarinah packet and checks the exact public `release.ts` bytes. Only admitted evidence permits the six deterministic release-guard tests. This demonstration runs no model inference.

Completed session `77000888-ffdc-4ecf-beb8-df529adfb952` created three actual Tiramisu transactions: a passport, a review and an exact-target review withdrawal. A and B first admitted their own requests at blocks 603794 and 603795. After withdrawal at block 603917 and a separate query-visibility check, B's next request refused at block 603919; A independently refused at 603920. Inspect the [signed evidence and operator observations](https://arkivgraph.ajnasnb.com/data/two-client-session.json) for timestamps, creators, transaction hashes and complete read snapshots.

The clients are separate SDK instances operated by this project. Both signing wallets are project-controlled. The public browser clients share a read-only relay and configured RPC provider; the operator CLI reads RPC directly. These observations establish neither independent people nor external adoption. A displayed result describes one request at its timestamp. A later withdrawal is checked on the next request; historical acceptance does not authorize a current task.

## Repeat the three-transaction session

Node.js 24 is tested. From this repository:

```sh
npm ci --ignore-scripts
npm run build
npm run typecheck
npm test
npx tsx scripts/two-client-demo.ts --plan
npx tsx scripts/two-client-demo.ts --publish --hold-before-withdrawal
```

Fund two dedicated Tiramisu wallets with free testnet GLM. Set `TWO_CLIENT_PRODUCER_KEY` and `TWO_CLIENT_REVIEWER_KEY` in your local process, or use the existing private operator helper with credential files outside the repository. Optional provider settings are `TWO_CLIENT_RPC` and `TWO_CLIENT_API_KEY`. No custom contract deployment is required.

The CLI creates a unique descriptor version so earlier reviews of the same packet cannot admit the new session. It publishes the passport and review, runs A and B separately, saves the accepted-phase public report, then pauses for Enter. The operator can serve that report and inspect both clients before resuming. Enter publishes the exact review withdrawal. A bounded observer waits for query visibility, then B's next task request and A's next request each reread and decide. Omit `--hold-before-withdrawal` to run the complete sequence without the pause.

Only `--publish` broadcasts. The default command and `--plan` describe the operation. The public report is `apps/web/public/data/two-client-session.json`; a local journal retains pending signed intent, any known transaction hash, all task receipts and bounded visibility attempts. An uncertain transaction is not automatically rebroadcast. Public endpoints cannot publish records, accept wallet keys or upload private context.

## Verify the packages without the website backend

```sh
node scripts/consume-graph-infra.mjs
node scripts/clean-consumer.mjs
```

Each command installs the two release tarballs and Qarinah 0.7.0 in a new OS temporary folder, compiles standalone NodeNext TypeScript and imports every exported entrypoint. The graph consumer reads both pinned roots directly, verifies two packaged CLI profiles, and passes eight actual MCP trace/context success and budget-rejection cases. The application consumer verifies Qarinah with its original validator, hashes the selected repository source, reads the reference graph and passes the packaged admission CLI.

Successful actual tarball runs produced [graph/CLI/MCP results](https://arkivgraph.ajnasnb.com/data/graph-infrastructure-evaluation.json) and [application consumer results](https://arkivgraph.ajnasnb.com/data/consumer-evaluation.json). Both anonymous registry gates also passed: [registry graph/CLI/MCP](https://arkivgraph.ajnasnb.com/data/graph-infrastructure-evaluation-registry.json) and [registry application consumer](https://arkivgraph.ajnasnb.com/data/consumer-evaluation-registry.json). Reproduce with `--registry` on either command; it installs the exact npm versions with empty npm configs, a fresh cache and no inherited credentials. A failed check does not replace a successful report with a success claim.

```ts
import { createGraphKit } from '@ajnasnb/arkiv-graph';

const kit = createGraphKit();
const live = await kit.readGraph({ rpc, issuers }, graphDigest);
const path = kit.traverseGraph(live.graph, 'application:ai-passport', {
  depth: 4, maxNodes: 40,
});
if (path.truncated) throw new Error('Incomplete evidence');
```

Root and accepted issuers are explicit consumer policy. Downloaded example configurations are not automatically trusted policy.

## The AI reference application

**Coding handoff** carries selected Qarinah source and decision evidence into a real hosted model request. A strict finite release-guard specification passes six interpreted boundary tests before readable JavaScript is exported. Generated JavaScript is not executed.

**India number tutor** calculates exact paise, Indian grouping and lakh/crore values, with English and Hindi views. Deterministic calculations supply displayed numeric claims. **UPI Safety Quest** is a three-round game with deterministic scoring and an optional AI coach, using project-authored summaries linked to NPCI guidance. It requests no PIN, payment or bank account.

The hosted model alias is `@cf/meta/llama-3.2-3b-instruct`. **Inspect AI inputs** shows checked sources, the pinned graph, selected events, the exact evidence message and the resulting receipt. Browser digest checks do not attest hosted weights, provider computation or factual truth. The Worker also binds the runtime descriptor, graph node, original source and deployed source identity before inference. Public examples use public or synthetic inputs; private Qarinah memory stays local.

## What Arkiv contributes

Arkiv supplies indexed entities, original creator metadata, readonly creation and expiry. This SDK adds signed graph conventions, complete revision manifests and bounded directed traversal. The infrastructure graph has 7 nodes, 8 edges and 16 signed entities; the AI reference graph has 27 nodes, 43 edges and 71 signed entities, including four selected historical AI run receipts. Visitor runs are not automatically published.

The reader filters accepted protocol creators in the query before bounded pagination, then checks signed issuer agreement, attributes, readonly status, validity, complete membership and root identity. AI Passport additionally evaluates current reviews. A withdrawal targets its original author's exact record and must cover both the target's signed validity and storage expiry. Extending storage cannot renew an old signed assessment.

A single operator's calculator can use an ordinary database. Arkiv is useful here as a shared, attributable record layer readable by compatible consumers through their own providers. Graph traversal is SDK code, not native Cypher or a Solidity deployment. Signatures do not make a source true. RPC metadata and query completeness remain trusted; no independent state proof is checked.

## Evidence and limits

The [local CPU benchmark](https://arkivgraph.ajnasnb.com/data/graph-benchmark.json) measures synthetic graphs of 20, 100 and 200 nodes on one machine. At 20 nodes, indexed traversal was effectively unchanged from scanning (0.1148 versus 0.1144 ms median). At the 200-node/500-edge limit, medians were 1.0701 versus 1.5017 ms. Full signature, manifest and root verification was measured separately at 285.5, 1687.3 and 2843.6 ms for the three sizes. These are local CPU measurements, excluding RPC, storage and gas; they are not production latency, throughput or distributed-scale results.

The release local suite passed 198 tests covering signed graph/admission boundaries, storage coverage, exact runtime binding and malformed or unavailable evidence. [Test reports](https://arkivgraph.ajnasnb.com/data/security-evaluation.json) retain their own dates and scope. The [18 browser checks](https://arkivgraph.ajnasnb.com/data/browser-evaluation.json) comprise sixteen existing flows and two UI regressions using generated signed fixtures and mocked responses; they are not eighteen independent live-network checks. The [actual two-client browser report](https://arkivgraph.ajnasnb.com/data/two-client-browser-evaluation.json) separately records four requests and zero browser errors. Mock inference in local tests is distinct from the [real hosted AI evaluation](https://arkivgraph.ajnasnb.com/data/ai-evaluation.json).

The [final deployment checks](https://arkivgraph.ajnasnb.com/data/release-smoke.json) verify the completed session, two fresh refused requests, mobile layout, exact npm tarball bytes, the reviewed 128-second film, browser playback and seeking, and the downloadable deck and PDFs.

Run `node scripts/verify-release.mjs` from the checkout to repeat those read-only checks against the public deployment. It uses Chrome on Windows, or Playwright's installed Chromium on other platforms; `PASSPORT_CHROME_PATH` can select another local executable. No signing key or new transaction is needed.

Graphs are bounded to 200 nodes/500 edges, eight query pages and depth eight. AI evidence is bounded to 10,000 characters and output to 420 tokens. Model attempts have daily and per-IP limits; deterministic tools and readers also work without inference. Signed validity and chain storage are finite and require operator renewal. No external customer adoption, security certification, perpetual availability or hosted computation proof is claimed.

MIT covers the new graph SDK, adapter and application. Qarinah retains Apache-2.0 and its notices; [PREEXISTING.md](PREEXISTING.md) discloses the baseline. Original Qarinah and ScamSignal folders are preserved. See [integration observations](arkiv/friction.md) and [media sources and credits](media/README.md).
