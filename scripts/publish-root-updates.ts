import fs from 'node:fs/promises';
import {createWalletClient} from '@arkiv-network/sdk';
import {tiramisu} from '@arkiv-network/sdk/chains';
import {http} from 'viem';
import {createGraphKit,digestJson,DEFAULT_RPC} from '../packages/arkiv-graph/src/index';
import {rootTrustConfigSchema,rootTrustScope,rootGenesisDigest,signRootRevision} from '../packages/arkiv-graph/src/root-update';
import {rootRevisionEntityInput,readRootRegistry} from '../packages/arkiv-graph/src/root-registry';
import {operators} from './private-operator';
const plan={operation:'Publish two authenticated graph revisions and their complete tiny graphs',network:'Tiramisu testnet only',entities:8,transactions:1,scope:'Separate root-update demonstration; existing pinned graphs remain unchanged.',secrets:'Local operator credentials stay outside the repository.'};
async function main(){
 if(!process.argv.includes('--publish')){console.log(JSON.stringify(plan,null,2));return;}
 const journalPath='.local/root-publication-journal.json';
 try{await fs.access(journalPath);throw new Error('Publication journal already exists; inspect it before resuming. No automatic rebroadcast.');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
 const o=await operators(),kit=createGraphKit(),now=Date.now(),issued=new Date(now).toISOString(),until=new Date(now+14*86400000).toISOString();
 const original=JSON.parse(await fs.readFile('apps/web/public/data/arkiv-graph-reader.json','utf8'));
 const config=rootTrustConfigSchema.parse({schema:'arkiv.graph-root-trust.v1',chain_id:7738577,registry_id:'arkiv-graph:root-demo:2026-10-15',profile:'arkiv-graph-v1',policy_digest:digestJson({issuers:[o.producer.address.toLowerCase()],purpose:'public synthetic root-update demo'}),genesis_root:original.graph_digest,authority:o.producer.address,max_revision_lifetime_seconds:14*86400});
 const node={id:'context:public-demo',type:'context',label:'Public handoff',digest:digestJson('Synthetic public root-update evidence v1'),detail:'Public synthetic context used only to exercise authenticated root updates.'};
 const graph1=kit.graphSchema.parse({schema:'arkiv.graph.v1',label:'Root update demonstration, revision one',nodes:[node],edges:[]});
 const graph2=kit.graphSchema.parse({schema:'arkiv.graph.v1',label:'Root update demonstration, revision two',nodes:[node,{id:'decision:current-review',type:'decision',label:'Current review required',digest:digestJson('Explicit current-review requirement v2'),detail:'The new revision adds an explicit review requirement, with every member listed in its signed manifest.'}],edges:[{id:'edge:requires-review',from:node.id,to:'decision:current-review',relation:'requires'}]});
 const first=await signRootRevision({schema:'arkiv.graph-root-revision.v1',scope_digest:rootTrustScope(config),sequence:1,previous_revision_digest:rootGenesisDigest(config),previous_root:config.genesis_root,root:digestJson(graph1),issuer:config.authority,issued_at:issued,valid_until:until},o.producer);
 const second=await signRootRevision({...first.payload,sequence:2,previous_revision_digest:digestJson(first),previous_root:first.payload.root,root:digestJson(graph2)},o.producer);
 const signed=await Promise.all([graph1,graph2].flatMap(graph=>kit.graphPayloads(graph,o.producer.address,issued,until)).map(payload=>kit.signGraph(payload,o.producer)));
 await fs.writeFile('apps/web/public/data/root-trust-config.json',JSON.stringify(config,null,2)+'\n');
 const journal:any={...plan,status:'prepared',config,revisions:[first,second],graphs:[graph1,graph2],prepared_at:issued};
 await fs.writeFile(journalPath,JSON.stringify(journal,null,2)+'\n');
 const wallet=createWalletClient({chain:tiramisu,account:o.producer,transport:http(DEFAULT_RPC,{timeout:60000,retryCount:0,fetchOptions:{headers:o.headers}})});
 journal.status='broadcasting';await fs.writeFile(journalPath,JSON.stringify(journal,null,2)+'\n');
 const tx=await wallet.executeBatch({creates:[...signed.map(kit.graphEntityInput),rootRevisionEntityInput(config,first),rootRevisionEntityInput(config,second)]});
 journal.status='confirmed';journal.tx_hash=tx.txHash;journal.created=[...tx.createdEntities];await fs.writeFile(journalPath,JSON.stringify(journal,null,2)+'\n');
 const live=await readRootRegistry(config,{headers:o.headers});
 const report={...plan,schema:'arkiv.graph-root-publication.v1',published_at:new Date().toISOString(),tx_hash:tx.txHash,tx_url:'https://tiramisu.explorer.arkiv.network/tx/'+tx.txHash,entity_keys:journal.created,config,revisions:[first,second],graphs:[graph1,graph2],live_read:{block:live.block,query:live.query,root:live.root,graph_entities:live.graph.records.length},scope:'Actual testnet publication by the project producer. This authorizes graph roots; it does not attest source truth or RPC completeness.'};
 await fs.writeFile('apps/web/public/data/root-update-publication.json',JSON.stringify(report,null,2)+'\n');
 await fs.writeFile('arkiv/root-updates.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({published:true,tx_hash:tx.txHash,entities:journal.created.length,root:live.root,read_block:live.block}));
}
main().catch(e=>{console.error('Root update publication stopped. Inspect the private journal; do not blindly retry. '+(e instanceof Error&&/journal already/.test(e.message)?e.message:'Provider details and credentials withheld.'));process.exitCode=1;});
