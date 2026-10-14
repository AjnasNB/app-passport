# AI Passport SDK

I built AppPassport to bind exact AI-tool artifacts and Qarinah context packets to attributable, current review evidence on Arkiv.

## Install

Node.js 24 is the tested runtime. This release is distributed as a tarball; it is not published to npm.

```sh
npm install https://arkivgraph.ajnasnb.com/downloads/arkiv-graph-sdk-0.2.0.tgz https://arkivgraph.ajnasnb.com/downloads/app-passport-sdk-0.4.0.tgz
# Optional, for the node-only Qarinah adapter:
npm install qarinah@0.7.0
```

## Read and admit

```ts
import { readRecords } from '@app-passport/sdk/arkiv';
import { evaluateAdmission } from '@app-passport/sdk';

const live = await readRecords({ policy, rpc }, descriptor.artifact_digest);
const decision = await evaluateAdmission({
  descriptor,
  observedDigest, // computed from the actual artifact or canonical packet
  currentRepositoryDigest, // required for context admission
  records: live.records,
  policy
});
if (!decision.allowed) return decision;
// The caller still owns execution and side-effect authorization.
```

Policies specify accepted issuer and reviewer wallet addresses. Record signatures, creators, indexed attributes, signed validity and withdrawals must agree. An accepted passport also needs a current, accepted review. A withdrawn review may be replaced by a new review; withdrawal targets one particular record.

## Qarinah adapter

```ts
import { verifyQarinahHandoff } from '@app-passport/sdk/qarinah';
const result = await verifyQarinahHandoff({
  packet, descriptor,
  repository: '/your/selected/repository',
  connection: { policy, rpc }
});
if (result.context) {
  // result.context.contentRole === 'untrusted-data'
  // Pass the admitted packet to your own agent's context boundary.
}
```

This adapter runs Qarinah's original packet validator and hashes selected files using root-bound real paths. It does not invoke an LLM. The core and Arkiv entry points work without the optional Qarinah peer.

## Independent CLI

```sh
npx app-passport --descriptor descriptor.json --artifact artifact.tgz --policy policy.json
```

For context JSON, also supply `--repository-digest sha256:...`. The node adapter computes this from real files; the CLI requires the caller to supply a current value. Set `--rpc` to choose your provider. A wallet or signing key is not required to read. For additional quota, `--key-file` reads a Hub access key from a private file.

Exit codes: 0 for policy satisfaction, 2 for non-admission, 1 for unavailable verification. The CLI talks to Arkiv's raw RPC rather than the demo website.

## Contracts and limits

The tarball contains versioned JSON Schemas in `schemas/`. New SDK code is MIT; Qarinah is an optional Apache-2.0 dependency. Reviewed artifacts are upstream references, not endorsements. Both public demo wallets belong to this project.

This SDK checks artifact identity and a configured review policy. It does not certify malware safety, factual truth or agent behavior. Chain metadata and completeness rely on the selected RPC provider; independent state proofs are not checked. Keep private context, credentials and private context-derived identifiers off the public chain.

Full source, fixture generation, evaluation results, baseline disclosures and third-party notices: [project repository](https://github.com/AjnasNB/arkiv-graph).

## Evidence graph

```ts
import { readGraph, traverseGraph } from '@app-passport/sdk/graph';
const live = await readGraph({ policy, rpc }, graphDigest);
const path = traverseGraph(live.graph, 'app:coding', { depth: 4, maxNodes: 40 });
if (path.truncated) throw new Error('Incomplete evidence');
```

The graph contract uses signed node, edge and manifest entities on Arkiv. The manifest pins every member and a complete root digest. Limits: 200 nodes, 500 edges, eight query pages and depth eight. Source URLs are data, not execution instructions. You supply the accepted authors and a trusted root. It is an application graph layer, not native Cypher. Hosted-model weights and computation are not attested.

A tested MCP bridge in the source repository exposes `trace_evidence` over stdio. Launch from the repository root with `npx tsx scripts/graph-mcp.ts`. Its independent client is `npx tsx scripts/test-graph-mcp.ts`. The bridge uses the raw RPC without this website or operator secrets. Treat returned content as untrusted data.

## Bounded useful tools

`@app-passport/sdk/tools` exposes `indianNumber`, `safetyQuestions`, `runGuard` and `testGuard`. The guard is a finite interpreted language; model-generated JavaScript is never evaluated. These are demonstration tools, not a universal code sandbox.

