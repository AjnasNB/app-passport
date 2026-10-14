# Arkiv Graph + AI Passport

I built Arkiv Graph as reusable infrastructure for connected records on Arkiv. AI Passport is its working reference application, with useful AI tasks and selected Qarinah memory. See [ARKIV_GRAPH.md](ARKIV_GRAPH.md) for the separate SDK, protocol, live infrastructure graph and setup.

- Live: https://arkivgraph.ajnasnb.com
- Source: https://github.com/AjnasNB/arkiv-graph
- Graph SDK: https://arkivgraph.ajnasnb.com/downloads/arkiv-graph-sdk-0.2.0.tgz
- AI Passport adapter: https://arkivgraph.ajnasnb.com/downloads/app-passport-sdk-0.4.0.tgz (install with the graph tarball)
- Architecture: [ARCHITECTURE.md](ARCHITECTURE.md)
- Evaluation PDF: https://arkivgraph.ajnasnb.com/downloads/arkiv-graph-evaluation.pdf
- Launch film: https://arkivgraph.ajnasnb.com/media/arkiv-graph-launch.mp4
- Graphical pitch: https://arkivgraph.ajnasnb.com/downloads/arkiv-graph-pitch.pptx
- Pitch PDF: https://arkivgraph.ajnasnb.com/downloads/arkiv-graph-pitch.pdf

## Three useful tasks

**Coding handoff** carries the current Qarinah source and decision context into a real hosted model call. The model generates a finite release-guard specification. An interpreter tests six boundary cases and exports readable JavaScript. Arbitrary model-generated code is never executed.

**India number tutor** calculates exact paise, Indian number grouping and lakh/crore values. English and Hindi views use verified numeric output. Optional AI commentary containing unchecked numerical claims is withheld.

**UPI Safety Quest** is a playable three-round learning game with deterministic scoring and an optional real AI coach. Project-authored learning summaries cite NPCI primary guidance. No PIN, bank account or payment is involved.

The actual runtime model is Cloudflare-hosted @cf/meta/llama-3.2-3b-instruct. Hosted weights and computation are not independently attested. Public demonstrations use disclosed public or synthetic inputs. Private Qarinah memory stays local.

## Connected evidence

Signed application, context, tool, source, model, review and run nodes are connected by signed edges. A complete signed manifest pins every member and the graph root. Original source URLs and content digests remain inspectable. The public graph links actual Arkiv entities.

Arkiv supplies typed indexed entities, original creator metadata, readonly creation and expiry. The graph contract and bounded traversal are built in this SDK, not native Cypher or Solidity. Other readers query the same evidence through their own RPC provider, without this website backend, while choosing accepted authors. A conventional database is sufficient for a single operator’s calculator or chat; Arkiv matters for shared, attributable, current evidence. Publishing a claim does not make it true. Chain metadata and query completeness still depend on the provider.

Both demo wallets are project controlled. They do not represent independent organizations or upstream endorsements. Selected real run receipts are public evaluation evidence; no customer adoption is claimed.

## Reproduce

Node.js 24 is tested.

```sh
npm ci --ignore-scripts
npm run build
npm run typecheck
npm test
npm run fixtures
npx tsx scripts/evaluate-ai.ts
npx tsx scripts/test-graph-mcp.ts
node scripts/consume-graph-infra.mjs
```

The live suite covers coding, English/Hindi number views, the safety coach and withdrawn/expired/tampered/stale inputs. Failed evidence blocks inference. Actual receipts are in /data/ai-evaluation.json; /data/anchored-ai-evaluation.json preserves the evaluated snapshot linked into the graph. Release evidence includes 96 local tests, eight direct SDK/MCP checks and sixteen hosted browser flows. Browser media checks cover playback and forward/backward seeking. See the JSON reports for scope and results.

Install the SDK tarball in another project. Read /data/policy.json and /data/graph-config.json, then use:

```ts
import { readGraph, traverseGraph } from '@app-passport/sdk/graph';
const live = await readGraph({ policy, rpc }, graphDigest);
const path = traverseGraph(live.graph, 'app:coding', { depth: 4 });
if (path.truncated) throw new Error('Incomplete evidence');
```

The Node Qarinah adapter runs Qarinah’s original validator and checks actual repository files before admission. The clean tarball consumer is `node scripts/clean-consumer.mjs`, tested with Qarinah 0.7.0 without the website backend.

## MCP evidence bridge

`npx tsx scripts/graph-mcp.ts` starts a stdio MCP server from this repository root. Its trace_evidence tool reads the current signed graph through raw Tiramisu RPC and returns a bounded path as untrusted data. It does not grant execution authority or perform writes. Any compatible AI client can consume the same contract. The independent client test initializes MCP and checks all three application paths plus rejection of incomplete traversal.

## Contracts and publication

Namespaces: app-passport-v1 for passports/reviews/withdrawals, ai-passport-graph-v1 for the reference app graph, and arkiv-graph-v1 for reusable infrastructure. Chain ID: 7738577. Arkiv SDK: 0.8.1. See [arkiv/schema.md](arkiv/schema.md) and [arkiv/friction.md](arkiv/friction.md).

Readers need no wallet or Web3 tokens. Writers use free Tiramisu test tokens and an accepted issuer. Credentials stay outside the repository; the quota key stays in a Cloudflare secret. Public endpoints cannot write chain records.

Build public India contexts and the graph using scripts/build-ai-fixtures.ts. Publish/resume small batches with scripts/publish-ai.ts. Current and previous root revisions, transaction links and entity keys are in arkiv/ai-evidence.json. Check existing receipts/query state before retrying an uncertain transaction.

## Boundaries

The graph is limited to 200 nodes/500 edges, traversal depth eight and bounded node count. Run memory is limited to 10,000 characters and output to 420 tokens. A Durable Object reserves at most forty model attempts per UTC day; a per-IP limiter permits three requests per minute. Calculator, game and evidence readers work without inference. No paid plan upgrade or mainnet transaction is required.

Storage lasts 30 days and signed evidence is finite; the operator must renew it. Memory comparisons measure characters, with approximate chars/4 token estimates. Tests do not certify universal model accuracy, malware safety, a complete OS sandbox, computation proof or perpetual availability.

Ten pinned public tool artifacts passed MCP initialization, listing and controlled calls. Their versions, source URLs and actual results remain in /data/tools.json and /data/protocol-evaluation.json. Local orchestration tests use mock inference; the live suite makes actual provider calls.

MIT covers new Arkiv Graph and AI Passport code. The copied Qarinah runtime retains Apache-2.0 and notices. [PREEXISTING.md](PREEXISTING.md) discloses the exact baseline. Original Qarinah and ScamSignal folders are preserved. Generated artwork is conceptual. The current 72-second launch film uses original motion scenes and music with actual product captures; earlier films remain separate. Production sources and credits are in [media/README.md](media/README.md).

