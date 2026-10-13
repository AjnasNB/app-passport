import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {digestBytes} from '../packages/sdk/src/index';
const tools=JSON.parse(await fs.readFile('apps/web/public/data/tools.json','utf8'));
await fs.mkdir('.local/artifacts',{recursive:true});const npmArtifacts:string[]=[],pythonArtifacts:string[]=[];
for(const row of tools){
 const bytes=await fs.readFile(path.join('apps/web/public',row.artifact_url));if(digestBytes(bytes)!==row.descriptor.artifact_digest)throw new Error('Artifact identity changed before installation');
 if(row.registry==='reviewed-source-snapshot')continue;
 const filename=row.registry==='pypi'?path.basename(new URL(row.download_url).pathname):path.basename(row.artifact_url);
 if(!/^[A-Za-z0-9_.-]{1,180}$/.test(filename))throw new Error('Unsupported artifact filename');
 await fs.writeFile(path.join('.local/artifacts',filename),bytes);(row.registry==='npm'?npmArtifacts:pythonArtifacts).push('./.local/artifacts/'+filename);
}
async function run(command:string,args:string[]){await new Promise<void>((resolve,reject)=>{const child=spawn(command,args,{cwd:process.cwd(),windowsHide:true,stdio:['ignore','inherit','inherit']});child.on('error',reject);child.on('close',code=>code===0?resolve():reject(new Error('Pinned dependency installation failed')));});}
const npmArgs=['install','--prefix','.local/mcp-tools','--ignore-scripts','--no-audit','--no-fund',...npmArtifacts];
if(process.platform==='win32')await run(process.env.COMSPEC||'cmd.exe',['/d','/s','/c','npm '+npmArgs.join(' ')]);else await run('npm',npmArgs);
await run('uv',['venv','--python','3.11','.local/python-env']);
await run('uv',['pip','install','--only-binary',':all:','--python',path.join('.local','python-env',process.platform==='win32'?'Scripts/python.exe':'bin/python'),...pythonArtifacts]);
