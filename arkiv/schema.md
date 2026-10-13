# AppPassport data contract

Network: Tiramisu, chain ID 7738577. Tested Arkiv SDK: 0.8.1. Namespace: `app-passport-v1`.

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

Signed validity controls admission. The example tool passports last 21 days and reviews 14 days; storage lasts 30 days and must cover signed validity plus a margin. The expired fixture uses a two-second signed review window with longer storage so its expired status remains inspectable. A storage extension does not renew signed validity. Payloads are readonly and permissionless extension is disabled. Deletion or storage expiry can remove a record from current reads; it never implies safety.

## Actual queries

The reader gets the current block from `arkiv_getBlockTiming`. It queries:

```text
namespace = str('app-passport-v1') AND schema_version = u64(1)
AND $expiresAt > u64(current_block)
AND ($creator = addr(accepted_producer) OR $creator = addr(accepted_reviewer))
```

For an artifact lookup it adds `artifact_hash = bytes32(0x...)`. The SDK consumes cursor pages up to a ten-page defensive ceiling; an incomplete query fails. The exact evaluated query, block and entity keys are in `evidence.json` and the public `data/live-verification.json`.

The application uses protocol creator metadata, verifies the recovered application-signature address agrees with it, checks typed attributes match the payload, and requires readonly records. An accepted signature verifies an author's statement, not its factual truth. The node adapter computes current selected source-file hashes from the requested repository and rejects root escapes and changed snapshots.

## Roles and public evidence

Producer: `0x4FEade3FF513A7954e9f7420aaa7BDEdc0BA4BDC`.

Reviewer: `0xd153C0cC313884DA0065615BB411Dfb8b873fE54`.

Both are project-controlled demonstration roles. The public policy is `/data/policy.json`. No third-party endorsement or independent adoption is claimed. The browser's read-only gateway protects a Hub quota key. The CLI and SDK support direct RPC and an independently supplied provider.

WebSocket events trigger bounded reloads; a 60-second fallback refresh handles expiry and unavailable sockets. Reads are independently reproducible, but the current client does not verify cryptographic chain state proofs or query completeness.

Private context stays local. The only published context identities describe generated synthetic data. Software artifact digests describe publicly available code. No personal identifiers or their hashes are published.

## AI evidence graph v1

Namespace `ai-passport-graph-v1`. Signed node, edge and manifest entities share an indexed `graph_hash: bytes32`. Node attributes: `node_id: str`, `node_type: str`. Edge attributes: `from_id: str`, `to_id: str`, `relation: str`. `kind: str` and `schema_version: u64` are bound to the payload. The EIP-191 message is `AI Passport graph record v1` plus newline and canonical JSON. Readonly creation and accepted original creator are required.

The signed manifest lists every node/edge ID and canonical digest; the pinned root identifies the complete graph. Reconstruction rejects missing, duplicate, changed, extra, expired or unaccepted members. Runtime schema checks reject dangling edges and unsafe source paths. `/contracts/app-passport-graph.schema.json` and `/contracts/app-passport-graph-envelope.schema.json` are exported schemas; semantic/cryptographic validation additionally runs in the SDK.

Current demo: 27 nodes, 43 edges, 71 current graph entities, including four real project-run AI receipts. Previous graph revisions remain in `arkiv/ai-evidence.json`. Storage lasts 30 days; signed validity lasts 14 days. Revisions use a new root rather than silently changing existing members. Traversal is an SDK feature, not native Cypher. See ARCHITECTURE.md for the full data/execution contract.
