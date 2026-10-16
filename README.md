# Arkiv Graph

Arkiv Graph is an MIT TypeScript SDK for signed, connected records on Arkiv: indexed nodes and edges, a complete revision manifest, bounded traversal, a CLI and a stdio MCP server. Another application can reconstruct and verify a published graph through its configured Arkiv provider without using the originating application's API. AI Passport is the working reference application, combining Qarinah context, exact source checks and current review admission.

Start with the **[wallet-free developer guide](docs/GETTING_STARTED.md)**: install the public SDK, build a valid two-node/one-edge graph and traverse it offline. Then use a separate, reviewed bootstrap to verify real testnet records. No wallet is needed to read.

- [Live two-client demo](https://arkivgraph.ajnasnb.com/two-client/)
- [AI reference application](https://arkivgraph.ajnasnb.com/app/)
- [Judge evidence guide](https://arkivgraph.ajnasnb.com/judges.html)
- [SDK setup and limits](ARKIV_GRAPH.md), [architecture](ARCHITECTURE.md), [data contract](arkiv/schema.md)
- [Live root updates](https://arkivgraph.ajnasnb.com/?view=trust), [trust setup](docs/TRUST_SETUP.md), [mobile measurements](docs/MOBILE_PERFORMANCE.md)
- [Source](https://github.com/AjnasNB/arkiv-graph), [evaluation PDF](https://arkivgraph.ajnasnb.com/downloads/arkiv-graph-evaluation.pdf), [162-second launch film](https://arkivgraph.ajnasnb.com/media/arkiv-graph-launch.mp4), [editable eight-page editorial PPTX](https://arkivgraph.ajnasnb.com/downloads/arkiv-graph-pitch.pptx), [pitch PDF](https://arkivgraph.ajnasnb.com/downloads/arkiv-graph-pitch.pdf)
- [Launch evidence and judging questions](docs/LAUNCH_EVIDENCE.md): what is recorded, what is illustrated, and what remains unresolved.
- [Onboarding and pitch release checks](https://arkivgraph.ajnasnb.com/data/developer-release.json), [hosted release smoke](https://arkivgraph.ajnasnb.com/data/release-smoke.json), [dated npm statistics response](https://arkivgraph.ajnasnb.com/data/npm-usage.json).

## The problem and the fit

Connected evidence often lives behind the application that produced it. A consumer needs more than a downloaded JSON result: it needs an accepted author, exact content identity, complete relationships for the selected revision, and a defined trust policy. Arkiv supplies shared indexed entities, original creator metadata, readonly publication and expiry. This SDK adds a public graph format, signed complete revisions and bounded readers.

| Use case | Suitable starting point | Arkiv Graph's role |
|---|---|---|
| One operator owns writers and readers | Postgres or an application API | Usually no shared publication layer is needed |
| Multiple compatible applications read attributable published evidence | Shared indexed record layer | Consumers reconstruct a signed revision through their own provider and accepted issuers |
| Distribute immutable source bytes | IPFS or another content-addressed store | Graph records can reference content identities; hashes alone do not supply indexed creator/relationship discovery or current review state |
| Large graph joins and arbitrary graph queries | A graph database | This SDK performs bounded local traversal after complete reconstruction |

The work to build on today is a versioned public contract, strict validators, conformance/failure tests and packaged TypeScript, CLI and MCP integrations. That is a modest integration advantage, not evidence of exclusive data, external adoption or a proven network effect. The open format and MIT code are intended to make compatible integrations easier.

## Developer quickstart

Node.js **24 or newer**:

```sh
mkdir my-arkiv-graph
cd my-arkiv-graph
npm init -y
npm install @ajnasnb/arkiv-graph@0.4.0
```

Copy the complete [`graph.mjs` example](docs/GETTING_STARTED.md#2-build-and-traverse-a-local-graph), then run `node graph.mjs`. It validates two nodes and one typed relationship and returns the complete directed path. Installation needs internet; the example itself runs offline without accounts, keys, RPC or a model.

From this checkout, `node scripts/quickstart-proof.mjs` installs the exact public graph release in a fresh OS temporary folder and executes that same documented example with fetch disabled. The [successful quickstart receipt](apps/web/public/data/quickstart-proof.json) retains the actual output. For an actual RPC read, follow the [separate bootstrap and verification recipe](docs/GETTING_STARTED.md#3-verify-a-real-published-graph-through-rpc); [retained CLI/RPC observations](apps/web/public/data/quickstart-rpc-proof.json) record successful reads of the documented revision. Downloaded example configuration is a candidate to review, not automatic authority.

## Release

The public npm releases are **[`@ajnasnb/arkiv-graph` 0.4.0](https://www.npmjs.com/package/@ajnasnb/arkiv-graph)** and **[`@ajnasnb/ai-passport` 0.6.0](https://www.npmjs.com/package/@ajnasnb/ai-passport)**. Both registry tarballs were fetched without authentication and matched the reviewed builds; [release evidence](https://arkivgraph.ajnasnb.com/data/npm-release.json) records their versions, hashes and publication times. The generic graph package alone has no Qarinah, passport or model dependency.

Install the application adapter only when using AI Passport:

```sh
npm install @ajnasnb/arkiv-graph@0.4.0 @ajnasnb/ai-passport@0.6.0 qarinah@0.7.0
```

Both tarball release gates also passed in fresh folders outside the workspace, with Qarinah 0.7.0, no workspace symlinks or `NODE_PATH`, all eight package entrypoints imported, and a standalone TypeScript consumer compiled. The same builds remain downloadable:

```sh
npm install https://arkivgraph.ajnasnb.com/downloads/ajnasnb-arkiv-graph-0.4.0.tgz https://arkivgraph.ajnasnb.com/downloads/ajnasnb-ai-passport-0.6.0.tgz qarinah@0.7.0
```

Install both tarballs together because the application adapter depends on the exact graph release.

## Usage evidence

The anonymous public registry check on **16 October 2026** confirmed graph **0.4.0** and AI Passport **0.6.0** as the latest releases. At **2026-10-16 07:21 UTC**, the official npm download API returned HTTP 404 for both packages for **9–15 October 2026** and **16 September–15 October 2026**. Download counts are recorded as **unavailable**, not zero. [The snapshot](apps/web/public/data/npm-usage.json) retains exact windows, fetch times, source URLs, status and raw API responses.

Refresh with `node scripts/npm-usage.mjs`. When available, npm downloads measure package retrievals across versions, including project and CI installs. They do not measure unique people, independent applications or runtime graph reads. No verified external user or runtime read count is claimed.

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

Fund two dedicated Tiramisu wallets with free testnet GLM. Set `TWO_CLIENT_PRODUCER_KEY` and `TWO_CLIENT_REVIEWER_KEY` in your local process. Optional provider settings are `TWO_CLIENT_RPC` and `TWO_CLIENT_API_KEY`. No custom contract deployment is required.

The CLI creates a unique descriptor version so earlier reviews of the same packet cannot admit the new session. It publishes the passport and review, runs A and B separately, saves the accepted-phase public report, then pauses for Enter. The operator can serve that report and inspect both clients before resuming. Enter publishes the exact review withdrawal. A bounded observer waits for query visibility, then B's next task request and A's next request each reread and decide. Omit `--hold-before-withdrawal` to run the complete sequence without the pause.

Only `--publish` broadcasts. The default command and `--plan` describe the operation. The public report is `apps/web/public/data/two-client-session.json`; a local journal retains pending signed intent, any known transaction hash, all task receipts and bounded visibility attempts. An uncertain transaction is not automatically rebroadcast. Public endpoints cannot publish records, accept wallet keys or upload private context.

## Verify the packages without the website backend

```sh
node scripts/consume-graph-infra.mjs
node scripts/clean-consumer.mjs
```

Each command installs the two release tarballs and Qarinah 0.7.0 in a new OS temporary folder, compiles standalone NodeNext TypeScript and imports every exported entrypoint. The graph consumer reads both pinned roots directly, verifies two packaged CLI profiles, and passes eight actual MCP trace/context success and budget-rejection cases. The application consumer verifies Qarinah with its original validator, hashes the selected repository source, reads the reference graph and passes the packaged admission CLI.

Successful actual tarball runs produced [graph/CLI/MCP results](https://arkivgraph.ajnasnb.com/data/graph-infrastructure-evaluation.json) and [application consumer results](https://arkivgraph.ajnasnb.com/data/consumer-evaluation.json). Both anonymous registry gates also passed: [registry graph/CLI/MCP](https://arkivgraph.ajnasnb.com/data/graph-infrastructure-evaluation-registry.json) and [registry application consumer](https://arkivgraph.ajnasnb.com/data/consumer-evaluation-registry.json). Reproduce with `--registry` on either command; it installs the exact npm versions with empty npm configs, a fresh cache and no inherited credentials. A failed check does not replace a successful report with a success claim.

The [complete JavaScript reader](docs/GETTING_STARTED.md#3-verify-a-real-published-graph-through-rpc) loads a reviewed `reader.json`, defines the RPC/issuers/root explicitly and verifies the full graph before traversal. Root and accepted issuers are consumer policy.

## Authenticated updates and retained observations

The optional `@ajnasnb/arkiv-graph/trust` entry point provides signed root revisions, a Tiramisu registry reader, monotonic checkpoints, provider-observation checks and withdrawal journals. The [live root-update page](https://arkivgraph.ajnasnb.com/?view=trust) reads two actual authority-signed revisions and their complete synthetic graphs from one explicit block. Its eight readonly entities were published in [one transaction](https://tiramisu.explorer.arkiv.network/tx/0x4802ca8904dad4e118257f6761299e7b525d12abb09dcdecb79786be6cce8ff8). Original infrastructure and AI reference roots remain intact.

Pin the bootstrap authority, chain, profile and policy through a trusted channel. Each signed revision links the previous root and entire signed revision. The browser verifies the current complete graph before saving a checkpoint; older or conflicting observed history is rejected. Authority or accepted-policy changes require an explicit new bootstrap. The separate two-client reference retains authenticated withdrawals, including pending withdrawals whose target was initially absent, before admitting a task. Full-request Web Locks serialize shared browser storage; malformed storage, write failure or unavailable locking refuses the task.

Run `npx tsx scripts/verify-trust-safeguards.ts` for the [19-check report](https://arkivgraph.ajnasnb.com/data/trust-safeguards.json), which separates real RPC reads from replay and synthetic failure injection. The [capability probe](https://arkivgraph.ajnasnb.com/data/rpc-capabilities.json) records the tested public endpoint and unavailable proof method. See [TRUST_SETUP.md](docs/TRUST_SETUP.md) and [TRUST_REVIEW.md](docs/TRUST_REVIEW.md).

Every graph/admission query pins a block and rejects mismatched pages. The live deployment still uses one RPC operator. Signatures, local history and configured-provider comparison do not prove completeness of unseen history. A fresh client can miss a withheld update or withdrawal; clearing local data loses observed history. The root registry supports the generic Tiramisu profile and 64 retained revisions. It is separate from the AI app's pinned reference graph.

## Measured mobile performance

Eighteen hosted Lighthouse 13.5.0 audits cover three cold runs per route before and after the fixes. Median scores improved from **87 / 88 / 41** to **98 / 98 / 96** for Overview / AI context / Two-client. Final LCP medians were **2.00 / 2.07 / 2.41 seconds**; TBT **5 / 0 / 0 ms**; CLS **0 / 0 / 0.011**. These are simulated mobile navigation measurements, not physical-phone, field INP or hackathon scores.

The measured repairs enforce production React output, lazy-load workspace code, defer irrelevant admission reads, move full historical signature verification to a worker, stabilize font/layout changes and defer the hidden film poster. Inspect [all samples and configuration](https://arkivgraph.ajnasnb.com/data/mobile-performance.json) and [reproduction details](docs/MOBILE_PERFORMANCE.md). The worker retains every signature check and refuses errors.

## Read while this application's API is unavailable

Run `node scripts/verify-backend-independence.mjs` after checkout setup. It installs the public npm releases in a new OS temporary directory with empty npm configs, then deliberately rejects every fetch to this project's domains. Only the configured public Arkiv RPC is allowed during the SDK checks. Both pinned graphs still verify, the public-checkout source bytes match the signed context path, and a fresh Qarinah consumer refuses the withdrawn review. Removing a graph member fails verification; deliberately blocking the RPC also fails the read.

The [seven-check report](https://arkivgraph.ajnasnb.com/data/backend-independence.json) includes actual RPC methods, read blocks, creator predicates and network counts. This is a project-run failure simulation. It demonstrates independence from this project's API using one working RPC provider and pre-supplied public source/configuration; it does not establish network-wide censorship resistance or external adoption. A single operator can use Postgres. Replacing Arkiv here means supplying another shared publication/discovery layer for the indexed, attributable records and current review state.

Published graph revisions retain historical source snapshots, including the earlier 0.2.0 CLI. Those signatures apply to their original bytes. The current npm 0.4.0/0.6.0 tarballs are verified separately by the registry integrity report; immutable records are not relabeled as new release attestations.

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

The release local suite passed 271 tests covering signed graph/admission boundaries, storage coverage, exact runtime binding and malformed or unavailable evidence. [Test reports](https://arkivgraph.ajnasnb.com/data/security-evaluation.json) retain their own dates and scope. The [34 browser checks](https://arkivgraph.ajnasnb.com/data/browser-evaluation.json) cover sixteen original flows, four navigation regressions, six root/trust cases, two performance guards and six signed-fixture two-client regressions. Controlled failures and actual network reads are explicitly distinguished. These six fixture tests are distinct from actual live-network lifecycle evidence. The [actual two-client browser report](https://arkivgraph.ajnasnb.com/data/two-client-browser-evaluation.json) separately records four requests and zero browser errors. Mock inference in local tests is distinct from the [real hosted AI evaluation](https://arkivgraph.ajnasnb.com/data/ai-evaluation.json).

The [final deployment checks](https://arkivgraph.ajnasnb.com/data/release-smoke.json) verify the completed session, two fresh refused requests, mobile layout, exact npm tarball bytes, the reviewed 162-second film, browser playback and seeking, and the downloadable deck and PDFs.

Run `node scripts/verify-release.mjs` from the checkout to repeat those read-only checks against the public deployment. It uses Chrome on Windows, or Playwright's installed Chromium on other platforms; `PASSPORT_CHROME_PATH` can select another local executable. No signing key or new transaction is needed.

Graphs are bounded to 200 nodes/500 edges, eight query pages and depth eight. AI evidence is bounded to 10,000 characters and output to 420 tokens. Model attempts have daily and per-IP limits; deterministic tools and readers also work without inference. Signed validity and chain storage are finite and require operator renewal. No external customer adoption, security certification, perpetual availability or hosted computation proof is claimed.

MIT covers the new graph SDK, adapter and application. Qarinah retains Apache-2.0 and its notices; [PREEXISTING.md](PREEXISTING.md) discloses the baseline. Original Qarinah and ScamSignal folders are preserved. See [integration observations](arkiv/friction.md) and [media sources and credits](media/README.md).
