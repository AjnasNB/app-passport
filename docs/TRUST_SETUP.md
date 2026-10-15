# Root updates and retained withdrawal evidence

The optional `@ajnasnb/arkiv-graph/trust` entry point in public npm version **0.4.0** adds authenticated root revisions, local monotonic checkpoints, configured-provider observation checks, and a withdrawal-evidence journal. A fresh isolated npm consumer verified its live registry/graph reads and checkpoint defenses, with eight functional checks passing; see `apps/web/public/data/npm-trust-consumer.json`. Exact registry tarball bytes are verified separately in `npm-release.json`.

## Pin the trust configuration

Review and pin the `root-trust-config.json` values through a channel you already trust. In the demonstration, the reviewed public repository supplies the initial configuration and authority address. Downloading a configuration and its signatures from the same untrusted server does not independently establish an authority.

The configuration hash binds chain ID, graph profile, logical registry, accepted application policy digest, initial graph root, authority and maximum revision lifetime. A root revision can select a different graph root or renew it. It cannot silently change any of those trust settings. Changing authority or policy requires an explicit new configuration approved by the consumer.

```ts
import {readRootRegistry, verifyRootRevisions} from '@ajnasnb/arkiv-graph/trust';
import {digestJson} from '@ajnasnb/arkiv-graph';

// Load config from your reviewed application settings, not from an arbitrary RPC response.
const live = await readRootRegistry(config);
const selected = await verifyRootRevisions({
  config,
  revisions: live.revisions,
  checkpoint: savedRootCheckpoint ?? undefined,
});
if (selected.root !== digestJson(live.graph.graph)) throw new Error('Graph root mismatch');

// Persist atomically only after signatures AND complete graph membership pass.
await saveRootCheckpoint(selected.checkpoint);
```

`readRootRegistry` currently supports the Tiramisu generic graph profile. It queries the registry and selected graph at one explicit block, checks every returned page block, checks the reported chain time against the local clock, verifies all root links and reconstructs the exact manifest-listed graph. Past-block queries depend on the provider retaining that block.

For a returning consumer, a shorter chain or a different previously accepted head is rejected. An idempotent reread of the same signed head is allowed. Expired historical revision links remain valid links when a successor was issued during the previous lifetime; the current head must be unexpired. The demonstration reader is bounded to 64 revisions. It is not a production rollover/compaction system, and root-entity retention must outlive the complete history a consumer needs to verify.

## Cross-check providers honestly

`verifyRpcObservations` compares observations fetched by your own trusted transport code. It does not make network requests or discover independent operators. Generate the value digest from canonical, stable data; sort record identities first so response ordering does not change the digest. Request the same explicit snapshot from every configured provider.

Configure each endpoint with a provider ID and its actual operator. Two API keys, aliases or hosts operated by one organisation count as one operator. A policy requiring two operators refuses missing responses or any disagreement in the provided snapshot, reported chain time or value digest. Its local checkpoint rejects lower block heights and different data at an already observed block. Operator identity is a local configuration assumption, not something proven by an RPC label.

The deployed demonstration has **one official public Tiramisu provider**. Its mode is `single-provider-observed`. The multi-operator disagreement tests use explicitly labeled simulated observations. They are not evidence of a second live operator.

## Retain observed withdrawals before running a task

The reference two-client consumer accepts an optional `TwoClientTrustStore`. The live website stores a separate checkpoint for each browser client and exact session/descriptor/policy/graph scope. Both old and newly observed withdrawal pairs are revalidated for signatures, accepted publisher/reviewer roles, artifact identity, descriptor identity, exact target, signed validity coverage and observed retention coverage.

The retained pair includes the original signed target and withdrawal. A later response cannot erase the pair or shorten its saved retention observation. The pair is merged into current admission inputs before the task can run. A new, separately keyed current review can authorize a new decision while the old withdrawal remains retained. A substituted signed payload at a cached immutable entity key fails verification.

Authenticated withdrawals first seen without their target are retained as pending evidence. When the target later returns, the consumer validates that pair before allowing admission; an omitted withdrawal cannot disappear between those two reads. A separate new review key remains eligible for a fresh decision.

The store must fail on malformed or unavailable state, write the new checkpoint atomically and confirm persistence. Shared stores require the caller to serialize the entire load/read/verify/save/task transaction, not only the final write. The live website uses an exclusive Web Lock for each client/session across tabs and refuses if Web Locks or local storage are unavailable. Reinitializing a consumer with the same serialized checkpoint preserves its prior observation. Historical operator-report verification does not use browser state and remains a pure verification path.

## What this does not prove

- A fresh client cannot detect a newer revision or withdrawal omitted by every source before it observes it.
- Signed payloads authenticate an accepted signer and selected bytes. They do not prove source truth, safe behaviour, RPC metadata or query completeness.
- Local storage is client-controlled. Deleting it loses rollback history; local compromise is not prevented by this mechanism.
- A colluding configured provider quorum can still omit data. Reported chain times and heights remain provider assumptions checked against the local clock and prior observations.
- The tested official public endpoint does not expose `eth_getProof`; see the current capability report. No cryptographic query-completeness verifier is implemented by this project.

## Reproduce

```sh
npm ci
npm run build:sdk
npx vitest run tests/trust.test.ts tests/two-client.test.ts tests/root-registry.test.ts tests/arkiv-transport.test.ts
npx tsx scripts/verify-trust-safeguards.ts
node scripts/verify-npm-trust-consumer.mjs
```

The source safeguard command performs real same-block registry/graph reads and then separately labeled replay/fault-injection checks. It publishes `apps/web/public/data/trust-safeguards.json` only when every check passes. The npm command creates a separate consumer outside the workspace, installs public graph **0.4.0**, passport **0.6.0** and Qarinah **0.7.0** without npm authentication, typechecks and imports all eight package entry points, and exercises `/trust` against the real published root registry. It publishes `npm-trust-consumer.json` only after all eight functional checks pass. Neither command publishes a wallet key or broadcasts a transaction. The actual root publication is separately recorded in `arkiv/root-updates.json`.
