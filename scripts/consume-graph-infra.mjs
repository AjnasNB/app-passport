import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
const root=process.cwd(),directory=path.join(root,'.local/arkiv-graph-consumer-0.2.0');
await fs.mkdir(directory,{recursive:true});
await fs.writeFile(path.join(directory,'package.json'),JSON.stringify({name:'independent-arkiv-graph-consumer',private:true,type:'module'}));
for(const name of ['arkiv-graph-sdk-0.2.0.tgz','app-passport-sdk-0.4.0.tgz'])await fs.copyFile('apps/web/public/downloads/'+name,path.join(directory,name));
const run=(cmd,args,cwd=directory)=>new Promise((resolve,reject)=>{const c=spawn(cmd,args,{cwd,windowsHide:true,stdio:['ignore','pipe','pipe']});let out='',err='';c.stdout.on('data',b=>out+=b);c.stderr.on('data',b=>err+=b);c.on('error',reject);c.on('close',code=>code===0?resolve(out):reject(new Error('Independent consumer failed ('+code+'): '+err.slice(-700))));});
const install=['install','./arkiv-graph-sdk-0.2.0.tgz','./app-passport-sdk-0.4.0.tgz','--ignore-scripts','--no-fund'];
await run(process.platform==='win32'?'cmd.exe':'npm',process.platform==='win32'?['/d','/s','/c','npm '+install.join(' ')]:install);
await fs.writeFile(path.join(directory,'check.mjs'),`
import fs from 'node:fs/promises';
import {createGraphKit,AI_PASSPORT_PROFILE} from '@arkiv-graph/sdk';
import {readGraph as appRead} from '@app-passport/sdk/graph';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
const root=process.argv[2],load=async name=>JSON.parse(await fs.readFile(root+'/apps/web/public/data/'+name,'utf8'));
const generic=await load('arkiv-graph-reader.json'),legacy=await load('ai-passport-reader.json'),policy=await load('policy.json');
const live=await createGraphKit().readGraph({rpc:generic.rpc,issuers:generic.issuers},generic.graph_digest);
const appGraph=await createGraphKit(AI_PASSPORT_PROFILE).readGraph({rpc:legacy.rpc,issuers:legacy.issuers},legacy.graph_digest);
const adapter=await appRead({policy},legacy.graph_digest);
if(live.graph.nodes.length!==7||live.graph.edges.length!==8||appGraph.graph.nodes.length!==27||JSON.stringify(adapter.graph)!==JSON.stringify(appGraph.graph))throw new Error('Generic or compatibility reader mismatch');
const configs=[['generic','arkiv-graph-reader.json','application:ai-passport'],['compatibility','ai-passport-reader.json','app:coding']];const mcp=[];
for(const [profile,file,start] of configs){
 const transport=new StdioClientTransport({command:process.execPath,args:['node_modules/@arkiv-graph/sdk/dist/cli.js','mcp',root+'/apps/web/public/data/'+file],cwd:process.cwd(),stderr:'pipe'}),client=new Client({name:'standalone-graph-evaluation',version:'1.0.0'});
 await client.connect(transport);
 try{const listed=await client.listTools();if(!listed.tools.some(t=>t.name==='trace_graph'))throw new Error('MCP tool absent');for(const maxNodes of [40,1]){const result=await client.callTool({name:'trace_graph',arguments:{start,depth:4,maxNodes}});const rejected=maxNodes===1;if(Boolean(result.isError)!==rejected)throw new Error('MCP completeness boundary failed');if(!rejected){const value=JSON.parse(result.content[0].text);if(value.contentRole!=='untrusted-data'||value.truncated)throw new Error('MCP path failed');}mcp.push({profile,case:rejected?'bounded-path-rejected':'complete-path',passed:true});}
const completeContext=await client.callTool({name:'read_context',arguments:{start,depth:4,maxNodes:40,maxChars:12000}});if(completeContext.isError)throw new Error('Context MCP failed');const packet=JSON.parse(completeContext.content[0].text);if(packet.packet.contentRole!=='untrusted-data'||packet.packet.verification.execution_authority!==false||packet.chars>12000)throw new Error('Context boundary failed');mcp.push({profile,case:'complete-context',passed:true});const limitedContext=await client.callTool({name:'read_context',arguments:{start,depth:4,maxNodes:40,maxChars:512}});if(!limitedContext.isError)throw new Error('Context budget failed');mcp.push({profile,case:'context-budget-rejected',passed:true});}
 finally{await client.close();}
}
console.log(JSON.stringify({evaluated_at:new Date().toISOString(),generic_sdk:'0.2.0',application_sdk:'0.4.0',installed_from_tarballs:true,website_backend_used:false,api_key_used:false,wallet_required:false,generic_graph:{nodes:live.graph.nodes.length,edges:live.graph.edges.length,entities:live.records.length,graph_digest:generic.graph_digest,read_block:live.block},compatibility_graph:{nodes:appGraph.graph.nodes.length,edges:appGraph.graph.edges.length,entities:appGraph.records.length,graph_digest:legacy.graph_digest},compatibility_adapter_matched:true,mcp,passed:mcp.filter(x=>x.passed).length,total:mcp.length,scope:'Real direct RPC and actual stdio MCP calls. Both graphs are project-published. No customer adoption or scalability benchmark.'}));
`);
const report=JSON.parse((await run(process.execPath,['check.mjs',root])).trim());
for(const file of ['arkiv-graph-reader.json','ai-passport-reader.json']){const out=JSON.parse(await run(process.execPath,['node_modules/@arkiv-graph/sdk/dist/cli.js','verify',path.join(root,'apps/web/public/data',file)]));if(!out.verified)throw new Error('Packaged CLI failed');}
report.cli_profiles_verified=2;
await fs.writeFile('apps/web/public/data/graph-infrastructure-evaluation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));

