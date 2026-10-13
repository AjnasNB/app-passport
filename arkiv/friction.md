# Reproducible integration observations

Environment: Windows, Node 24.15.0, @arkiv-network/sdk 0.8.1, Tiramisu chain 7738577. AppPassport integration built during the challenge.

## Read and publisher separation

Expected: a consumer can query records with no signing account; a publisher supplies its own funded wallet. Observed: producer and reviewer records were created with distinct project-controlled wallets and read back through direct RPC. Reproduce with `npm run arkiv:verify`; exact queries, blocks and keys are in the generated evidence files. This is operational separation, not proof of independent organizational adoption.

## Readonly, creator and payload checks

Expected: `$creator` identifies the original transaction author, including when ownership differs. Observed: the SDK exposes creator and owner separately. A readonly requirement, application signature, and attribute/payload equality are needed together for this consumer policy. Mutable entities and mismatches are rejected in the named SDK tests. Suggested documentation improvement: a compact example distinguishing wallet ownership, original authorship and readonly payload semantics for trust registries.

## Expiration is not positive clearance

Expected: expired storage disappears from live queries. Observed: a disappearance alone cannot distinguish an unknown record, deleted record or expired review. This demo separates signed review validity from storage lifetime, retaining the expired synthetic review long enough to inspect its reason. Reproduce with the public expired-context case and its entity creation transaction. Storage renewal must never renew an old signed assessment.

## Corrections need explicit lifecycle semantics

Expected: withdrawal applies only to the original author's exact target; later independently issued evidence can be evaluated normally. Observed: a policy that treats any historical withdrawal as an artifact-wide ban incorrectly prevents renewal. The SDK targets specific keys, filters withdrawn records and evaluates remaining current evidence. Tests cover same-author withdrawal, wrong author, wrong target, old ordering and fresh replacement. Two initially incomplete browser-tool reviews demonstrate this correction flow on chain.

## Quota and transport failure

Expected: public RPC works at its default quota; a Hub key increases quota. Observed: the application can keep the key in a server secret while independent readers use their own provider. Transport retries are disabled and timeouts are bounded so a quota/network problem produces unavailable rather than an old positive decision. The gateway exposes only semantic read requests, not arbitrary RPC forwarding or writes.

## Adjacent MCP compatibility issue

Our initial manual stdio client completed MCP initialization and tool listing but timed out on Playwright and Chrome controlled calls. Replacing it with the official @modelcontextprotocol/sdk 1.32.1 client, proper roots handling and an isolated Chrome profile completed those calls. This was our MCP integration issue, not an Arkiv defect. Actual before/after review transactions and the final protocol report are retained.

## Current verification limitation

The reader verifies application-level signatures but trusts the provider's protocol metadata and query completeness. A portable SDK example for state-proof verification and completeness limitations would help security applications explain this boundary accurately.

## Graph representation and complete membership

Expected: tools can connect a context packet, source files and reviewed execution evidence. Observed: typed attributes support application-level node/edge indexing. We use `graph_hash`, `node_id`, `from_id`, `to_id` and `relation`, then implement bounded traversal in the SDK. This is not a native recursive graph query. A signed manifest lets a reader detect a missing or changed member relative to a pinned graph root. It does not independently prove chain metadata or global query completeness. Reproduce using `scripts/test-graph-mcp.ts` and the public graph manifest/source contracts.

## Large publication batch and transport failure

An initial 51-create `executeBatch` failed with an HTTP transport error during RPC execution. We cannot infer a protocol batch limit from that error. Publishing resumable batches of five succeeded; the next revision's 71 graph entities were read back and verified. Exact entity keys and transaction links are retained in `arkiv/ai-evidence.json`, including the previous graph revision. A documented recommended batch size and example for reconciling an uncertain transaction outcome would improve publisher recovery.

## Model output boundary is separate from Arkiv

Workers AI returned a structured guard object where our first integration expected a response string. Accepting the strict guard schema fixed the coding flow. A Hindi answer also contained an incorrect numeric conversion. The calculator now supplies all displayed numeric statements; unchecked numerical AI commentary is withheld. These are inference/application issues, not Arkiv defects. The corrected eight-case live report and explicit mock-inference unit scope are public.
