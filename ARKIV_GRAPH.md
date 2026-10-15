# Arkiv Graph and AI Passport

Arkiv Graph is reusable infrastructure over Arkiv's indexed entities. AI Passport is its live reference application. The SDK verifies signed graph revisions before handing a bounded connected path to another application.

## Packages

| Package | Release | Purpose |
|---|---|---|
| `@ajnasnb/arkiv-graph` | 0.3.0 | Generic graph protocol, TypeScript reader, context adapter, CLI and stdio MCP server |
| `@ajnasnb/ai-passport` | 0.5.0 | Compatible AI graph profile, signed artifact/context admission, Qarinah adapter and bounded tools |

The generic package supports developer-defined node types and relations without a Qarinah, passport or model dependency. The application adapter preserves the existing `ai-passport-graph-v1` signing domain and roots; the generic default uses `arkiv-graph-v1`.

Both packages are published publicly on npm. Unauthenticated registry metadata and tarball fetches verified the exact reviewed bytes; [release evidence](https://arkivgraph.ajnasnb.com/data/npm-release.json) records the checks. Install the generic reader:

```sh
npm install @ajnasnb/arkiv-graph@0.3.0
curl -o reader.json https://arkivgraph.ajnasnb.com/data/arkiv-graph-reader.json
npx arkiv-graph verify reader.json
npx arkiv-graph trace reader.json application:ai-passport
npx arkiv-graph mcp reader.json
```

For the application adapter:

```sh
npm install @ajnasnb/arkiv-graph@0.3.0 @ajnasnb/ai-passport@0.5.0 qarinah@0.7.0
```

Both release tarballs also passed isolated installation, all seven runtime entrypoint imports, standalone TypeScript compilation, real direct RPC reads and packaged CLI checks with Qarinah 0.7.0. To use those downloadable builds, install both together:

```sh
npm install https://arkivgraph.ajnasnb.com/downloads/ajnasnb-arkiv-graph-0.3.0.tgz https://arkivgraph.ajnasnb.com/downloads/ajnasnb-ai-passport-0.5.0.tgz qarinah@0.7.0
```

Node.js 24 is tested. Readers need no wallet or gas tokens. Example configurations pin a graph root and accepted issuers; downloading one does not establish your trust policy. The default CLI uses Tiramisu. Custom chains and graph profiles are available through the TypeScript API.

## Protocol and reader

A complete signed manifest commits to every node and relationship in one revision. The reader checks accepted original creators in the indexed query before pagination, then verifies signatures, issuer/creator agreement, readonly status, typed attributes, validity, complete membership and the pinned root. Missing or changed required members fail verification. Bounded directed traversal runs locally after reconstruction.

The graph does not make factual truth or execution authority part of a signature. Source bodies stay in ordinary files; the context adapter hashes bytes supplied by a caller-controlled loader before selecting an excerpt. Its result is marked `contentRole: untrusted-data` and `execution_authority: false`. CLI and MCP source references are not automatically downloaded.

```ts
import { createGraphKit } from '@ajnasnb/arkiv-graph';
import { readGraphContext } from '@ajnasnb/arkiv-graph/context';

const connection = { rpc, issuers };
const kit = createGraphKit();
const live = await kit.readGraph(connection, graphDigest);
const path = kit.traverseGraph(live.graph, 'application:ai-passport', {
  depth: 4, maxNodes: 40,
});
if (path.truncated) throw new Error('Incomplete evidence');
const context = await readGraphContext(connection, graphDigest,
  'application:ai-passport', { maxChars: 12000 });
```

Graph bounds are 200 nodes, 500 edges, eight pages of 100 records and traversal depth at most eight. Signed graph validity is at most 30 days. Revision roots are explicit configuration; automatic latest-root discovery is not implemented.

## Why use Arkiv here?

Arkiv supplies shared indexed entities, immutable original creator metadata, expiry and transactions. The SDK supplies the graph contract, revision manifest, reader and traversal conventions. Compatible consumers can inspect the same attributable records through their own provider, without depending on this website's dynamic API.

An ordinary database is suitable when one operator controls all writers and readers. The benefit here is a shared interchange for connected evidence. No native Cypher engine, server-side graph join, production-scale performance, outside customer adoption or Arkiv endorsement is claimed. Signed application payloads are checked locally; protocol metadata and query completeness still rely on the RPC provider. No independent chain state proof is checked.

## A working lifecycle across two consumers

The [live two-client page](https://arkivgraph.ajnasnb.com/two-client/) uses the reference graph's `context:handoff` path and exact public source bytes. A session-specific context descriptor prevents an old review of the same packet from granting admission. Each consumer rereads the graph and current review, verifies the Qarinah/source bindings, and runs six deterministic guard cases only after evidence admission. There is no model call in this demonstration.

Session `77000888-ffdc-4ecf-beb8-df529adfb952` is complete: three actual transactions, A and B independently admitted before the exact-target withdrawal, then B's next request and A's next request refused. The [report](https://arkivgraph.ajnasnb.com/data/two-client-session.json) includes signed records, creators, blocks, timestamps, transaction hashes, query snapshots and bounded visibility observations. It preserves historical observations; it does not grant current admission.

Reproduce from the repository with two dedicated wallets funded by free Tiramisu testnet GLM. Set `TWO_CLIENT_PRODUCER_KEY` and `TWO_CLIENT_REVIEWER_KEY` locally, or use the existing private operator helper. Optional settings: `TWO_CLIENT_RPC` and `TWO_CLIENT_API_KEY`.

```sh
npx tsx scripts/two-client-demo.ts --plan
npx tsx scripts/two-client-demo.ts --publish --hold-before-withdrawal
```

The three writes are passport, review and withdrawal. Hold mode first saves the accepted-phase report for inspection, then Enter publishes the withdrawal. After a separate bounded query-visibility check, B's next task request independently rereads and refuses. Pending signed intent and known transaction hashes remain in a local journal; uncertain broadcasts are not retried automatically. No custom contracts are needed. Public endpoints only read evidence.

Both wallets and both consumer instances are operated by this project. The browser consumers share a read-only relay and configured RPC provider. They are not independent people or organisations. Results describe their request time; later withdrawal is checked on the next request. Signed deadlines also bound admission immediately before task execution.

## Reproducible evidence

| Evidence | What was exercised |
|---|---|
| [Infrastructure graph](https://arkivgraph.ajnasnb.com/data/arkiv-graph-reader.json) | 7 nodes, 8 edges, 16 signed entities |
| [AI reference graph](https://arkivgraph.ajnasnb.com/data/ai-passport-reader.json) | 27 nodes, 43 edges, 71 signed entities, including four selected historical AI run receipts |
| [Clean graph consumer](https://arkivgraph.ajnasnb.com/data/graph-infrastructure-evaluation.json) | Both direct RPC roots, two packaged CLI profiles, eight actual stdio MCP success/budget cases |
| [Clean application consumer](https://arkivgraph.ajnasnb.com/data/consumer-evaluation.json) | Original Qarinah validation, selected source identity, graph/tools and admission CLI |
| [Anonymous registry graph consumer](https://arkivgraph.ajnasnb.com/data/graph-infrastructure-evaluation-registry.json) and [application consumer](https://arkivgraph.ajnasnb.com/data/consumer-evaluation-registry.json) | Both published releases installed without credentials; the same TypeScript, runtime, direct RPC, CLI and MCP gates passed |
| [Two-client session](https://arkivgraph.ajnasnb.com/data/two-client-session.json) | Three transactions and four recorded admission/task outcomes |

From the repository, run `node scripts/consume-graph-infra.mjs` and `node scripts/clean-consumer.mjs`. Each creates a new consumer outside the workspace, installs the release tarballs, compiles standalone TypeScript and imports all exported entrypoints with no workspace symlink or `NODE_PATH`. Add `--registry` to install the exact public npm versions with empty npm configs, a fresh cache and no inherited credentials; it writes separate reports. Public reports update only after successful actual runs. Publication and project-run installation are not evidence of independent adoption.

The [local CPU benchmark](https://arkivgraph.ajnasnb.com/data/graph-benchmark.json) is a single-machine synthetic measurement within the graph limits. At 20 nodes, scanning and indexed traversal were effectively unchanged (0.1144 and 0.1148 ms medians). At 200 nodes/500 edges they measured 1.5017 and 1.0701 ms. Complete signature/manifest/root verification was measured separately and cost 285.5 ms for 80 records, 1687.3 ms for 400, and 2843.6 ms for 701. Network, RPC, storage and gas are excluded. These results do not establish production service latency or distributed scale.

See the [judge guide](https://arkivgraph.ajnasnb.com/judges.html), [schema](arkiv/schema.md), [integration findings](arkiv/friction.md) and [baseline disclosure](PREEXISTING.md). The 198 local tests, 18 browser checks (sixteen existing flows plus two signed-fixture/mock-response UI regressions), hosted AI evaluation and actual two-client browser capture are separate evidence. The actual session browser report records four requests and zero browser errors.
