# Arkiv Graph SDK

An MIT developer infrastructure package for connected records on Arkiv. AI Passport is its reference application, not a dependency or required domain.

## Install

This release is distributed as a downloadable tarball. It is **not published on the npm registry**.

```sh
npm install https://passport.ajnasnb.com/downloads/arkiv-graph-sdk-0.1.0.tgz
```

```js
import {createGraphKit, digestJson} from '@arkiv-graph/sdk';
const kit = createGraphKit();
const graph = kit.graphSchema.parse({
  schema: 'arkiv.graph.v1', label: 'Equipment maintenance',
  nodes: [
    {id:'equipment:pump',type:'equipment',label:'Pump',digest:digestJson({serial:'demo-01'}),detail:'Synthetic example'},
    {id:'inspection:one',type:'inspection',label:'Inspection',digest:digestJson({checked:true}),detail:'Synthetic example'}
  ],
  edges: [{id:'edge:inspection',from:'equipment:pump',to:'inspection:one',relation:'inspected-by'}]
});
const payloads = kit.graphPayloads(graph, account.address, issuedAt, validUntil);
const signed = await Promise.all(payloads.map(p => kit.signGraph(p, account)));
const inputs = signed.map(kit.graphEntityInput);
// Submit inputs with an Arkiv wallet client. Small resumable batches are recommended.
const live = await kit.readGraph({rpc, issuers:[account.address]}, digestJson(graph));
const path = kit.traverseGraph(live.graph, 'equipment:pump', {depth:4,maxNodes:40});
if (path.truncated) throw new Error('Incomplete path');
```

Writers need testnet gas tokens. Readers need no wallet. The public demo uses free Tiramisu tokens and independent raw RPC readers. Production chain costs and RPC quotas depend on the provider.

## Reader CLI and MCP

Download a public `arkiv-graph.reader.v1` configuration. It pins the root, protocol profile, RPC and locally accepted issuer wallets. No API key or private wallet key belongs in that file.

```sh
npx arkiv-graph verify reader.json
npx arkiv-graph trace reader.json app:coding
npx arkiv-graph mcp reader.json
```

The `mcp` command exposes `trace_graph` over stdio. It checks the complete signed graph before returning a bounded path. It returns an error for truncated paths, expired evidence or missing members. Results are explicitly untrusted data.

## Protocol

The generic default uses `arkiv.graph.v1`, `arkiv.graph-record.v1` and namespace `arkiv-graph-v1`. Nodes accept domain-specific type names and edges accept domain-specific relation names. Required node digests bind bytes or canonical structured content; digests do not prove those facts are true.

Each revision has one signed manifest listing every node and edge digest. Readers verify signatures, creator/issuer agreement, accepted issuers, validity, unique entity keys, exact membership and the reconstructed graph root. Arkiv indexes namespace, schema version, graph hash, kind, node identity/type and edge endpoints/relation.

`createGraphKit(profile)` allows application namespaces and protocol domains. `AI_PASSPORT_PROFILE` preserves existing AI Passport record signatures and graph roots. Changing a profile defines a different protocol. Both parties must agree on the profile.

Limits: 200 nodes, 500 edges, eight pages of 100 entities, directed traversal depth at most eight, signed validity at most 30 days. Current writer helper reserves one day of its 30-day storage period beyond the signed expiry. No native Cypher engine, arbitrary property queries, automatic mutation/merge, hosted graph service or scale benchmark is claimed. Callers must choose accepted authors and refresh their root configuration when adopting a new revision. Within a revision the manifest detects missing members; it cannot prove an RPC has exposed every possible graph revision.

Qarinah selection and passport review/withdrawal admission remain separate application layers. Equipment and document examples demonstrate the generic schema locally and do not claim customer adoption.
