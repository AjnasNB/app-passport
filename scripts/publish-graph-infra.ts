import fs from 'node:fs/promises';
import {http} from 'viem';
import {createWalletClient} from '@arkiv-network/sdk';
import {tiramisu} from '@arkiv-network/sdk/chains';
import {createGraphKit,digestJson,digestBytes,DEFAULT_RPC} from '../packages/arkiv-graph/src/index';
import {operators} from './private-operator';
async function main(){
 const kit=createGraphKit(),o=await operators();
 const sdk=await fs.readFile('packages/arkiv-graph/src/index.ts'),cli=await fs.readFile('packages/arkiv-graph/src/cli.ts');
 await fs.writeFile('apps/web/public/sources/arkiv-graph.ts',sdk);await fs.writeFile('apps/web/public/sources/arkiv-graph-cli.ts',cli);
 const nodes=[
  {id:'infrastructure:arkiv-graph',type:'infrastructure',label:'Arkiv Graph SDK',digest:digestBytes(sdk),source_path:'/sources/arkiv-graph.ts',detail:'Actual public generic SDK source, MIT. Builds typed signed graph records and verifies manifests.'},
  {id:'reader:cli-mcp',type:'reader',label:'Independent CLI and MCP',digest:digestBytes(cli),source_path:'/sources/arkiv-graph-cli.ts',detail:'Actual source. Reads current graph directly through Arkiv RPC, with locally chosen accepted issuers.'},
  {id:'protocol:manifest',type:'protocol',label:'Signed manifest contract',digest:digestJson({graph:'arkiv.graph.v1',record:'arkiv.graph-record.v1',namespace:'arkiv-graph-v1'}),detail:'A manifest commits to every node and edge digest in one graph revision.'},
  {id:'network:tiramisu',type:'network',label:'Arkiv Tiramisu',digest:digestJson({chain_id:7738577,rpc:DEFAULT_RPC}),source_url:'https://docs.arkiv.network/json-rpc/querying-data/',detail:'Indexed entity persistence and query service. The graph traversal engine runs in the SDK.'},
  {id:'application:ai-passport',type:'application',label:'AI Passport',digest:digestJson(JSON.parse(await fs.readFile('apps/web/public/data/graph-config.json','utf8'))),source_url:'https://passport.ajnasnb.com/',detail:'Live reference application using the compatible graph profile, Qarinah contexts and current review admission.'},
  {id:'adapter:qarinah',type:'adapter',label:'Qarinah context adapter',digest:digestBytes(await fs.readFile('packages/sdk/src/qarinah.ts')),source_url:'https://github.com/AjnasNB/qarinah',detail:'Disclosed context compilation and source verification. Original Qarinah folders remain unchanged.'}
 ];
 const edges=[['infrastructure:arkiv-graph','network:tiramisu','stored-on'],['infrastructure:arkiv-graph','protocol:manifest','implements'],['reader:cli-mcp','infrastructure:arkiv-graph','uses'],['application:ai-passport','infrastructure:arkiv-graph','built-on'],['application:ai-passport','adapter:qarinah','uses'],['application:ai-passport','reader:cli-mcp','read-by']].map(([from,to,relation],i)=>({id:'edge:infra-'+i,from:from!,to:to!,relation:relation!}));
 const graph=kit.graphSchema.parse({schema:'arkiv.graph.v1',label:'Arkiv Graph infrastructure and reference application',nodes,edges}),root=digestJson(graph);
 const config={schema:'arkiv-graph.reader.v1',profile:'arkiv-graph-v1',rpc:DEFAULT_RPC,graph_digest:root,issuers:[o.producer.address]};
 await fs.writeFile('apps/web/public/data/arkiv-graph-reader.json',JSON.stringify(config,null,2)+'\n');
 const legacy=JSON.parse(await fs.readFile('apps/web/public/data/graph-config.json','utf8'));
 await fs.writeFile('apps/web/public/data/ai-passport-reader.json',JSON.stringify({...config,profile:'ai-passport-v1',graph_digest:legacy.graph_digest},null,2)+'\n');
 let evidence:any;try{evidence=JSON.parse(await fs.readFile('arkiv/graph-infrastructure.json','utf8'));}catch{evidence={graph_digest:root,records:[]};}
 if(evidence.graph_digest!==root)throw new Error('Existing infrastructure revision differs. Preserve it before publishing another root.');
 const save=async()=>{await fs.writeFile('arkiv/graph-infrastructure.json',JSON.stringify(evidence,null,2)+'\n');await fs.writeFile('apps/web/public/data/graph-infrastructure.json',JSON.stringify(evidence,null,2)+'\n');};
 const now=Date.now(),payloads=kit.graphPayloads(graph,o.producer.address,new Date(now).toISOString(),new Date(now+14*86400000).toISOString()),signed=await Promise.all(payloads.map(p=>kit.signGraph(p,o.producer))),wallet=createWalletClient({chain:tiramisu,account:o.producer,transport:http(DEFAULT_RPC,{timeout:60000,retryCount:0,fetchOptions:{headers:o.headers}})});
 for(let offset=evidence.records.length;offset<signed.length;offset+=5){const result=await wallet.executeBatch({creates:signed.slice(offset,offset+5).map(kit.graphEntityInput)});evidence.records.push(...result.createdEntities.map((r:any,i:number)=>({entity_key:r.entityKey,kind:payloads[offset+i]!.kind,tx_hash:result.txHash,tx_url:'https://tiramisu.explorer.arkiv.network/tx/'+result.txHash})));await save();}
 const live=await kit.readGraph({issuers:config.issuers,headers:o.headers},root);evidence={...evidence,namespace:kit.namespace,profile:config.profile,graph_digest:root,nodes:live.graph.nodes.length,edges:live.graph.edges.length,entities:live.records.length,read_block:live.block,verified_at:live.read_at,scope:'Project-controlled publisher. Source-bound infrastructure reference graph, not proof of customer adoption.'};await save();console.log(JSON.stringify({verified:true,nodes:evidence.nodes,edges:evidence.edges,entities:evidence.entities,graph_digest:root}));
}
main().catch(()=>{console.error('Infrastructure publication or read-back failed. Provider details and credentials withheld.');process.exitCode=1;});
