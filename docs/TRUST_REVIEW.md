# RPC and root-update trust review

This is a bounded engineering review of Arkiv Graph, not a third-party security audit. The public [capability report](https://arkivgraph.ajnasnb.com/data/rpc-capabilities.json) records actual requests and timestamps. Reproduce it from the repository with:

```sh
node scripts/probe-rpc-capabilities.mjs
```

The probe needs Node.js 24 and internet access. It reads the documented anonymous Tiramisu RPC without a wallet, access key or project API. It deliberately accepts no credential or custom endpoint arguments.

## What can be established locally

A valid application signature establishes authorship relative to the consumer's accepted key. A complete signed graph manifest establishes the required members of one pinned revision, and the reconstructed digest binds their exact content. Loaded source bytes are checked against their signed digests. These checks do not establish source truth, publisher independence or model computation.

A root-update signature needs a separate consumer-pinned authority. Obtaining that authority from the same untrusted discovery response would make the signature circular. Signed updates must bind the network, graph profile and logical channel, and chain a revision number and previous signed-head identity. The graph's content digest alone is insufficient to distinguish same-root renewals or policy changes.

## RPC failure modes that signatures alone cannot prevent

1. A provider returns an authentic older approval and omits a later authentic withdrawal. A fresh client has nothing local with which to detect the omission.
2. A provider serves an authentic older root head. A returning client can detect rollback only while it retains its prior authenticated checkpoint.
3. A provider changes the advertised snapshot between pages, returns stale head timing, or mixes records from different blocks. Local snapshot and freshness checks can reject these inconsistent responses; a fully dishonest provider can still fabricate consistent metadata.
4. An issuer signs two conflicting successors. A reader which sees both can reject the fork. A provider hiding one branch does not become detectable merely because the visible branch is signed.
5. Storage expiry or deletion removes a withdrawal or revision link. Finite storage is not a permanent revocation log. Local retained evidence protects only observations already made and does not provide missing history to a new reader.

## Public endpoint and proof research

The [official network reference](https://docs.arkiv.network/networks/tiramisu/) lists one public Tiramisu HTTP endpoint and its WebSocket equivalent. An [access-key URL or header](https://docs.arkiv.network/start-here/access-keys/) raises quota on that endpoint; it is not an independently operated provider. This demo has not verified an independently operated second provider, so it makes no provider-quorum claim.

The [JSON-RPC documentation](https://docs.arkiv.network/json-rpc/querying-data/) supports `atBlock` and reports the block used for a query. [SDK pagination](https://docs.arkiv.network/typescript-sdk/querying-data/) uses a block-bound cursor; historical reads are limited by retained state. Checking each returned block locally still matters when the transport itself is untrusted.

The official [`arkiv-op-reth` development design](https://github.com/Arkiv-Network/arkiv-op-reth/blob/develop/docs/3_query.md#4-verification-recipes) describes lower-level query verification using state proofs, entity code, index bitmaps and local query evaluation. That design is not evidence that our client verifies those proofs or that the current hosted endpoint exposes all required methods. The dated probe found `eth_getProof` unavailable with JSON-RPC error `-32601`. It successfully read the expected chain and an explicit snapshot query. Do not generalize one endpoint observation into a claim that Arkiv cannot support proofs.

## Required adversarial checks

- Reject wrong update signer, signature domain, chain, channel or profile; expired and future heads; missing links; revision rollback; and conflicting heads at the same revision.
- Keep expired intermediate heads usable as authenticated historical links while requiring the selected current head to be live. Verify the full signed-head digest when comparing persisted checkpoints.
- Reject snapshot mismatches, stale or future block timing, observed chain-height rollback and queries that exceed bounded pagination.
- Preserve authenticated withdrawals observed by a client, scoped to their accepted issuer, exact target and artifact/descriptor identity. A failed or incomplete new read must not erase retained evidence or create a positive decision.
- Keep bootstrap and local storage assumptions explicit. Clearing browser data or choosing a new trust policy creates a fresh client; signatures do not make browser storage tamper-proof.

## Implementation reviewed

| Component | Concrete control | Boundary |
| --- | --- | --- |
| `packages/arkiv-graph/src/root-update.ts` | Full signed-head chain from pinned genesis; fixed authority, scope, policy and chain; live current head; 64-revision bound; authenticated prefix comparison with retained checkpoint | It cannot discover a head hidden from a new client. Authority rotation requires an explicit new consumer bootstrap policy. |
| `packages/arkiv-graph/src/root-registry.ts` | Indexed accepted-creator discovery; readonly/index bindings; at most 64 heads in one snapshot; selected root's complete graph verified at that same block; stale and future head-time checks | The hosted adapter supports Tiramisu and the generic profile. Returned protocol metadata still comes from one RPC. |
| `packages/arkiv-graph/src/rpc-trust.ts` | Fresh same-block observations, pinned local provider/operator policy, minimum configured operators, disagreement and previously observed height/data rollback rejection | This verifies supplied observations; the caller must fetch them from the actual configured transports. Operator labels do not prove operator independence. The demo has one verified operator. |
| `packages/arkiv-graph/src/rpc-trust.ts` withdrawal journal | Retains and revalidates old and new withdrawal evidence through a required caller verifier; scope and 200-item bound; invalid evidence fails closed | The caller must enforce signature, accepted issuer, exact target, artifact/descriptor and lifetime coverage, then merge retained evidence into admission. It cannot recover unseen or cleared history. |
| `packages/sdk/src/arkiv.ts` and graph reader | Default head or explicit requested `atBlock` is pinned before querying; every page must report that block; expiry filters and review decoding use that block | Explicit historical reads are a snapshot primitive, not current authorization. A caller choosing history must not present it as a fresh admission check. |
| `apps/web/src/TrustPanel.tsx` and `TwoClient.tsx` | Browser Web Locks serialize the complete read/checkpoint-update transaction across same-origin tabs; blocked storage or unavailable locking refuses acceptance | Browser-local history is still subject to the user's storage policy and local compromise. A lock is coordination, not a remote proof. |

`tests/trust.test.ts`, `tests/root-registry.test.ts`, `tests/arkiv-transport.test.ts` and the two-client unit suite exercise these controls with signed synthetic data and the installed SDK's HTTP/decoder code. Simulated transport tests establish rejection behavior; actual chain publication and hosted browser evidence are separate reports. `tests/e2e/trust.spec.ts` separates its actual live-root/reload check from controlled storage, missing-lock and two-tab rollback simulations. Earlier public package releases should not be described as containing a new API until the matching release has been published and consumed.

## Remaining boundary

Authenticated update chains and retained withdrawal state improve operation for clients with a trusted bootstrap and preserved history. They do not prove omission-free current or historical discovery to a fresh reader. The hosted demo uses one configured RPC and a read-only relay. Production claims about independently verified chain state, external provider diversity, permanent availability and large-scale operation require additional implementation and evidence.


## Signed root expiry during asynchronous graph loading (16 October)

Expected: a root head must still be valid when the complete graph is accepted, even if its signature was valid before network reads began. Actual: Graph 0.4.0 checked the head before asynchronous graph assembly, leaving an expiry-crossing window. This was an application SDK integration defect, not an Arkiv RPC defect. Graph 0.4.1 checks the selected head again after graph verification and synchronous digest preparation. The browser checks again immediately before retaining its checkpoint. AI Passport 0.6.1 pins the corrected graph dependency; the web workspace dependency and lockfile match.

Reproduce: `npx vitest run tests/root-registry.test.ts --no-cache`. Genuine synthetic signed heads and mocked transport finish one millisecond before, exactly at and one millisecond after the deadline. Only the first is accepted; graph members remain valid longer, isolating the signed-head check. The full local suite passed 274/274. ISO deadlines and `Date.now()` use milliseconds; RPC epoch seconds are converted separately. Suggestion: include a final-deadline recheck after asynchronous verification in the trust/renewal cookbook. This is a controlled regression, not a new chain event or an independent audit.
