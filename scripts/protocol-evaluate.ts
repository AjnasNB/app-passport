import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {ListRootsRequestSchema} from '@modelcontextprotocol/sdk/types.js';
import {digestJson} from '../packages/sdk/src/index';

const root=process.cwd(),tools=JSON.parse(await fs.readFile('apps/web/public/data/tools.json','utf8'));
const fixture=path.join(root,'.local','context-fixture');
await fs.mkdir('.local/mcp-home',{recursive:true});await fs.mkdir('.local/mcp-temp',{recursive:true});
const wrapper="import {inspectWorkspacePolicy,approveWorkspaceTrust} from "+JSON.stringify(new URL('../vendor/qarinah/src/index.js',import.meta.url).href)+"; import {runMcpServer} from "+JSON.stringify(new URL('../vendor/qarinah/src/mcp/server.js',import.meta.url).href)+"; const p=await inspectWorkspacePolicy("+JSON.stringify(fixture)+"); await approveWorkspaceTrust("+JSON.stringify(fixture)+",'content',p.policyHash); await runMcpServer({cwd:"+JSON.stringify(fixture)+"});\n";
await fs.writeFile('.local/qarinah-mcp.mjs',wrapper);
// The SDK inherits only its documented platform environment allowlist. No operator credentials are passed.
const env:Record<string,string>={PATH:process.env.PATH!,SystemRoot:process.env.SystemRoot!,TEMP:path.join(root,'.local','mcp-temp'),TMP:path.join(root,'.local','mcp-temp'),LOCALAPPDATA:path.join(root,'.local','mcp-home'),MEMORY_FILE_PATH:path.join(root,'.local','mcp-memory.json'),DO_NOT_TRACK:'1',CHROME_DEVTOOLS_MCP_NO_USAGE_STATISTICS:'1'};
const py=path.join(root,'.local','python-env',process.platform==='win32'?'Scripts/python.exe':'bin/python');
async function entry(pkg:string){const dir=path.join(root,'.local','mcp-tools','node_modules',...pkg.split('/'));const p=JSON.parse(await fs.readFile(path.join(dir,'package.json'),'utf8'));return path.join(dir,typeof p.bin==='string'?p.bin:Object.values(p.bin)[0] as string);}
const commands:Record<string,()=>Promise<[string,string[]]>>={
 qarinah:async()=>[process.execPath,[path.join(root,'.local','qarinah-mcp.mjs')]],
 filesystem:async()=>[process.execPath,[await entry('@modelcontextprotocol/server-filesystem'),fixture]],
 memory:async()=>[process.execPath,[await entry('@modelcontextprotocol/server-memory')]],
 thinking:async()=>[process.execPath,[await entry('@modelcontextprotocol/server-sequential-thinking')]],
 everything:async()=>[process.execPath,[await entry('@modelcontextprotocol/server-everything')]],
 playwright:async()=>[process.execPath,[await entry('@playwright/mcp'),'--headless','--isolated','--executable-path',process.env.PASSPORT_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe']],
 chrome:async()=>[process.execPath,[await entry('chrome-devtools-mcp'),'--headless','--isolated','--executablePath',process.env.PASSPORT_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe','--no-usage-statistics','--no-performance-crux']],
 git:async()=>[py,['-m','mcp_server_git','--repository',fixture]],fetch:async()=>[py,['-m','mcp_server_fetch']],time:async()=>[py,['-m','mcp_server_time']],
};
const calls:Record<string,[string,any]>={qarinah:['context_status',{workspace:fixture}],filesystem:['list_directory',{path:fixture}],memory:['read_graph',{}],thinking:['sequentialthinking',{thought:'Synthetic protocol input. No model reasoning is recorded.',thoughtNumber:1,totalThoughts:1,nextThoughtNeeded:false}],everything:['echo',{message:'AppPassport synthetic protocol check'}],git:['git_status',{repo_path:fixture}],time:['get_current_time',{timezone:'Asia/Kolkata'}],fetch:['fetch',{url:'https://example.com',max_length:500}],playwright:['browser_tabs',{action:'list'}],chrome:['list_pages',{}]};
async function inspect(id:string){
 const [command,args]=await commands[id]!();const client=new Client({name:'app-passport-evaluation',version:'0.1.0'},{capabilities:{roots:{listChanged:false}}});
 client.setRequestHandler(ListRootsRequestSchema,async()=>({roots:[{uri:pathToFileURL(fixture).href,name:'Synthetic evaluation fixture'}]}));
 const transport=new StdioClientTransport({command,args,cwd:fixture,env,stderr:'pipe',maxBufferSize:2*1024*1024});let stderr='';transport.stderr?.on('data',d=>{if(stderr.length<12000)stderr+=d.toString();});
 try{
  await client.connect(transport,{timeout:20000});const list=await client.listTools({}, {timeout:20000});
  const manifest=list.tools.map(t=>({name:t.name,inputSchema:t.inputSchema,annotations:t.annotations||{}}));
  const [name,arguments_]=calls[id]!;if(!manifest.some(t=>t.name===name))throw new Error('Expected controlled test tool missing');
  const result=await client.callTool({name,arguments:arguments_},undefined,{timeout:30000});
  const smoke={name,passed:result.isError!==true,response_digest:digestJson(result)};
  return {id,initialized:true,server_version:client.getServerVersion()?.version,tool_count:manifest.length,tool_names:manifest.map(t=>t.name),manifest_digest:digestJson(manifest),smoke,passed:smoke.passed};
 }catch{return {id,initialized:false,passed:false,error:'Controlled protocol or smoke test did not complete. No safety conclusion.'};}
 finally{await client.close();await fs.writeFile(path.join(root,'.local','protocol-'+id+'.log'),stderr);}
}
const selected=process.env.PASSPORT_PROTOCOL_FILTER?tools.filter((t:any)=>process.env.PASSPORT_PROTOCOL_FILTER!.split(',').includes(t.id)):tools;
const results=[];for(const t of selected){const row=await inspect(t.id);results.push(row);console.log(JSON.stringify({id:t.id,passed:row.passed,tool_count:(row as any).tool_count,smoke:(row as any).smoke?.name}));}
const lock=JSON.parse(await fs.readFile('.local/mcp-tools/package-lock.json','utf8'));
const report={evaluated_at:new Date().toISOString(),scope:'Pinned artifact identity, MCP initialization, tools/list and one controlled call. Not a malware audit, an operating-system sandbox, dependency-vulnerability audit, or proof of advertised capability enforcement.',dependency_lock_digest:digestJson(lock),synthetic_repository:true,credentials_given_to_tools:false,results,passed:results.filter(r=>r.passed).length,total:results.length};
if(!process.env.PASSPORT_PROTOCOL_FILTER){await fs.writeFile('apps/web/public/data/protocol-evaluation.json',JSON.stringify(report,null,2)+'\n');await fs.mkdir('evaluation',{recursive:true});await fs.writeFile('evaluation/mcp-package-lock.json',JSON.stringify(lock,null,2)+'\n');}
if(report.passed!==report.total)process.exitCode=1;
