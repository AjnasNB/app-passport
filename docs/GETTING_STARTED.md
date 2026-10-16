# Start with Arkiv Graph

Arkiv Graph is a TypeScript SDK for sharing attributable, connected records on Arkiv. A reader accepts a graph root and issuers, reconstructs every signed manifest member, then traverses the verified graph locally. AI Passport is one reference application built on that infrastructure.

Use Node.js **24 or newer**. The example below needs no account, wallet, token, API key, AI model or application backend. npm needs an internet connection to install the package; the graph example then runs offline.

## 1. Install the published SDK

In a new, empty folder:

```sh
npm init -y
npm install @ajnasnb/arkiv-graph@0.4.0
```

The generic package has no Qarinah or AI Passport dependency. The separate application adapter is `@ajnasnb/ai-passport@0.6.0`.

## 2. Build and traverse a local graph

Save this complete example as **`graph.mjs`**. A node digest is the content identity you choose to describe. Here it hashes a small local JSON artifact; it does not claim that a source file or publisher was verified.

<!-- quickstart:offline:start -->
```js
import { createGraphKit, digestJson } from '@ajnasnb/arkiv-graph';

const kit = createGraphKit();
const graph = kit.graphSchema.parse({
  schema: 'arkiv.graph.v1',
  label: 'My first connected evidence',
  nodes: [
    {
      id: 'package:demo',
      type: 'package',
      label: 'Demo package',
      digest: digestJson({ name: 'demo', version: '1.0.0' }),
      detail: 'A local package description.',
    },
    {
      id: 'source:demo',
      type: 'source',
      label: 'Demo source',
      digest: digestJson({ file: 'demo.js', content: 'export const answer = 42;' }),
      detail: 'A local source description.',
    },
  ],
  edges: [
    {
      id: 'edge:compiled-from',
      from: 'package:demo',
      to: 'source:demo',
      relation: 'compiled-from',
    },
  ],
});

const path = kit.traverseGraph(graph, 'package:demo', {
  depth: 2,
  maxNodes: 10,
});
if (path.truncated) throw new Error('Traversal budget exceeded');

console.log(JSON.stringify({
  graph_digest: digestJson(graph),
  nodes: path.nodes.map(node => node.id),
  edges: path.edges.map(edge => edge.id),
  truncated: path.truncated,
}, null, 2));
```
<!-- quickstart:offline:end -->

```sh
node graph.mjs
```

The result contains `package:demo`, `source:demo`, `edge:compiled-from`, a deterministic `sha256:` graph digest and `truncated: false`. This demonstrates strict graph validation and bounded directed traversal. It does not sign, publish or authenticate a network record.

From this repository, reproduce that exact documentation example in a fresh OS temporary folder, with anonymous npm configuration and a fresh cache:

```sh
node scripts/quickstart-proof.mjs
```

The proof installs **only graph 0.4.0** and its dependencies, checks the installed identity and absence of workspace symlinks, then disables all `fetch` calls before running the example. It returns a JSON result. It does not use a wallet or broadcast a transaction. The [successful recorded run](../apps/web/public/data/quickstart-proof.json) from 16 October 2026 produced the complete two-node/one-edge path. Fetch interception is the test control; it is not an OS network sandbox.

## 3. Verify a real published graph through RPC

This is a separate online read. Before running it, review the bootstrap through a channel you trust: chain **Tiramisu / 7738577**, the `arkiv-graph-v1` profile, the accepted issuer and the pinned graph digest below. The [public source repository](https://github.com/AjnasNB/arkiv-graph) and [publication evidence](https://arkivgraph.ajnasnb.com/data/graph-infrastructure.json) provide the project reference values. A configuration downloaded from the same server as its signatures does not independently establish trust. Choose your own RPC provider if required by your policy.

After reviewing those values, save this complete configuration as **`reader.json`**:

```json
{
  "schema": "arkiv-graph.reader.v1",
  "profile": "arkiv-graph-v1",
  "rpc": "https://rpc.tiramisu.db-chain.testnet.arkiv.network",
  "graph_digest": "sha256:724614507a2f0ddaccf7eb58fcc9e4981f3a344776c6f906986a057d05f80297",
  "issuers": ["0x4FEade3FF513A7954e9f7420aaa7BDEdc0BA4BDC"]
}
```

Or download a candidate and compare every field with the reviewed bootstrap before using it:

```sh
curl -o reader.json https://arkivgraph.ajnasnb.com/data/arkiv-graph-reader.json
```

Using the installed package:

```sh
npx arkiv-graph verify reader.json
npx arkiv-graph trace reader.json application:ai-passport
npx arkiv-graph context reader.json application:ai-passport
```

Successful verification of this reference revision reports **7 nodes, 8 edges and 16 signed entities**, plus the actual read block. These are project-published records, not external users. Expiry, an unavailable provider or incomplete evidence must fail; a recorded successful read is not a promise that finite testnet records remain available forever.

The [retained read-only CLI/RPC observations](../apps/web/public/data/quickstart-rpc-proof.json) record successful CLI verification at block `642819` and execution of the exact JavaScript recipe below at block `642820`. These are parsed operator observations from 16 October 2026, with no transaction broadcast. The exact observation time and full HTTP transcript were not retained.

For an MCP client, configure this command as a stdio server:

```sh
npx arkiv-graph mcp reader.json
```

It waits for MCP JSON-RPC input. The `trace_graph` and `read_context` tools verify a fresh complete graph for each call and refuse incomplete budgets. Results are untrusted evidence; they grant no tool permissions. Source references are not downloaded automatically.

For an explicit JavaScript RPC read, save this as **`read.mjs`** alongside the reviewed `reader.json`:

```js
import fs from 'node:fs/promises';
import { createGraphKit } from '@ajnasnb/arkiv-graph';

const config = JSON.parse(await fs.readFile('./reader.json', 'utf8'));
if (config.profile !== 'arkiv-graph-v1') throw new Error('Unexpected graph profile');
const kit = createGraphKit();
const live = await kit.readGraph({
  rpc: config.rpc,
  issuers: config.issuers,
}, config.graph_digest);
const selected = kit.traverseGraph(live.graph, 'application:ai-passport', {
  depth: 4,
  maxNodes: 40,
});
if (selected.truncated) throw new Error('Incomplete evidence');
console.log(JSON.stringify({ read_block: live.block, ...selected }, null, 2));
```

```sh
node read.mjs
```

For signed latest-root discovery and persistent rollback checkpoints, review [TRUST_SETUP.md](TRUST_SETUP.md). The pinned-root recipe above does not discover a newer root by itself.

## Graph schema and trust boundary

| Part | Required fields | What it establishes |
|---|---|---|
| Graph | `schema`, `label`, `nodes`, `edges` | One strict graph, with unique identities and no dangling endpoints |
| Node | `id`, `type`, `label`, `digest`, `detail` | A named content identity; optional source references need separate byte checking |
| Edge | `id`, `from`, `to`, `relation` | A directed, typed relationship between existing nodes |
| Signed node/edge payload | namespace, graph digest, issuer, issue/expiry time, member | An accepted issuer's statement about one member |
| Signed manifest | IDs and canonical digests of every node and edge | Exact membership for one graph revision |
| Consumer bootstrap | chain, profile, root, accepted issuers/provider | The consumer's trust policy; it is not inferred from a signature |

The [generic graph schema](../packages/arkiv-graph/schemas/graph.schema.json), [envelope schema](../packages/arkiv-graph/schemas/graph-envelope.schema.json) and [data contract](../arkiv/schema.md) specify the wire format. Runtime SDK validation adds uniqueness, endpoint, source-path, lifetime and cryptographic checks to JSON Schema.

The network reader filters accepted original creators before bounded pagination, pins one read block, and verifies readonly status, typed attributes, issuer/creator agreement, signatures, signed validity, exact manifest membership and the root. A missing, duplicate, changed or unlisted accepted member fails reconstruction. `graphPayloads` creates the node, edge and manifest payloads; `signGraph` signs them; `graphEntityInput` prepares readonly Arkiv writes. Publishing requires a funded signing wallet and is intentionally separate from the wallet-free examples.

Current limits are **200 nodes, 500 edges, eight query pages of 100 records, depth at most eight, and signed validity at most 30 days**. Signatures authenticate a statement and selected bytes; they do not establish source truth or execution safety. RPC metadata, current head and query completeness remain provider assumptions. No independent chain state proof or proof of unseen updates is checked. Returning consumers can retain observed history; fresh consumers can miss a newer update withheld by their sources.

## Where Arkiv fits

The problem is moving connected evidence between applications without making the originating application's API the only reader. Arkiv supplies shared indexed entities, original creator metadata, readonly publication and expiry. Arkiv Graph adds a public graph convention, signed complete revisions and bounded readers that another application can run through its own configured provider.

| Alternative | Good fit | What this project adds or still needs |
|---|---|---|
| Postgres | One operator controls writers and readers; relational joins and transactions are sufficient | Keep Postgres when it solves the problem. Arkiv is useful when multiple compatible consumers need the same attributable published records without the original app's API |
| Application API | An operator owns policy, availability and responses | A direct Arkiv reader can verify published membership locally; it still relies on an RPC provider and a reviewed bootstrap |
| IPFS/content-addressed files | Identifying and distributing immutable bytes | A content hash alone does not provide indexed creator/type/relation discovery or current application review state; pinning and availability still need a plan |
| Native graph database | Large graph queries and server-side joins | Arkiv Graph performs bounded local traversal after reconstruction; it is not a Cypher engine or an unbounded graph service |

The defensible work today is modest: a public versioned format, strict validators, conformance and failure tests, packaged TypeScript/CLI/MCP readers, and a working integration. The MIT license makes those reusable. Wider interoperability and maintained integrations could make adoption easier; there is no demonstrated external adoption, exclusive data advantage or proven network effect.

## Run the repository

```sh
git clone https://github.com/AjnasNB/arkiv-graph.git
cd arkiv-graph
npm ci --ignore-scripts
npm run build:sdk
npm run dev
```

`npm install` also installs a local checkout; `npm ci --ignore-scripts` reproduces its lockfile. Build the workspace SDKs before starting the website. Vite serves the interface at `http://127.0.0.1:5191` and proxies `/api` to a separate local Worker at `http://127.0.0.1:8791`. The commands above start the interface; live API panels need that separately configured backend. The wallet-free SDK examples read Arkiv directly and do not depend on the local website or Worker. Hosted AI and publishing are separate integrations; do not put keys in browser code or commit local configuration.

Run the source checks in a second terminal:

```sh
npm run typecheck
npm test
npm run build
node scripts/quickstart-proof.mjs
```

For the existing complete registry/CLI/MCP integration gate, run `node scripts/consume-graph-infra.mjs --registry`. That broader check installs both published packages and Qarinah in an isolated folder and performs real RPC reads. It is distinct from the small offline quickstart.

## Usage evidence

Refresh the public npm observation with:

```sh
node scripts/npm-usage.mjs
```

The resulting [`npm-usage.json`](../apps/web/public/data/npm-usage.json) preserves fetch times, explicit inclusive UTC date windows, official npm download API URLs, HTTP status and raw responses. The script also checks public registry versions without credentials. Downloads count package retrievals, including project/CI installs; they are **not unique people, applications, runtime graph reads or independent adoption**. A missing npm statistics response is recorded as unavailable with `downloads: null`, never as zero. No external user count or runtime read counter is currently verified.
