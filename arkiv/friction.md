# Reproducible integration observations

Environment: Windows, Node 24.15.0, `@arkiv-network/sdk` 0.8.1, Tiramisu chain 7738577. Release packages: `@ajnasnb/arkiv-graph` 0.3.0 and `@ajnasnb/ai-passport` 0.5.0. The integration observations below distinguish application issues from Arkiv behavior.

## Reproduction map and observed results

These are tested integration paths, not a list of alleged upstream bugs. Run commands from the public repository root with Node 24.15.0. The lockfile pins the SDK and test dependencies. The read-only steps require no wallet, signing key, Hub access key or website API. Tiramisu availability, query completeness and protocol metadata still depend on the configured provider. A future expired graph must fail verification rather than reproduce a historical positive result.

```sh
git clone https://github.com/AjnasNB/arkiv-graph.git
cd arkiv-graph
npm ci --ignore-scripts
npm run build:sdk
npx arkiv-graph verify apps/web/public/data/arkiv-graph-reader.json
npx arkiv-graph trace apps/web/public/data/arkiv-graph-reader.json application:ai-passport
npx vitest run tests/arkiv-graph.test.ts tests/sdk.test.ts tests/publishing-lifecycle.test.ts tests/graph.test.ts tests/adapter.test.ts
```

On 15 October 2026, the five named local suites passed **93/93** tests. Those tests use genuine locally generated signatures, synthetic chain records and mocked transports where named; they do not broadcast chain transactions. A separate fresh direct-RPC read at **11:08:37–38 UTC, block 606375**, without a website backend, wallet or key, reconstructed the generic graph's **7 nodes / 8 edges / 16 entities** and the AI reference graph's **27 nodes / 43 edges / 71 entities**. It verified the already published roots; it did not publish new records or run inference. The exact generic query observed in that read was:

```text
namespace = str('arkiv-graph-v1') AND schema_version = u64(1)
AND graph_hash = bytes32(0x724614507a2f0ddaccf7eb58fcc9e4981f3a344776c6f906986a057d05f80297)
AND $expiresAt > u64(606375)
AND $creator = addr(0x4FEade3FF513A7954e9f7420aaa7BDEdc0BA4BDC)
```

The current block changes on each run. The AI profile changes the namespace to `ai-passport-graph-v1` and root to `0x3d9325c01b3cb80e8f3de3c02fc720e196f190de4d74191bf8d7ddb93039817c`. Reader configurations pin both values and the accepted creator; these are local trust choices, not identities discovered from arbitrary payload labels.

| Arkiv surface / exact reproducer | Expected | Actual result and proposed improvement |
|---|---|---|
| TypeScript SDK 0.8.1 and direct JSON-RPC: the two `arkiv-graph` commands above; `node scripts/consume-graph-infra.mjs --registry` additionally runs both packaged profiles and real stdio MCP | Reconstruct only the pinned complete graph, without this website's dynamic backend | Fresh read at block 606375 returned 16 and 71 entities. The earlier [anonymous registry report](https://arkivgraph.ajnasnb.com/data/graph-infrastructure-evaluation-registry.json) records two CLI profiles and eight actual MCP cases. A minimal no-wallet example distinguishing provider trust from payload signatures would make the security boundary easier to explain. |
| Typed attributes, original creator and readonly flags: `npx vitest run tests/arkiv-graph.test.ts tests/sdk.test.ts` | Payload claims alone cannot impersonate an accepted protocol creator or mutable record | These suites passed in the 93-test run. Named cases reject creator mismatch, mutable entities, attribute/payload disagreement and copied signatures. The live graph's creator predicate appears above. Documentation should show `$creator`, `$owner` and readonly flags together. |
| Cursor pagination and query budgets: `npx vitest run tests/arkiv-graph.test.ts -t "Bounded independent Arkiv reader"` | Unrelated publishers cannot consume accepted-creator pages; a genuine incomplete result fails closed | Tests filter out 900 outsider records, reconstruct the supported 701-member synthetic graph within eight pages, and refuse accepted-publisher overflow. This is mocked-RPC boundary testing, not a network throughput result. An SDK security recipe for creator predicates before cursor limits would help. |
| Expiration input and signed review lifecycle: `npx vitest run tests/publishing-lifecycle.test.ts tests/sdk.test.ts` | Withdrawal storage covers its target; storage renewal cannot renew a signed review | Tests passed, including `ExpirationTime.atBlock` coverage, malformed short withdrawals, signed expiry and fresh replacement reviews. The completed real session has review expiry block 1899792 and withdrawal expiry block 1899917. A documented withdrawal/lease example should explicitly separate signed validity, retained storage and missing-history limitations. |
| WebSocket entity events: inspect [`watchRecords`](../packages/sdk/src/arkiv.ts) and the subscription effect in [`main.tsx`](../apps/web/src/main.tsx); open the verifier while an authorized operator publishes a new relevant entity | `watchEntityEvents` uses WebSocket transport without `fromBlock`, and notifications trigger a fresh evaluation | Code uses that transport and a trailing refresh scheduler; focus/online recovery and a 60-second fallback also reread. The two-client lifecycle instead rereads per task. No new WebSocket publication was replayed in this audit, and a subscription is not proof of guaranteed delivery or instant global withdrawal. A small reconnection/missed-event example would help. |
| Atomic `executeBatch`: inspect `scripts/publish-ai.ts` and successful transactions in [`ai-evidence.json`](ai-evidence.json) | Publish a graph in recoverable chunks with reconciliation after an uncertain result | A historical 51-create attempt hit a transport error; batches of five later succeeded. The original failure is not deterministically reproducible and establishes no Arkiv batch limit. Do not rerun the publisher merely to replay it: it writes entities and requires dedicated funds/keys. Recommended batch sizing and uncertain-broadcast recovery guidance would help. |
| Hub, Faucet and Access keys: use an account's Hub access-key screen and Tiramisu faucet; then inspect the public creation transactions below | Free testnet tokens fund dedicated writers; query quota can be added without giving a reader a signing key | The project's three lifecycle writes were funded with testnet GLM. A Hub query key stays in a server secret and is unnecessary for the direct-reader commands. These are October 2026 web UI observations; the UI exposes no version string. Account authorization/CAPTCHA/key generation are not rerun by this read-only reproducer; no quota guarantee is claimed. |
| Block Explorer / Data Explorer: open the three lifecycle transactions and the listed creator addresses | Locate public synthetic records independently of the frontend, including creation evidence retained after expiry | [Passport](https://tiramisu.explorer.arkiv.network/tx/0xb814d48fd359bada1898c5cccbd0ee08458f54fd2821ffd29654ff618bd164de), [review](https://tiramisu.explorer.arkiv.network/tx/0xee85d9cb2b72d726b47d8b39634975ae5e8e4b6e372849bbc23507d49c360c01), [withdrawal](https://tiramisu.explorer.arkiv.network/tx/0xfc8d4ae3df1948b1497e2b090476a2954f43f997bc122e923c155768fed6bc62) are linked with keys, authors and blocks in the [session report](https://arkivgraph.ajnasnb.com/data/two-client-session.json). Historical creation does not establish current admission. |

The same versions apply to the detailed observations below unless another dependency is named. Local tests, live chain reads, historical transactions, hosted inference and account-UI observations have different scopes; none is presented as an independent security audit. My first documentation request is a compact creator/readonly/expiry trust-registry example, including bounded pagination and the consequences of an expired or omitted withdrawal. This addresses the concrete integration mistakes described below without calling them Arkiv defects.

## Read and publisher separation

Expected: a consumer can query records with no signing account; a publisher supplies its own funded wallet. Observed: producer and reviewer records were created with distinct project-controlled wallets and read back through direct RPC. Reproduce with `npm run arkiv:verify`; exact queries, blocks and keys are in the generated evidence files. This is operational separation, not proof of independent organizational adoption.

## Readonly, creator and payload checks

Expected: `$creator` identifies the original transaction author, including when ownership differs. Observed: the SDK exposes creator and owner separately. A readonly requirement, application signature, and attribute/payload equality are needed together for this consumer policy. Mutable entities and mismatches are rejected in the named SDK tests. Suggested documentation improvement: a compact example distinguishing wallet ownership, original authorship and readonly payload semantics for trust registries.

## Expiration is not positive clearance

Expected: expired storage disappears from live queries. Observed: a disappearance alone cannot distinguish an unknown record, deleted record or expired review. This demo separates signed review validity from storage lifetime, retaining the expired synthetic review long enough to inspect its reason. Reproduce with the public expired-context case and its entity creation transaction. Storage renewal must never renew an old signed assessment.

## Corrections need explicit lifecycle semantics

Expected: withdrawal applies only to the original author's exact target; later independently issued evidence can be evaluated normally. Observed: a policy that treats any historical withdrawal as an artifact-wide ban incorrectly prevents renewal. The SDK targets specific keys, filters withdrawn records and evaluates remaining current evidence. Tests cover same-author withdrawal, wrong author, wrong target, old ordering and fresh replacement. Two initially incomplete browser-tool reviews demonstrate this correction flow on chain.

## Quota and transport failure

Expected: public RPC works at its default quota; a Hub key increases quota. Observed: the application can keep the key in a server secret while independent readers use their own provider. Transport retries are disabled and timeouts are bounded so a quota/network problem produces unavailable rather than an old positive decision. The gateway exposes only semantic read requests, not arbitrary RPC forwarding or writes.

## Adjacent MCP compatibility issue

Our initial manual stdio client completed MCP initialization and tool listing but timed out on Playwright and Chrome controlled calls. Replacing it with the official @modelcontextprotocol/sdk 1.32.1 client, proper roots handling and an isolated Chrome profile completed those calls. This was our MCP integration issue, not an Arkiv defect. Actual before/after review transactions and the final protocol report are retained.

## Current verification limitation

The reader verifies application-level signatures but trusts the provider's protocol metadata and query completeness. A portable SDK example for state-proof verification and completeness limitations would help security applications explain this boundary accurately.

## Graph representation and complete membership

Expected: tools can connect a context packet, source files and reviewed execution evidence. Observed: typed attributes support application-level node/edge indexing. We use `graph_hash`, `node_id`, `from_id`, `to_id` and `relation`, then implement bounded traversal in the SDK. This is not a native recursive graph query. A signed manifest lets a reader detect a missing or changed member relative to a pinned graph root. It does not independently prove chain metadata or global query completeness. Reproduce using `scripts/test-graph-mcp.ts` and the public graph manifest/source contracts.

## Large publication batch and transport failure

An initial 51-create `executeBatch` failed with an HTTP transport error during RPC execution. We cannot infer a protocol batch limit from that error. Publishing resumable batches of five succeeded; the next revision's 71 graph entities were read back and verified. Exact entity keys and transaction links are retained in `arkiv/ai-evidence.json`, including the previous graph revision. A documented recommended batch size and example for reconciling an uncertain transaction outcome would improve publisher recovery.

## Model output boundary is separate from Arkiv

Workers AI returned a structured guard object where our first integration expected a response string. Accepting the strict guard schema fixed the coding flow. A Hindi answer also contained an incorrect numeric conversion. The calculator now supplies all displayed numeric statements; unchecked numerical AI commentary is withheld. These are inference/application issues, not Arkiv defects. The corrected eight-case live report and explicit mock-inference unit scope are public.

## Correctly named runtime checks

The first runtime review reused a Qarinah-validator description intended for context packets. We withdrew that review and issued four correctly named checks backed by actual source hashing, deterministic arithmetic calls, six interpreted guard cases and quiz-reference shape checks. The original record, withdrawal and replacement remain inspectable in ai-evidence.json. The publisher now distinguishes context validation from runtime controlled calls; this is an application review-description correction, not an Arkiv defect.
## Arkiv Graph infrastructure addition

The first graph implementation mixed a reusable graph contract with AI Passport-specific type names, namespace and admission policy. I extracted the engine into `@ajnasnb/arkiv-graph`, added a generic protocol profile, and kept the existing application signing domain through `@ajnasnb/ai-passport`'s compatibility adapter. That preserves all previously published graph signatures and roots.

The useful gap was an application-level connected-data convention and complete-manifest reader. Arkiv's indexed entities supply persistence and queries. Recursive traversal, pinned revision policy and completeness verification run in the SDK. There is no native Cypher engine or server-side graph join in this project.

New evidence: a separate generic namespace has 7 nodes, 8 edges and 16 entities. A fresh tarball consumer reads both roots directly, verifies two CLI profiles, and runs eight real MCP trace/context success/budget cases. No website backend, access key or wallet is used by that consumer. Generic equipment types are exercised locally; equipment customers and production scale are not claimed.

Both 0.3.0/0.5.0 release tarballs passed a fresh install outside the workspace, standalone TypeScript compilation, all seven runtime entrypoint imports, two packaged graph CLI profiles and eight actual MCP checks. The separate application consumer passed original Qarinah validation, exact source hashing and the admission CLI with Qarinah 0.7.0. No workspace symlinks or `NODE_PATH` were used. Both packages are now public npm releases; unauthenticated registry metadata and tarball checks match the reviewed bytes in `npm-release.json`. Install exact versions from npm, or install both renamed tarballs together when using the adapter. Tarball consumer results are in `graph-infrastructure-evaluation.json` and `consumer-evaluation.json`; `--registry` reruns the gates anonymously with empty npm configs and a fresh cache, producing separate reports. Publication and these project-run installs do not establish external adoption or download counts. Reader configurations explicitly pin a root and accepted issuers; automatic latest-root discovery remains future work.

The two anonymous registry gates also completed successfully. `graph-infrastructure-evaluation-registry.json` records both graph profiles, two CLI checks and eight MCP cases; `consumer-evaluation-registry.json` records original Qarinah/source checks and the admission CLI. Both report exact installed package versions, all seven runtime imports and successful standalone TypeScript compilation. Their direct RPC evaluation read block 604241. Each install used empty user/global npm configuration, a fresh cache and a platform-essential-only child environment, without inherited authentication credentials.

## Making creator checks visible to a consumer

Expected: users can distinguish Arkiv's protocol creator from an issuer field inside an application payload. Observed: the graph reader exposes `GraphRecord.creator`, checks it against the recovered signature/accepted issuer, and the graph inspector now displays both on-chain creator and signed issuer. Reproduce by selecting `release.ts` in the AI reference graph, opening its signed entity in the explorer, and comparing `$creator`. The code is `packages/arkiv-graph/src/index.ts` and `apps/web/src/GraphExplorer.tsx`. A short security-oriented documentation example showing this UX alongside query construction would help builders avoid presenting self-asserted authorship as protocol metadata. The reader still trusts the RPC provider's metadata; it does not verify an independent state proof.

## Inspectable AI evidence is an application boundary

Expected: a graph/context identity should be traceable into the actual evidence message used for inference. Observed: the Worker now returns the same bounded JSON evidence it passes to `AI.run`, plus its byte digest. The browser verifies the receipt and evidence-message digests before rendering a successful run. Reproduce with the coding handoff, `Inspect AI inputs`, and `Download model evidence`; the first recorded run in this iteration used two selected events, one source excerpt and 1371 characters. Tests in `tests/ai.test.ts` compare the exported message to the actual mocked provider-call argument and verify that review rejection sends none. The hosted browser test uses real inference. This is application transparency, not an Arkiv inference feature or provider computation attestation. No Arkiv defect is claimed.

## Withdrawal retention must cover the target

Expected: a withdrawn review must not reappear as admissible while its target record remains live. A fixed 30-day duration for the withdrawal can end before an already long-lived or extended target, even if their signed validity agrees. The publisher now uses the target's observed expiry block with a fresh storage floor, and the evaluator requires coverage of both signed validity and target storage. An accepted malformed short withdrawal causes `unavailable`, including after its short signed deadline, rather than briefly withdrawing and later reviving a still-live target. A correctly covering replacement can repair that condition. Storage extension alone cannot renew a signed assessment. Reproduce with the withdrawal coverage and publisher tests; the completed session's review expires at block 1899792 and its withdrawal at 1899917.

## Two consumers need fresh decisions

Expected: a second consumer's next task request observes an exact-target review withdrawal without receiving the first consumer's cached decision. Completed session `77000888-ffdc-4ecf-beb8-df529adfb952` publishes a passport at block 603788, review at 603792 and same-author withdrawal at 603917. A and B independently admitted at 603794 and 603795. After a separate bounded visibility observation, B's next request refused at 603919 and A's next refused at 603920. The [session report](https://arkivgraph.ajnasnb.com/data/two-client-session.json) retains all signed snapshots, times, creators and transaction hashes.

Each client assembles the pinned graph through the generic SDK, checks the coding Qarinah packet and exact public source bytes, then evaluates a unique session descriptor and current review before deterministic guard execution. The request does not invoke a model. The browser clients share the read-only relay/provider; the operator consumers call RPC directly. Both wallets and client instances are operated by this project, without an independent-organisation or external-adoption claim.

Reproduce with `npx tsx scripts/two-client-demo.ts --plan`, then `npx tsx scripts/two-client-demo.ts --publish --hold-before-withdrawal` using two dedicated wallets funded with free Tiramisu testnet GLM. No custom contracts are required. The CLI saves the accepted report before pausing; Enter publishes the third transaction. An unknown broadcast is journaled, never automatically retried. Public endpoints cannot write records. A past accepted result remains a timestamped observation; withdrawal is checked at the next task request, not instantaneously.

## Admission deadline and runtime drift

Async signature checks can cross a signed deadline. Allowed decisions now expose `valid_until`; consumers check it again immediately before starting the task. The two-client flow also bounds admission by the graph deadline and removes positive presentation after that deadline. A fresh graph signature does not by itself prove that the deployed runtime matches its declared artifact. The AI Worker separately checks task edges, the exact signed model declaration, runtime descriptor, graph node, original runtime source and deployed source identity before inference. These are application bindings and drift protection, not proof of hosted model weights.

## Creator filtering and bounded queries

Unrelated publishers can use the same permissionless namespace and root attributes. Filtering accepted creators only after a query's page ceiling lets unrelated records consume the reader's budget. Both graph and admission readers now include the protocol `$creator` allowlist in the query before pagination, then verify issuer/creator agreement locally. The bound remains finite and a quota or incomplete read fails closed. This reduces unrelated-publisher page exhaustion; it does not independently prove RPC metadata or query completeness.

## Local CPU benchmark scope

`graph-benchmark.json` measures synthetic 20-, 100- and 200-node graphs on one Windows machine. The 20-node traversal case showed no improvement: scan and indexed medians were 0.1144 and 0.1148 ms. The 200-node/500-edge case measured 1.5017 and 1.0701 ms. Full signature, manifest and root verification was timed separately at 285.5, 1687.3 and 2843.6 ms for 80, 400 and 701 records. Signature/authentication work dominates these local graph operations. The benchmark excludes RPC, network, storage, gas and signing setup; its small samples do not establish production latency, throughput or distributed-scale behavior. Reproduce with `node --import tsx scripts/benchmark-graph.ts`.

## Testing the project's API dependency explicitly

Expected: a compatible consumer with its own pinned issuer/root policy and original public source snapshot can read current graph/review records through Arkiv even when this project's API cannot be reached. The configured RPC remains a dependency. Reproduce from the checkout with `node scripts/verify-backend-independence.mjs` (Node 24.15.0, public graph 0.3.0 and AI Passport 0.5.0). The wrapper installs anonymously in a new OS-temporary directory, uses empty npm configs, imports seven runtime entrypoints and compiles standalone TypeScript.

Actual on 15 October 2026 at 11:14:25 UTC: **7/7 checks passed**. The generic and AI graphs verified at block **606548**; the current withdrawn context was refused at **606549**. The trace contains six successful RPC requests: three `arkiv_getBlockTiming` and three `arkiv_query`, with zero successful project API fetches. Public-checkout source bytes matched the graph. Removing a signed member failed complete-manifest verification, and blocking RPC failed the graph read. Exact queries, source digest, package identities, request origins and timing are in [backend-independence.json](https://arkivgraph.ajnasnb.com/data/backend-independence.json).

Method and limits: the consumer replaces Node's global fetch before dynamically importing the installed SDK, rejects project domains and every destination except the exact public RPC, and allows only those two read methods. This is in-process HTTP fault injection; the live website stays online and no OS firewall or network sandbox is involved. The installed dependency's HTTP reads use that fetch transport. Policy, packet and source bytes are already available in the public checkout. The experiment establishes this API-independent read path with one working provider. It does not establish complete historical query results, hosted inference availability without its backend, outside adoption or resistance to Arkiv-wide censorship.

Suggested documentation improvement: ship an equally small client-only reader example with an explicit egress trace and a failing RPC control. It makes the boundary between portable records and a hosted application's availability straightforward to reproduce.
