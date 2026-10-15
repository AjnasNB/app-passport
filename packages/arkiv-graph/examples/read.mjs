import fs from 'node:fs/promises';
import {createGraphKit, AI_PASSPORT_PROFILE} from '@ajnasnb/arkiv-graph';

const config = JSON.parse(await fs.readFile(process.argv[2] || 'reader.json', 'utf8'));
const kit = createGraphKit(config.profile === 'ai-passport-v1' ? AI_PASSPORT_PROFILE : undefined);
const live = await kit.readGraph({rpc: config.rpc, issuers: config.issuers}, config.graph_digest);
console.log(JSON.stringify({verified: true, root: config.graph_digest, block: live.block,
  nodes: live.graph.nodes.length, edges: live.graph.edges.length, query: live.query}, null, 2));
