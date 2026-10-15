# Arkiv Graph

An MIT TypeScript SDK for complete signed graph manifests, typed relationships and bounded independent readers on Arkiv. AI Passport is a reference application; the default graph protocol accepts other domains.

## Install and verify a public graph

Node.js 24 or later is required for this tested release. Readers need no wallet or signing key.

```sh
npm install @ajnasnb/arkiv-graph@0.4.0
```

Save this public configuration as `reader.json` (the fixture expires; use your own root for a persistent integration):

```json
{
  "schema": "arkiv-graph.reader.v1",
  "profile": "arkiv-graph-v1",
  "rpc": "https://rpc.tiramisu.db-chain.testnet.arkiv.network",
  "graph_digest": "sha256:724614507a2f0ddaccf7eb58fcc9e4981f3a344776c6f906986a057d05f80297",
  "issuers": [
    "0x4FEade3FF513A7954e9f7420aaa7BDEdc0BA4BDC"
  ]
}
```

```sh
npx arkiv-graph verify reader.json
npx arkiv-graph trace reader.json application:ai-passport
npx arkiv-graph context reader.json application:ai-passport
```

Expected verification: `verified: true`, 7 nodes, 8 edges, 16 entities and the observed read block. Counts describe this project-published fixture, not outside adoption. A quota, timeout, expired fixture or incomplete graph produces an error; never substitute an old positive result. Choose your own RPC/provider and accepted authors for real use.

The complete JavaScript reader is packaged at `examples/read.mjs`:

```sh
node node_modules/@ajnasnb/arkiv-graph/examples/read.mjs reader.json
```

## Publish your own synthetic graph

The complete `examples/publish.mjs` creates two synthetic equipment/inspection nodes, one relationship and one manifest, signs every member, submits four actual entities, writes a public reader configuration and verifies it through Arkiv. Set `ARKIV_GRAPH_PRIVATE_KEY` using a private environment or secret manager, fund that dedicated account with free Tiramisu testnet tokens through [Arkiv Hub](https://hub.arkiv.network/), then explicitly broadcast:

```sh
node node_modules/@ajnasnb/arkiv-graph/examples/publish.mjs --publish
npx arkiv-graph verify graph-reader.json
```

Optional environment: `ARKIV_GRAPH_RPC` (HTTPS) and `ARKIV_GRAPH_API_KEY` (private provider quota). Neither secret is written to the generated public configuration. Never commit a private key, access key, private source content or personal data. The synthetic graph has seven-day signed validity and 30-day storage; renewals require a new deliberate publication. If a transaction outcome is uncertain, inspect its printed transaction ID before retrying. Independent readers choose whether to trust the public creator; publication grants no universal authority.

## Reader CLI and MCP

Download a public `arkiv-graph.reader.v1` configuration. It pins the root, protocol profile, RPC and locally accepted issuer wallets. No API key or private wallet key belongs in that file.

```sh
npx arkiv-graph verify reader.json
npx arkiv-graph trace reader.json application:ai-passport
npx arkiv-graph mcp reader.json
```

The `mcp` command exposes `trace_graph` over stdio. It checks the complete signed graph before returning a bounded path. It returns an error for truncated paths, expired evidence or missing members. Results are explicitly untrusted data.

## Protocol

The generic default uses `arkiv.graph.v1`, `arkiv.graph-record.v1` and namespace `arkiv-graph-v1`. Nodes accept domain-specific type names and edges accept domain-specific relation names. Required node digests bind bytes or canonical structured content; digests do not prove those facts are true.

Each revision has one signed manifest listing every node and edge digest. Readers verify signatures, creator/issuer agreement, accepted issuers, validity, unique entity keys, exact membership and the reconstructed graph root. Arkiv indexes namespace, schema version, graph hash, kind, node identity/type and edge endpoints/relation.

`createGraphKit(profile)` allows application namespaces and protocol domains. `AI_PASSPORT_PROFILE` preserves existing AI Passport record signatures and graph roots. Changing a profile defines a different protocol. Both parties must agree on the profile.

Limits: 200 nodes, 500 edges, eight pages of 100 entities, directed traversal depth at most eight, signed validity at most 30 days. Current writer helper reserves one day of its 30-day storage period beyond the signed expiry. No native Cypher engine, arbitrary property queries, automatic mutation/merge or hosted graph service is claimed. Every read pins one explicit block and rejects mismatched pages. Within a revision the manifest detects missing members; it cannot prove an RPC has exposed every possible graph revision.

## Authenticated root updates

The optional `@ajnasnb/arkiv-graph/trust` entry point exports `readRootRegistry`, `verifyRootRevisions`, `verifyRpcObservations` and `mergeWithdrawalJournal`. Pin an authority/configuration out of band. Revisions bind the chain, profile, policy and previous signed revision; retain the returned checkpoint only after complete graph verification. Returning readers reject a shorter or conflicting history. Use an exclusive lock around the full load/read/verify/save operation when sharing persistent state across tabs or processes.

The [setup guide](https://github.com/AjnasNB/arkiv-graph/blob/main/docs/TRUST_SETUP.md) and [live root-update demonstration](https://arkivgraph.ajnasnb.com/?view=trust) include actual testnet records. The public demo uses one provider. Configured-provider comparisons and local retained withdrawals do not prove global history completeness; deleting local storage loses observed rollback history. Bootstrap authority/policy rotation remains an explicit consumer decision.

Qarinah selection and passport review/withdrawal admission remain separate application layers. Equipment and document examples demonstrate the generic schema locally and do not claim customer adoption.


## AI context adapter

`@ajnasnb/arkiv-graph/context` exports `readGraphContext(connection, graphDigest, start, options)`. It authenticates a current complete pinned graph before traversing a bounded path. The optional caller-controlled `loadSource(node)` must return original bytes, which are checked against the signed node digest before a labelled excerpt is included. The SDK never opens arbitrary files or fetches source URLs on its own. Without a loader, source references are explicitly unverified.

Context carries `contentRole: untrusted-data`, `execution_authority: false`, the graph root and read block, selected node/edge identities, source references and a context digest. Character limits are 512–12,000 and source excerpts at most 2,000 characters. Whole source byte limits are 2 MiB per source and 4 MiB total. Invalid, incomplete, changed or over-budget paths fail. Token counts are rough character estimates. Source truth and review admission remain separate application responsibilities.

The CLI adds `arkiv-graph context reader.json starting-node`. The stdio MCP server provides `trace_graph` and `read_context`; both verify current graph membership and reject incomplete paths. MCP source references are not downloaded and do not claim byte verification.
