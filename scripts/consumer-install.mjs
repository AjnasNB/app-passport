import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';

export const RELEASE_PACKAGES={graph:{name:'@ajnasnb/arkiv-graph',version:'0.3.0',tarball:'ajnasnb-arkiv-graph-0.3.0.tgz'},passport:{name:'@ajnasnb/ai-passport',version:'0.5.0',tarball:'ajnasnb-ai-passport-0.5.0.tgz'}};
export const ENTRYPOINTS=['@ajnasnb/arkiv-graph','@ajnasnb/arkiv-graph/context','@ajnasnb/ai-passport','@ajnasnb/ai-passport/arkiv','@ajnasnb/ai-passport/graph','@ajnasnb/ai-passport/tools','@ajnasnb/ai-passport/qarinah'];

/** The installation lives outside all workspace parents; child imports cannot fall through to this repository. */
export async function cleanInstall({root,label,registry=false}){
  const mode=registry?'registry':'tarball';
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),label+'-'+mode+'-'));
  const outside=path.relative(root,directory);
  if(!outside.startsWith('..'+path.sep)&&!path.isAbsolute(outside))throw new Error('Consumer directory must be outside the source workspace');
  await fs.writeFile(path.join(directory,'package.json'),JSON.stringify({name:label,private:true,type:'module'},null,2)+'\n');
  // Pass only process/platform essentials. No npm/provider/wallet tokens, NODE_PATH,
  // NODE_OPTIONS, package-manager configuration or workspace flags reach a child.
  const essentials=new Set(['path','pathext','systemroot','windir','comspec','temp','tmp','home','userprofile','homedrive','homepath','appdata','localappdata','programfiles','programfiles(x86)','programdata','os','processor_architecture','lang','lc_all','timezone','tz','node_extra_ca_certs','ssl_cert_file','ssl_cert_dir']);
  const env=Object.fromEntries(Object.entries(process.env).filter(([name])=>essentials.has(name.toLowerCase())));
  await fs.writeFile(path.join(directory,'npm-user-empty.npmrc'),'');
  await fs.writeFile(path.join(directory,'npm-global-empty.npmrc'),'');
  const run=(command,args,cwd=directory)=>new Promise((resolve,reject)=>{
    const child=spawn(command,args,{cwd,env,windowsHide:true,stdio:['ignore','pipe','pipe']});let output='',error='';
    child.stdout.on('data',data=>output+=data);child.stderr.on('data',data=>error+=data);
    child.on('error',reject);child.on('close',code=>code===0?resolve(output):reject(new Error('Clean consumer command failed ('+code+'): '+error.slice(-1500))));
  });
  const specs=[];
  for(const release of Object.values(RELEASE_PACKAGES)){
    if(registry)specs.push(release.name+'@'+release.version);
    else{await fs.copyFile(path.join(root,'apps/web/public/downloads',release.tarball),path.join(directory,release.tarball));specs.push('./'+release.tarball);}
  }
  const install=['install',...specs,'qarinah@0.7.0','typescript@5.9.3','@types/node@24.19.2','--ignore-scripts','--no-fund','--no-audit','--workspaces=false','--userconfig=npm-user-empty.npmrc','--globalconfig=npm-global-empty.npmrc','--registry=https://registry.npmjs.org','--cache=./npm-cache'];
  // Arguments are fixed package names/local basenames. No secrets, workspace paths or user text enter a shell command.
  if(process.platform==='win32')await run('cmd.exe',['/d','/s','/c','npm '+install.join(' ')]);
  else await run('npm',install);
  const installed={};
  for(const release of [...Object.values(RELEASE_PACKAGES),{name:'qarinah',version:'0.7.0'}]){
    const packageDirectory=path.join(directory,'node_modules',...release.name.split('/'));
    if((await fs.lstat(packageDirectory)).isSymbolicLink())throw new Error('Standalone consumer may not use a workspace symlink');
    const info=JSON.parse(await fs.readFile(path.join(packageDirectory,'package.json'),'utf8'));
    if(info.name!==release.name||info.version!==release.version)throw new Error('Installed package identity differs from the pinned release');
    installed[info.name]=info.version;
  }
  await fs.writeFile(path.join(directory,'consumer.ts'),`
import * as graph from '@ajnasnb/arkiv-graph';
import * as context from '@ajnasnb/arkiv-graph/context';
import * as passport from '@ajnasnb/ai-passport';
import * as arkiv from '@ajnasnb/ai-passport/arkiv';
import * as adapterGraph from '@ajnasnb/ai-passport/graph';
import * as tools from '@ajnasnb/ai-passport/tools';
import * as qarinah from '@ajnasnb/ai-passport/qarinah';
import {validateProofContext} from 'qarinah';
import type {Policy,Descriptor} from '@ajnasnb/ai-passport';
import type {GraphConnection} from '@ajnasnb/arkiv-graph/context';

export const entrypoints={graph,context,passport,arkiv,adapterGraph,tools,qarinah,validateProofContext};
export async function consume(connection:GraphConnection,graphDigest:string,policy:Policy,descriptor:Descriptor){
  const kit=graph.createGraphKit();
  const live=await kit.readGraph(connection,graphDigest);
  const selected=kit.traverseGraph(live.graph,live.graph.nodes[0]!.id,{depth:4,maxNodes:40});
  const records=await arkiv.readRecords({policy},descriptor.artifact_digest);
  const decision=await passport.evaluateAdmission({descriptor,policy,observedDigest:descriptor.artifact_digest,records:records.records});
  return {selected,decision,readContext:context.readGraphContext,inspect:qarinah.inspectQarinahPacket,tool:tools.testGuard,compatibility:adapterGraph.readGraph};
}
`);
  await fs.writeFile(path.join(directory,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2022',lib:['ES2022','DOM'],module:'NodeNext',moduleResolution:'NodeNext',strict:true,skipLibCheck:true,noEmit:true,types:['node']},files:['consumer.ts']},null,2)+'\n');
  await run(process.execPath,['node_modules/typescript/bin/tsc','--project','tsconfig.json','--noEmit']);
  await fs.writeFile(path.join(directory,'imports.mjs'),'for (const name of '+JSON.stringify(ENTRYPOINTS)+') await import(name);\n');
  await run(process.execPath,['imports.mjs']);
  return {directory,run,installation:{source:registry?'npm-registry':'release-tarballs',registry:'https://registry.npmjs.org',npm_authentication_used:false,isolated_npm_config:true,fresh_npm_cache:true,packages:installed,isolated_from_workspace:true,workspace_symlinks_used:false,node_path_used:false,typescript_consumer_passed:true,typescript_version:'5.9.3',all_entrypoints_runtime_imported:true,entrypoints:ENTRYPOINTS}};
}

export async function saveConsumerReport(root,name,report,registry){
  const basename=registry?name.replace(/\.json$/,'-registry.json'):name;
  const file=path.join(root,'apps/web/public/data',basename),temporary=file+'.tmp';
  await fs.writeFile(temporary,JSON.stringify(report,null,2)+'\n');await fs.rename(temporary,file);
  return file;
}
