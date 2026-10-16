# New work and disclosed reuse

## Built for this challenge

Arkiv Graph is the primary product: the reusable TypeScript graph SDK, typed node/edge/manifest contract, signed complete revisions, bounded reconstruction and traversal, CLI, stdio MCP reader, linked root-update protocol, checkpoint verification and public developer experience were built for this entry.

AI Passport is the reference application built alongside it. New integration work connects selected context and exact source bytes to Arkiv passports, reviews, withdrawals, task admission and hosted AI inference. It includes the two-client withdrawal demonstration, release-guard exercise, Indian-number tutor and UPI Safety Quest. The public repository includes reproducible queries, test receipts, deployment and presentation assets.

## Earlier Qarinah work

The builder's earlier Qarinah runtime is reused in the reference integration. Its unchanged Skillbox source baseline is commit `1aa70228299de902d92fc97214766c0aea02be9d`, reporting version 0.6.0. The copied source includes `src`, types, schemas, license/notices and adjusted package metadata, with its original build/publication scripts removed. Original Qarinah folders and commits remain unchanged. Qarinah retains its Apache-2.0 license and notices.

The existing context compiler and proof-context validator provide the packet contract used by the reference flow. The optional adapter imports `validateProofContext` in [`packages/sdk/src/qarinah.ts`](packages/sdk/src/qarinah.ts); the two-client demo uses that validator in [`scripts/two-client-demo.ts`](scripts/two-client-demo.ts). The published application package exposes this adapter. The Arkiv integration around it is new work.

The generic `@ajnasnb/arkiv-graph` package has no Qarinah, AI Passport or model dependency. Its graph contract and readers are usable by other applications on their own.

## Earlier ScamSignal baseline

ScamSignal baseline commit `4833baee0f2872ee6100ba47bb4cc4743abdffe1` supplied the existing testnet reviewer account and self-hosted DM Sans font assets, alongside prior Arkiv integration experience. Its deployed scanner/frontend remain separate. This entry has its own application directory, producer role, namespaces and deployment.

## Dependencies and evaluation subjects

Third-party libraries and upstream evaluation artifacts retain their licenses and notices. MCP reference servers, Playwright and Chrome DevTools are credited as dependencies, evaluation subjects or development tools. Evaluated artifacts and their source URLs are listed in public data. Generated illustrations, where used, are design assets; product captures and transaction receipts are identified in the evidence documentation.
