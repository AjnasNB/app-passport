# Arkiv Graph and AI Passport

I built Arkiv Graph as an open source infrastructure SDK on top of Arkiv's indexed entity storage. AI Passport is the live reference application.

## Two products with one implementation

**Arkiv Graph:** a generic MIT TypeScript package with signed node/edge records, one complete manifest per graph revision, typed Arkiv indexes, bounded directed traversal, an independent CLI and a stdio MCP server. It supports developer-defined type and relation names. It has no Qarinah, model or passport dependency.

**AI Passport:** a developer/user application combining the compatible graph profile with Qarinah context selection, source hash verification, current review admission, real hosted AI and deterministic India learning tools.

The application imports the graph SDK through a compatibility adapter. Existing record signatures and graph roots remain unchanged. The standalone default uses namespace `arkiv-graph-v1`; the reference application's historical namespace remains `ai-passport-graph-v1`.

## Who needs it

Arkiv developers who otherwise write their own node/edge storage conventions and completeness checks. AI context handoffs are the working reference use case. Equipment maintenance and document provenance are possible consumers of the generic schema; they are not deployed customer products.

## Specific advantage

A hash identifies one object. A signed graph manifest commits to every node and relationship in one revision. The reader checks the whole manifest and pinned root before handing a bounded connected path to another application. Missing or changed members fail verification. Local policy chooses accepted authors.

This provides reusable protocol and reader code rather than only a graph visualization. The website, an installed SDK consumer and MCP can read the same public records without a private application API.

## Why Arkiv

Arkiv supplies publicly queryable indexed entities, creator metadata, expiry and blockchain transactions. Arkiv Graph adds a reusable graph protocol and reader API. Different tools can inspect the same attributable connected records through their own RPC provider.

A normal database is sufficient when one operator controls every writer and reader. The shared Arkiv record layer is useful when consumers need a public interchange with attributable authorship and compatible independent readers. Graph structure alone does not require a blockchain, and a graph signature does not certify source truth.

Arkiv could adopt the SDK to reduce the amount of relationship, manifest and traversal code each application must write. This is a proposed ecosystem contribution, not official endorsement or evidence of Arkiv's adoption. We do not claim a native graph engine, Cypher, joins, automatic latest-root discovery, production-scale performance or permanent storage.

## Setup in another project

```sh
npm install https://passport.ajnasnb.com/downloads/arkiv-graph-sdk-0.1.0.tgz
curl -o reader.json https://passport.ajnasnb.com/data/arkiv-graph-reader.json
npx arkiv-graph verify reader.json
npx arkiv-graph trace reader.json application:ai-passport
npx arkiv-graph mcp reader.json
```

The reader configuration chooses the root and accepted issuer. Downloaded configuration is a starting example, not an automatically trusted policy. The default CLI uses Tiramisu. Custom Arkiv chains and custom profiles are supported through the TypeScript API.

To also install the application SDK 0.3.0, install **both tarballs in the same npm command** because neither new package is published to npm:

```sh
npm install https://passport.ajnasnb.com/downloads/arkiv-graph-sdk-0.1.0.tgz https://passport.ajnasnb.com/downloads/app-passport-sdk-0.3.0.tgz
```

Readers need no wallet or gas tokens. Publishing uses a dedicated funded Tiramisu testnet wallet. Public record fields contain no API key or private key.

## Evidence and limits

- Infrastructure graph: six nodes, six edges, thirteen signed entities in `arkiv-graph-v1`.
- AI reference graph: 27 nodes, 43 edges, 71 signed entities. Four selected actual run receipts are part of this graph.
- Generic equipment domain, missing members, signing-domain isolation, unsafe paths and compatibility checks run in the local unit suite.
- `scripts/consume-graph-infra.mjs` installs the release tarballs in a fresh isolated consumer and tests both live roots, two CLI profiles, and four actual stdio MCP success/truncation cases.
- The previous application AI evaluations and browser checks remain separate evidence. Local inference orchestration uses mocks. Real hosted model calls are measured by the public live suite.

Graph limits are 200 nodes, 500 edges, eight pages of 100 records, depth at most eight and signed validity at most 30 days. Current roots are explicit configuration. The RPC can affect availability and discovery of other revisions. Both public graph publishers are project-controlled demo roles.

## Pitch and demo

Main pitch: **Arkiv Graph: connected records that independent readers can verify.**

Proof application: **AI Passport: useful AI with traceable selected context and current reviews.**

The current 75-second film demonstrates the AI Passport reference app. Its narration still says AI Passport. The new Arkiv Graph deck explains the infrastructure positioning separately.

- Graphical pitch: https://passport.ajnasnb.com/downloads/arkiv-graph-pitch.pptx
- PDF pitch: https://passport.ajnasnb.com/downloads/arkiv-graph-pitch.pdf
- Individual pitch page images: https://passport.ajnasnb.com/downloads/arkiv-graph-pitch-pages/slide-1.png (pages 1–7)
