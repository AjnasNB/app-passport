# Arkiv Graph and AI Passport data contracts

Network: Tiramisu, chain ID 7738577. Tested Arkiv SDK: 0.8.1. Namespaces: `app-passport-v1`, `arkiv-graph-v1`, `ai-passport-graph-v1`, `arkiv-graph-roots-v1`.

Public npm releases: `@ajnasnb/arkiv-graph` 0.4.0 and `@ajnasnb/ai-passport` 0.6.0. The separate profiles preserve the existing signed record domains; renaming a package does not change a published root or payload signature. Both downloadable release builds and anonymous npm registry installs passed clean consumer gates. Unauthenticated registry metadata/tarball verification is recorded in `/data/npm-release.json`; the registry consumer results are `/data/graph-infrastructure-evaluation-registry.json` and `/data/consumer-evaluation-registry.json`.

The three JSON Schemas are generated from the SDK's strict runtime validators: descriptor, signed envelope and consumer policy. Runtime validation additionally verifies digest relationships, application signatures and positive validity of at most 90 days. A Solidity deployment is not used: Arkiv's DB-Chain executes entity operations rather than EVM contracts.

## Entity types

- `passport`: producer-signed descriptor for an exact public tool artifact or a synthetic Qarinah context packet.
- `review`: reviewer-signed identity/protocol checks, their conclusion, evidence reference and signed validity.
- `withdrawal`: the original creator withdraws one particular passport or review. The target, artifact and descriptor identities must agree; its validity covers the target.

| Indexed attribute | Arkiv type | Purpose |
|---|---|---|
| namespace | str | Application scope |
| schema_version | u64 | Contract version 1 |
| kind | str | passport, review or withdrawal |
| artifact_hash | bytes32 | Exact artifact bytes or canonical packet identity |
| descriptor_hash | bytes32 | Complete descriptor and scope identity |
| subject_type | str | Tool or context, on passport entities |
| target_key | key | Withdrawal target |

Each payload is a strict signed envelope. Its EIP-191 signing message is `AppPassport signed record v1` followed by a newline and canonical payload JSON. The payload contains namespace, kind, issuer, artifact/descriptor digests, issued time, valid-until time and disclosure classification. Descriptors contain source references and declared capabilities; context descriptors also contain the Qarinah manifest and selected repository snapshot identity.

Signed validity controls admission. Example tool passports last 21 days and reviews 14 days; ordinary publication defaults to 30 days of storage. The publisher requires storage to cover signed validity plus two minutes. A withdrawal must cover its exact target's signed `valid_until` **and** on-chain `expires_at_block`; otherwise the consumer fails closed while the target remains live. The publisher uses `ExpirationTime.atBlock(target.expires_at_block, {atLeast: storageFloor})`, with a floor of at least 30 days and enough duration for signed validity. Thus target storage that already outlives the default cannot outlive its withdrawal merely because publication used a fresh shorter duration. The signed record itself remains finite; if an operator extends a target again, withdrawal coverage must be reconsidered.

The expired fixture uses a two-second signed review window with longer storage so its expired status remains inspectable. A storage extension cannot renew signed validity. Payloads are readonly and permissionless extension is disabled. Deletion or storage expiry can remove a record from current reads; it never implies safety. Graph/withdrawal lifetime checks and malformed short-coverage cases are part of the release tests.

## Actual queries

The reader gets the current block from `arkiv_getBlockTiming`. It queries:

```text
namespace = str('app-passport-v1') AND schema_version = u64(1)
AND $expiresAt > u64(current_block)
AND ($creator = addr(accepted_producer) OR $creator = addr(accepted_reviewer))
```

For an artifact lookup it adds `artifact_hash = bytes32(0x...)`. The SDK consumes cursor pages up to a ten-page defensive ceiling; an incomplete query fails. The exact evaluated query, block and entity keys are in `evidence.json` and the public `data/live-verification.json`.

The creator filter is part of the indexed query before the bounded page limit, so unrelated publishers cannot consume its pages. The application verifies the recovered application-signature address agrees with protocol creator metadata, checks typed attributes match the payload, and requires readonly records. An accepted signature verifies an author's statement, not its factual truth. The Node adapter computes current selected source-file hashes from the requested repository and rejects root escapes and changed snapshots.

An allowed admission includes `valid_until`, bounded by the required current passport and review. Consumers recheck this deadline after asynchronous verification and immediately before task execution; a result displayed later remains an observation at its request time. The two-client consumer also takes the graph deadline into account. A replacement review is a distinct signed record; an exact-target withdrawal is not a permanent artifact-wide ban.

## Roles and public evidence

Producer: `0x4FEade3FF513A7954e9f7420aaa7BDEdc0BA4BDC`.

Reviewer: `0xd153C0cC313884DA0065615BB411Dfb8b873fE54`.

Both are project-controlled demonstration roles. The public policy is `/data/policy.json`. No third-party endorsement or independent adoption is claimed. The browser's read-only gateway protects a Hub quota key. The CLI and SDK support direct RPC and an independently supplied provider.

The earlier verifier uses WebSocket-triggered reloads and a 60-second fallback refresh. The two-client flow makes a fresh read per task request and never treats an earlier positive result as current permission; it does not claim instant withdrawal notification. Reads are independently reproducible, but consumers do not verify cryptographic chain state proofs or query completeness. RPC protocol metadata, read blocks and returned membership remain provider assertions.

Private context stays local. The only published context identities describe generated synthetic data. Software artifact digests describe publicly available code. No personal identifiers or their hashes are published.

## AI evidence graph v1

Namespace `ai-passport-graph-v1`. Signed node, edge and manifest entities share an indexed `graph_hash: bytes32`. Node attributes: `node_id: str`, `node_type: str`. Edge attributes: `from_id: str`, `to_id: str`, `relation: str`. `kind: str` and `schema_version: u64` are bound to the payload. The EIP-191 message is `AI Passport graph record v1` plus newline and canonical JSON. Readonly creation and accepted original creator are required.

The signed manifest lists every node/edge ID and canonical digest; the pinned root identifies the complete graph. Reconstruction requires one current accepted manifest and an exact set of current accepted members. Missing, duplicate, changed or unlisted accepted members fail verification. Expired or unauthenticated historical records cannot satisfy required membership. Runtime schema checks reject dangling edges and unsafe source paths. `/contracts/app-passport-graph.schema.json` and `/contracts/app-passport-graph-envelope.schema.json` are exported schemas; semantic/cryptographic validation additionally runs in the SDK.

Current demo: 27 nodes, 43 edges, 71 current graph entities, including four real project-run AI receipts. Previous graph revisions remain in `arkiv/ai-evidence.json`. Storage lasts 30 days; signed validity lasts 14 days. Revisions use a new root rather than silently changing existing members. Traversal is an SDK feature, not native Cypher. See ARCHITECTURE.md for the full data/execution contract.

## Generic Arkiv Graph v1

The primary infrastructure SDK uses namespace `arkiv-graph-v1`, schema `arkiv.graph.v1`, and signing message `Arkiv Graph record v1` plus newline and canonical JSON. It uses the same indexed graph hash, node identity/type and edge endpoint/relation attributes. Developer-defined node types and relation names are supported. The complete manifest and root are verified before traversal. Current infrastructure revision: 7 nodes, 8 edges and 16 signed entities; exact keys, transactions and previous revisions are in `arkiv/graph-infrastructure.json`. Exported schemas are `/contracts/arkiv-graph.schema.json` and `/contracts/arkiv-graph-envelope.schema.json`.

## Bounded AI context adapter

`@ajnasnb/arkiv-graph` 0.4.0 exports `@ajnasnb/arkiv-graph/context`. Its derived packet schema is `arkiv.graph-context.v1`: a pinned graph digest, starting node, read block, selected nodes and edges, and source references with explicit byte-verification flags. A caller-controlled loader may supply original source bytes; the SDK checks the complete file digest before selecting an excerpt. No source is downloaded implicitly by the CLI or MCP server. The web gateway restricts its loader to fixed public demo source paths.

Context is marked `contentRole: untrusted-data`, `truth: not-attested`, and `execution_authority: false`. It grants no tool permission. The adapter rejects truncated paths, source changes, oversized source bytes and character-budget overflow. The packet is a derived client result, not a separate automatically published Arkiv entity. AI Passport separately checks current accepted reviews before inference; only four selected actual run receipts are published in the reference graph.

## Two-client session report v1

`/data/two-client-session.json` has schema `app-passport.two-client-session.v1`, validated by the shared `apps/web/src/two-client-model.ts` runtime contract. It is an operator observation report containing signed evidence, not a separately signed execution attestation or automatic Arkiv entity. Public session `77000888-ffdc-4ecf-beb8-df529adfb952` completed with three transactions and four task-request observations.

| Field | Contract |
|---|---|
| `session_id`, `started_at`, `updated_at`, `completed_at`, `status` | Unique session and reported phase: `accepted`, `completed` or `failed` |
| `descriptor`, `policy`, `roles` | Exact context descriptor, accepted session producer/reviewer, public addresses and project-control disclosure |
| `graph` | Pinned reference root, accepted graph issuers, fixed `context:handoff` start and public packet path |
| `transactions` | Passport, review and withdrawal keys/hashes, creators, signed envelopes, reported publication times and chain creation/expiry blocks |
| `observations` | Separate consumer A/B request sequences, phase, request/read/decision times, signed read snapshots, locally verified graph/source identities, admission, evidence/task flags and deterministic output |
| `records` | Observed signed admission records used to reconcile transaction metadata |
| `consistency_reads` | Bounded observer attempts used to check chain-query visibility, distinct from task requests |
| `limitations`, optional `failure_stage` | Report scope and incomplete-operation evidence |

The descriptor version equals the session UUID and its capabilities bind the pinned graph root. Its artifact digest still identifies the existing public Qarinah coding packet; earlier reviews of those bytes have a different descriptor digest and cannot admit this session. Both consumers assemble signed graph records with the generic SDK, verify a complete bounded path, validate packet manifests and compare the exact source bytes against both the graph and selected repository snapshot. The source mapping is fixed to `src/release.ts` and `/sources/release.ts`; signed data cannot select arbitrary fetch URLs.

Each request independently reads again. A response `session_id` must match the loaded session, and fresh-read timestamp checks prevent accidental use of a stale or mixed-deployment response. An accepted receipt records `evidence_admitted: true`, `task_executed: true`, a finite effective admission deadline and six deterministic guard results. It does not claim the task consumed Qarinah data as instructions. Rejection retains the observed reason with no admitted evidence or guard output. `inference_run` is always `false` in this flow.

The expected completed sequence is A accepted, B accepted, exact-target withdrawal visible, B's next request withdrawn, A's next request withdrawn. Historical snapshots are re-evaluated at their reported decision times. Failed reports retain unavailable observations without allowing them to claim positive execution. Current provider state, query completeness and actual client execution are not established cryptographically by the report.

The only public session endpoint is read-only. It creates fresh graph and admission reads through the configured provider and returns public packet/source bytes. Wallet signing and the three publications happen only in the operator CLI. No public unauthenticated writer or private-context upload is provided.

## Runtime source binding before hosted inference

The AI Worker verifies the current runtime descriptor against the signed `tool:runtime` graph node, its pinned original source bytes, and the digest of the source included in the deployment. A different accepted runtime publisher cannot silently substitute an artifact by matching a self-declared label. Original bytes must agree across descriptor, graph and deployment before inference. This boundary is separate from the deterministic two-client task and from hosted model-weight attestation, which is not implemented.

## Authenticated root registry

`arkiv-graph-roots-v1` uses typed `namespace:str`, `schema_version:u64`, `scope_hash:bytes32` and `sequence:u64`, with protocol `$creator` fixed to the bootstrap authority. Readonly payloads contain a signed revision sequence, previous signed-revision digest, previous root, new root, scope digest, issuer and finite validity. Scope binds chain, registry, profile, accepted-policy digest, genesis, authority and maximum lifetime. Registry and selected graph use one explicit `atBlock`; mismatched pages fail.

Two actual revisions and six graph entities were published in one transaction. See [root-updates.json](root-updates.json), [trust setup](../docs/TRUST_SETUP.md) and the [live reader](https://arkivgraph.ajnasnb.com/?view=trust). Signed validity is 14 days; entities have 30-day storage. The verifier needs the complete chain, bounded to 64 links. A consumer must retain its checkpoint and renew finite records; a signature alone cannot discover a withheld newer head. Bootstrap authority/policy rotation remains explicit.
