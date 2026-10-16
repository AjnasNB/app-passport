# Launch evidence and judging questions

The launch film is 162 seconds. The companion pitch has eight pages in a black, blue and amber editorial design, with generated conceptual artwork, editable architecture/schema labels and an editable measurement chart. It covers the introduction, problem, solution, innovation, service, working use cases, Why Arkiv, current defensibility, evidence and setup. Recorded UI and linked reports establish what the project actually did.

## Who needs this, and what is the useful product?

An AI-tool developer needs to check that a shared context packet still has an acceptable review before allowing the next task. Arkiv Graph supplies reusable signed node/edge/manifest records, bounded traversal, root-revision verification and reader tooling. AI Passport is the reference application: Qarinah context, source-byte checks, useful hosted AI tasks and review admission.

Open Source is the strongest fit: the generic SDK, CLI and MCP reader can be used without the application backend. Security is an additional fit for explicit admission policies, observed rollback rejection and retained withdrawals. The India examples demonstrate exact rupee helpers, English/Hindi tasks and UPI learning; they do not establish outside adoption or real payment processing.

## Why Arkiv instead of only a database?

Arkiv supplies indexed, attributable public records discoverable by compatible readers through their configured providers. A single-operator database can implement the same local graph and verification logic. Replacing Arkiv in this design means supplying another shared publication/discovery layer; hashing a local database alone does not distribute discovery.

Graph traversal, admission policy and revision checks are SDK logic. This is not a new native Arkiv graph query engine. Private Qarinah memory, inference and original source storage remain off-chain. Public context examples are synthetic.

## What did the demo actually prove?

| Evidence | Exact scope | Reproduce / inspect |
| --- | --- | --- |
| Root publication | Eight entities, two signed revisions, one atomic transaction; separate small synthetic graph | [Publication](https://arkivgraph.ajnasnb.com/data/root-update-publication.json), [setup](TRUST_SETUP.md) |
| Current root reader | Verifies both revision signatures, reconstructs the selected current graph and retains its checkpoint | [Live reader](https://arkivgraph.ajnasnb.com/?view=trust), [safeguards](https://arkivgraph.ajnasnb.com/data/trust-safeguards.json) |
| Two clients | Project-operated A and B admitted separate requests, then refused after an actual exact-target withdrawal | [Three-transaction session](https://arkivgraph.ajnasnb.com/data/two-client-session.json) |
| Withdrawal safeguards | Authenticated pending-target retention, persistence before admission and same-origin full-request tab locking | [Trust review](TRUST_REVIEW.md), [installed-package checks](https://arkivgraph.ajnasnb.com/data/npm-trust-consumer.json) |
| AI reference | Actual hosted inference and checked source/context evidence; model output is not independently attested | [AI results](https://arkivgraph.ajnasnb.com/data/ai-evaluation.json) |
| Mobile | Eighteen simulated Lighthouse navigation audits; median of three cold runs per route and phase | [Measurements and method](MOBILE_PERFORMANCE.md) |
| Media | Actual UI captures distinguished from historical lifecycle and process illustrations; exact film bytes and review scope | [Capture provenance](https://arkivgraph.ajnasnb.com/data/launch-capture-evidence.json), [film evaluation](https://arkivgraph.ajnasnb.com/data/launch-evaluation.json) |

The current two-client button performs fresh reads of the already withdrawn session. It does not publish another withdrawal. The root-update recording is separate from the AI reference's pinned graph. Rollback/tampering demonstrations and missing-target scenarios are controlled replays, not new chain events.

## Can another builder repeat this, and what was difficult?

Start with the [README](../README.md), [SDK guide](../ARKIV_GRAPH.md), [schema](../arkiv/schema.md), [creator wallets and transactions](../arkiv/evidence.json) and [friction log](../arkiv/friction.md). The checked-in scripts distinguish read-only verification from explicitly requested testnet publication. No custom contract deployment is required; publication needs free testnet tokens and dedicated wallets. Public readers do not need a wallet.

The friction log records concrete RPC/indexing, revision, manifest, package and browser-integration issues with reproduction steps. Package publication and project-run clean installs establish availability and reproducibility, not outside users or npm adoption.

The [getting-started guide](GETTING_STARTED.md) now begins with a complete, wallet-free graph example. Its [anonymous clean-install proof](https://arkivgraph.ajnasnb.com/data/quickstart-proof.json) runs the exact documented two-node/one-edge example outside the workspace with `fetch` disabled. A [separate retained read-only receipt](https://arkivgraph.ajnasnb.com/data/quickstart-rpc-proof.json) records the documented seven-node/eight-edge/16-entity RPC checks; its timestamp/transcript limitations are explicit.

The [npm usage snapshot](https://arkivgraph.ajnasnb.com/data/npm-usage.json) records official registry and download API responses, fetched on 16 October 2026. Registry publication is verified. Both packages' seven- and thirty-day download windows returned HTTP 404, so counts are unavailable, not zero. npm downloads would include project and CI installs; they do not measure distinct users or SDK runtime reads. No global runtime-read analytics has been implemented.

## What is defensible today?

The contribution is a reusable graph contract and matching SDK, CLI and MCP readers, with complete membership, trust-state safeguards and an actual AI-context integration. Current differentiation is integration quality and reproducible conformance evidence. Independent publishers, adopted schemas and maintained integrations could form a future ecosystem advantage. That is a hypothesis, not a proven network effect, proprietary dataset, adoption figure or revenue claim.

The website exposes the SDK, full quickstart, schema and install/test commands directly. The film is framed as a technical infrastructure demonstration featuring AI Passport. Its reviewed MP4 bytes remain unchanged; the new pitch is a separate artifact, not material animated into the film. Historical mobile lab scores describe the measured release; new page changes receive separate interaction/layout checks.

## What remains unresolved?

1. One live RPC operator supplies metadata and unseen-history completeness. No cryptographic non-omission/state-proof verifier is implemented. A fresh reader may miss a withheld record.
2. Retained history helps only after observation. Clearing browser storage or compromising the client removes that protection. Web Locks coordinate same-origin tabs, not all network consumers.
3. The root-update demonstration is small, separate and bounded to 64 revisions; no automatic authority/policy rotation or production migration is claimed.
4. Mobile figures are desktop-simulated lab results, not physical-device or field INP measurements. No unaided outside SDK integration or broad production-scale validation has been established.

Media QA scans the full encoded file and samples scenes, typography and cuts visually. It does not mean a human inspected every individual frame or listened to every word. Neither this review nor a Lighthouse score is an official hackathon score.
