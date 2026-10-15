import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {privateKeyToAccount} from 'viem/accounts';
import {http} from 'viem';
import {createPublicClient, createWalletClient} from '@arkiv-network/sdk';
import {tiramisu} from '@arkiv-network/sdk/chains';
import {createGraphKit, digestJson} from '@ajnasnb/arkiv-graph';

async function main() {
  if (!process.argv.includes('--publish')) throw new Error('Use --publish to write four synthetic entities to Tiramisu. A funded testnet wallet is required.');
  const secret = process.env.ARKIV_GRAPH_PRIVATE_KEY;
  if (!secret || !/^0x[0-9a-fA-F]{64}$/.test(secret)) throw new Error('Set ARKIV_GRAPH_PRIVATE_KEY privately in your environment. Never commit it.');
  const rpc = process.env.ARKIV_GRAPH_RPC || 'https://rpc.tiramisu.db-chain.testnet.arkiv.network';
  if (!rpc.startsWith('https://')) throw new Error('ARKIV_GRAPH_RPC must use HTTPS.');
  const headers = process.env.ARKIV_GRAPH_API_KEY ? {'X-API-KEY': process.env.ARKIV_GRAPH_API_KEY} : undefined;
  const account = privateKeyToAccount(secret), transport = http(rpc, {timeout: 30000, retryCount: 0, ...(headers ? {fetchOptions: {headers}} : {})});
  const reader = createPublicClient({chain: tiramisu, transport}), wallet = createWalletClient({chain: tiramisu, transport, account});
  if (await reader.getBalance({address: account.address}) === 0n) throw new Error('Fund this dedicated wallet with free Tiramisu testnet tokens through Arkiv Hub first.');
  const kit = createGraphKit(), graph = kit.graphSchema.parse({schema: 'arkiv.graph.v1', label: 'Synthetic equipment example ' + randomUUID(), nodes: [
    {id: 'equipment:pump', type: 'equipment', label: 'Demo pump', digest: digestJson({serial: 'synthetic-demo-01'}), detail: 'Synthetic example only.'},
    {id: 'inspection:one', type: 'inspection', label: 'Demo inspection', digest: digestJson({checked: true}), detail: 'Project-authored synthetic inspection.'},
  ], edges: [{id: 'edge:inspection', from: 'equipment:pump', to: 'inspection:one', relation: 'inspected-by'}]});
  const now = Date.now(), root = digestJson(graph), payloads = kit.graphPayloads(graph, account.address, new Date(now).toISOString(), new Date(now + 7 * 86400000).toISOString());
  console.log(JSON.stringify({phase: 'prepared', graph_digest: root, creator: account.address, rpc, planned_entities: payloads.length}));
  await fs.writeFile('graph-reader.pending.json', JSON.stringify({schema: 'arkiv-graph.reader.v1', profile: 'arkiv-graph-v1', rpc, graph_digest: root, issuers: [account.address]}, null, 2) + '\n');
  const created = [];
  for (const payload of payloads) {
    const result = await wallet.createEntity(kit.graphEntityInput(await kit.signGraph(payload, account)));
    created.push({key: result.entityKey, transaction: result.txHash});
    console.log(JSON.stringify({created: created.length, total: payloads.length, key: result.entityKey, transaction: result.txHash, graph_digest: root}));
  }
  const config = {schema: 'arkiv-graph.reader.v1', profile: 'arkiv-graph-v1', rpc, graph_digest: root, issuers: [account.address]};
  await fs.writeFile('graph-reader.json', JSON.stringify(config, null, 2) + '\n');
  await fs.writeFile('graph-publication.json', JSON.stringify({graph, created, config}, null, 2) + '\n');
  const live = await kit.readGraph({rpc, issuers: config.issuers, ...(headers ? {headers} : {})}, root);
  console.log(JSON.stringify({verified: true, block: live.block, entities: live.records.length, reader_file: 'graph-reader.json'}));
}
main().catch(error => {
  const safe = typeof error?.message === 'string' && /^(Use --publish|Set ARKIV_GRAPH_PRIVATE_KEY|ARKIV_GRAPH_RPC|Fund this dedicated)/.test(error.message);
  for (const field of ['txHash', 'transactionHash']) if (typeof error?.[field] === 'string' && /^0x[0-9a-fA-F]{64}$/.test(error[field])) console.error(JSON.stringify({uncertain_transaction: error[field], recovery: 'Inspect this public transaction before retrying.'}));
  console.error(safe ? error.message : 'Publication or readback did not complete. Preserve any printed public transaction IDs and inspect them before retrying. No positive verification was substituted.');
  process.exitCode = 1;
});
