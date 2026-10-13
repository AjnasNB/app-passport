# AppPassport: Qarinah + Arkiv

I built AppPassport to let applications check the exact AI tool or context packet they consume against attributable, current review evidence. This is a separate demonstration and SDK. The original Qarinah and ScamSignal applications are preserved.

- Live application: https://passport.ajnasnb.com
- SDK: https://passport.ajnasnb.com/downloads/app-passport-sdk-0.1.0.tgz
- Contracts: https://passport.ajnasnb.com/contracts/app-passport-envelope.schema.json
- Ten-tool evaluation: https://passport.ajnasnb.com/data/protocol-evaluation.json
- Live independent-reader evidence: https://passport.ajnasnb.com/data/live-verification.json
- Motion graphics and live website film: https://passport.ajnasnb.com/media/app-passport-demo.mp4
- Evaluation report: https://passport.ajnasnb.com/downloads/app-passport-evaluation.pdf
- Companion presentation: https://passport.ajnasnb.com/downloads/app-passport-deck.pptx

## What the demonstration proves

The Qarinah fixture is generated with `buildProofContext()` and accepted by its original `validateProofContext()`. The passport binds the complete packet, its nested manifest and its selected source snapshot. A separate reviewer publishes a signed, time-bounded review on Arkiv. A browser reader and an independent CLI use the same versioned contract and their configured trust policy.

The consumer rejects changed artifacts, changed source snapshots, unaccepted writers, expired reviews and authorized withdrawals. A new review can replace a specifically withdrawn earlier review. This is artifact identity and review lifecycle evidence. It is not proof that a retained statement is true, a malware audit, a universal safety certificate or a guarantee that an agent will behave correctly.

## Run locally

Node.js 24 is the tested runtime. From this directory:

```sh
npm ci --ignore-scripts
npm run build
npm run fixtures
npm test
npm run typecheck
npm run dev
```

In a second terminal, `npx wrangler dev --local --port 8791` serves the read-only API. Put your own Arkiv access key in ignored `.dev.vars` as `ARKIV_API_KEY`. The public application has its key in a server secret. Visitors need no wallet, login or tokens, and uploaded files are hashed locally.

## Independent reader, without the website backend

The public Tiramisu RPC works without a wallet or access key at its default rate limit. A private key is never needed to read. If additional quota is needed, supply your own provider or a private key-file containing a Hub access key; this is an RPC quota credential, not a signing key.

```sh
npm run arkiv:verify
node packages/sdk/dist/cli.js \
  --descriptor apps/web/public/data/handoff-descriptor.json \
  --artifact apps/web/public/data/handoff-packet.json \
  --policy apps/web/public/data/policy.json \
  --repository-digest <repository_digest_from_descriptor>
```

The CLI defaults to Arkiv's raw RPC, not this project's API. It returns exit code 0 for policy satisfaction, 2 for non-admission, and 1 when verification could not finish. The SDK's node-only Qarinah adapter checks source files against a caller-selected repository using root-bound, real-path reads:

```ts
import { verifyQarinahHandoff } from '@app-passport/sdk/qarinah';
const result = await verifyQarinahHandoff({ packet, descriptor, repository, connection });
// A successful result supplies context with contentRole: 'untrusted-data'.
// The caller still owns model execution, authorization and side-effect policy.
```

`npm run fixtures` generates a synthetic repository in `.local/context-fixture`. After generating matching passports, `npm run handoff:consume` runs the source-checking example consumer. It produces a context input envelope locally. No second LLM inference run or independent customer adoption is claimed.

## Evidence and reproduction

Ten real source/artifact references are evaluated: Qarinah, MCP Filesystem, Memory, Sequential Thinking, Everything, Git, Fetch, Time, Playwright MCP and Chrome DevTools MCP. The steering-group servers are reference implementations, not production-certified products. Nine downloaded registry artifacts had their registry integrity checked; Qarinah is a disclosed source snapshot.

`npm run tools:inspect` pins and verifies the public artifacts. `scripts/install-evaluation.ts` installs those pinned artifacts in `.local` with Node installation scripts disabled. `scripts/protocol-evaluate.ts` initializes each MCP server, lists its tools and runs one controlled call against a synthetic environment or a public test URL. The dependency lock is retained in `evaluation/mcp-package-lock.json`. The environment is not an operating-system sandbox. These tests do not establish dependency-vulnerability coverage or capability enforcement.

`npm test` runs signed-record, policy, lifecycle, Qarinah and hostile-input tests. Their named outcomes are published in `data/security-evaluation.json`. Original failed browser-client checks are not hidden: the corresponding negative chain reviews are withdrawn by the same reviewer before fresh reviews are issued. The full transaction evidence remains available.

`node scripts/clean-consumer.mjs` installs the downloadable SDK in an isolated consumer with published Qarinah 0.7.0, validates an actual packet and selected file, and verifies through the direct RPC and CLI. `npm run test:e2e` exercises the browser flows against local Wrangler; set `PASSPORT_BASE_URL` to test a deployment and `PASSPORT_CHROME_PATH` to select your Chrome executable. The public browser and consumer receipts describe the exact test scope. The downloadable evaluation PDF is generated by `scripts/report.py` using ReportLab.

## Publishing

Arkiv stores entities, not Solidity contracts. Writes require testnet GLM; the Tiramisu faucet supplies free test tokens. Real funds are not used for this demonstration. The browser has no publication endpoint.

Operator credentials stay outside the checkout. `PASSPORT_WALLET_FILE` points to a private JSON file with `producer_private_key` and `reviewer_private_key`. `PASSPORT_ARKIV_KEY_FILE` points to a private Hub quota key. `npm run arkiv:publish` signs records, publishes them with the matching transaction creator and verifies read-back. Both demo wallets belong to this project; they are not independent organizations or the upstream maintainers of the evaluated tools.

See [Arkiv schema](arkiv/schema.md), [friction evidence](arkiv/friction.md), [pre-existing work](PREEXISTING.md), and [third-party notices](THIRD_PARTY_NOTICES.md).

## Trust and privacy boundaries

Consumers choose accepted issuers and reviewers. A copied publisher name in JSON cannot establish identity. Upstream artifact references are not upstream endorsements. Personal data, credentials, private context and private context-derived identifiers do not go to Arkiv. Public context packets are synthetic fixtures only.

The reader verifies application-level signatures, creator/payload agreement, readonly flags, attribute bindings and current signed validity. It trusts its RPC provider's chain metadata and query completeness; it does not independently validate a state proof or prove that the provider returned every relevant record. A provider failure yields an unavailable result. Missing or expired evidence is not safety clearance. Readonly payloads are distinct from ownership, deletion and storage expiration.

MIT applies to the new AppPassport code. The vendored Qarinah runtime retains Apache-2.0 and its notices.
