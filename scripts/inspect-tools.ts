import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {descriptorSchema,digestBytes} from '../packages/sdk/src/index';

const inventory=[
 {id:'filesystem',name:'MCP Filesystem',registry:'npm',pkg:'@modelcontextprotocol/server-filesystem',source:'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',capabilities:['filesystem-read','filesystem-write','configured-root-access']},
 {id:'memory',name:'MCP Memory',registry:'npm',pkg:'@modelcontextprotocol/server-memory',source:'https://github.com/modelcontextprotocol/servers/tree/main/src/memory',capabilities:['memory-read','memory-write']},
 {id:'thinking',name:'MCP Sequential Thinking',registry:'npm',pkg:'@modelcontextprotocol/server-sequential-thinking',source:'https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking',capabilities:['structured-thought-input']},
 {id:'everything',name:'MCP Everything',registry:'npm',pkg:'@modelcontextprotocol/server-everything',source:'https://github.com/modelcontextprotocol/servers/tree/main/src/everything',capabilities:['reference-test-tools','resources','prompts']},
 {id:'playwright',name:'Playwright MCP',registry:'npm',pkg:'@playwright/mcp',source:'https://github.com/microsoft/playwright-mcp',capabilities:['browser-read','browser-actions']},
 {id:'chrome',name:'Chrome DevTools MCP',registry:'npm',pkg:'chrome-devtools-mcp',source:'https://github.com/ChromeDevTools/chrome-devtools-mcp',capabilities:['browser-inspection','browser-actions']},
 {id:'git',name:'MCP Git',registry:'pypi',pkg:'mcp-server-git',source:'https://github.com/modelcontextprotocol/servers/tree/main/src/git',capabilities:['repository-read','repository-write']},
 {id:'fetch',name:'MCP Fetch',registry:'pypi',pkg:'mcp-server-fetch',source:'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch',capabilities:['public-web-fetch']},
 {id:'time',name:'MCP Time',registry:'pypi',pkg:'mcp-server-time',source:'https://github.com/modelcontextprotocol/servers/tree/main/src/time',capabilities:['time-read','timezone-conversion']},
];
await fs.mkdir('.local/artifacts',{recursive:true});await fs.mkdir('apps/web/public/artifacts',{recursive:true});await fs.mkdir('apps/web/public/data',{recursive:true});
const rows:any[]=[];let prior:any;
try{prior=JSON.parse(await fs.readFile('apps/web/public/data/tools.json','utf8'));}catch{}
async function get(url:string){const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw new Error(`Public artifact fetch failed: ${r.status}`);return r;}
for(const spec of inventory){
 let row=prior?.find((r:any)=>r.id===spec.id);if(row&&await fs.stat(path.join('apps/web/public',row.artifact_url)).catch(()=>null)){rows.push(row);continue;}
 let version:string,url:string,expected:string,algorithm:string;
 if(spec.registry==='npm'){
  const metadata=await (await get(`https://registry.npmjs.org/${encodeURIComponent(spec.pkg)}/latest`)).json() as any;
  version=metadata.version;url=metadata.dist.tarball;const integrity=metadata.dist.integrity.split(' ')[0];[algorithm,expected]=integrity.split('-');
 }else{
  const metadata=await (await get(`https://pypi.org/pypi/${spec.pkg}/json`)).json() as any;
  version=metadata.info.version;const wheel=metadata.urls.find((f:any)=>f.packagetype==='bdist_wheel');if(!wheel)throw new Error('A public wheel is required');
  url=wheel.url;expected=wheel.digests.sha256;algorithm='sha256';
 }
 const response=await get(url);const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length>50*1024*1024)throw new Error('Public artifact exceeds the evaluation ceiling');
 const observed=createHash(algorithm!).update(bytes).digest(spec.registry==='npm'?'base64':'hex');if(observed!==expected!)throw new Error('Registry integrity mismatch');
 const filename=spec.registry==='npm'?`${spec.id}-${version!}.tgz`:path.basename(new URL(url!).pathname);
 await fs.writeFile(`.local/artifacts/${filename}`,bytes);await fs.writeFile(`apps/web/public/artifacts/${filename}`,bytes);
 const descriptor=descriptorSchema.parse({schema:'app-passport.descriptor.v1',kind:'tool',name:spec.name,version:version!,artifact_digest:digestBytes(bytes),source_url:spec.source,provenance:'upstream-artifact-reference',capabilities:spec.capabilities});
 row={id:spec.id,package_name:spec.pkg,registry:spec.registry,descriptor,artifact_url:`/artifacts/${filename}`,download_url:url!,byte_length:bytes.length,registry_integrity_verified:true,inspection:'artifact identity and registry integrity; runtime protocol evaluation recorded separately',publisher_endorsement:false};rows.push(row);console.log(JSON.stringify({id:spec.id,version:version!,bytes:bytes.length,integrity:'passed'}));
}
const qarinahFile='.local/artifacts/qarinah-source-1aa7022.tgz';
if(!await fs.stat(qarinahFile).catch(()=>null))execFileSync('tar',['-czf',path.resolve(qarinahFile),'-C',path.resolve('vendor/qarinah'),'src','types','schemas','LICENSE','NOTICE','THIRD_PARTY_NOTICES.md','package.json']);
const qarinahBytes=await fs.readFile(qarinahFile);await fs.writeFile('apps/web/public/artifacts/qarinah-source-1aa7022.tgz',qarinahBytes);
rows.unshift({id:'qarinah',package_name:'qarinah',registry:'reviewed-source-snapshot',descriptor:descriptorSchema.parse({schema:'app-passport.descriptor.v1',kind:'tool',name:'Qarinah',version:'0.6.0+1aa7022',artifact_digest:digestBytes(qarinahBytes),source_url:'https://github.com/AjnasNB/qarinah/tree/1aa70228299de902d92fc97214766c0aea02be9d',provenance:'upstream-artifact-reference',capabilities:['local-project-memory','cited-context','proof-context-validation']}),artifact_url:'/artifacts/qarinah-source-1aa7022.tgz',byte_length:qarinahBytes.length,registry_integrity_verified:false,source_commit:'1aa70228299de902d92fc97214766c0aea02be9d',inspection:'reviewed source snapshot; not an npm-published 0.6.0 release',publisher_endorsement:false});
await fs.writeFile('apps/web/public/data/tools.json',JSON.stringify(rows,null,2)+'\n');
console.log(JSON.stringify({real_artifacts:rows.length,registry_integrity_passed:rows.filter(r=>r.registry_integrity_verified).length,source_snapshots:1}));
