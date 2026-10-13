import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {initializeWorkspace,appendEvent,scanProjectStructure,buildProofContext,validateProofContext,buildDerivedState} from 'qarinah';
import {contextDescriptor,digestJson} from '../packages/sdk/src/index';

const root=process.cwd();const fixture=path.join(root,'.local','context-fixture');
await fs.mkdir(path.join(fixture,'src'),{recursive:true});await fs.mkdir('apps/web/public/data',{recursive:true});
await fs.writeFile(path.join(fixture,'src','release.ts'),'export function approveRelease(artifactDigest: string, reviewValid: boolean) { return artifactDigest.startsWith("sha256:") && reviewValid; }\n');
await fs.writeFile(path.join(fixture,'README.md'),'# Synthetic handoff fixture\nThis repository is generated for the AppPassport demonstration. It contains no real user or project data.\n');
try{await initializeWorkspace(fixture,{capture:'content'});}catch(error:any){if(error.code!=='WORKSPACE_EXISTS')throw error;}
if(!await fs.stat(path.join(fixture,'.git')).catch(()=>null)){
 execFileSync('git',['init','--quiet'],{cwd:fixture});execFileSync('git',['add','src/release.ts','README.md'],{cwd:fixture});execFileSync('git',['-c','user.name=Synthetic Fixture','-c','user.email=fixture@example.invalid','commit','--quiet','-m','Synthetic context fixture'],{cwd:fixture});
}
const scenarioVersion=path.join(fixture,'.local-scenario-v1');
if(!await fs.stat(scenarioVersion).catch(()=>null)){
 const old=await appendEvent({kind:'decision',title:'Approve release using artifact identity only',body:'Synthetic superseded decision: approveRelease originally checked only the artifact digest.',confidence:'claimed',disclosure:{classification:'public',scopes:[]}},{cwd:fixture,capture:'content'});
 await appendEvent({kind:'decision',title:'Approve release using artifact identity and current review',body:'Synthetic current decision: approveRelease requires the exact artifact digest and a current accepted review. Supersede the old identity-only decision.',confidence:'claimed',relations:[{type:'supersedes',target:old.eventId}],disclosure:{classification:'public',scopes:[]}},{cwd:fixture,capture:'content'});
 await fs.writeFile(scenarioVersion,'Generated synthetic events only.\n');
}
await scanProjectStructure({cwd:fixture});
if(process.env.PASSPORT_REBUILD_FIXTURES!=='1'&&await fs.stat('apps/web/public/data/contexts.json').catch(()=>null)){
 const existing=JSON.parse(await fs.readFile('apps/web/public/data/contexts.json','utf8'));
 for(const row of existing)validateProofContext(JSON.parse(await fs.readFile(path.join('apps/web/public',row.packet_url),'utf8')));
 console.log(JSON.stringify({published_packets_preserved:true,synthetic_source_recreated:true}));
 process.exit(0);
}
const generatedAt=new Date();
const base=await buildProofContext('approveRelease artifact identity current review',{cwd:fixture,maxTokens:4096,fileLimit:5,symbolLimit:20,factLimit:8,clock:()=>generatedAt});
validateProofContext(base);
const withdrawn=await buildProofContext('approveRelease artifact identity current review',{cwd:fixture,maxTokens:4096,fileLimit:5,symbolLimit:20,factLimit:8,clock:()=>new Date(generatedAt.getTime()+1000)});
validateProofContext(withdrawn);
const expired=await buildProofContext('approveRelease artifact identity current review',{cwd:fixture,maxTokens:4096,fileLimit:5,symbolLimit:20,factLimit:8,clock:()=>new Date(generatedAt.getTime()+2000)});
validateProofContext(expired);
const rows=[];
for(const [id,packet] of [['handoff',base],['withdrawn',withdrawn],['expired',expired]] as const){
 const descriptor=contextDescriptor(packet,`Qarinah ${id==='handoff'?'release handoff':id+' demonstration'}`,'1');
 await fs.writeFile(`apps/web/public/data/${id}-packet.json`,JSON.stringify(packet,null,2)+'\n');
 await fs.writeFile(`apps/web/public/data/${id}-descriptor.json`,JSON.stringify(descriptor,null,2)+'\n');
 rows.push({id,descriptor,packet_url:`/data/${id}-packet.json`,selected_events:packet.context.items.length,selected_files:packet.repository.files.length,excluded_superseded:packet.facts.excludedSources.length,budget:packet.budget});
}
await fs.writeFile('apps/web/public/data/contexts.json',JSON.stringify(rows,null,2)+'\n');
const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:fixture,encoding:'utf8'}).trim();
await fs.writeFile('apps/web/public/data/context-evaluation.json',JSON.stringify({generated_at:generatedAt.toISOString(),classification:'synthetic-fixture',qarinah_version:'0.6.0',original_source_commit:'1aa70228299de902d92fc97214766c0aea02be9d',synthetic_commit:commit,packet_count:rows.length,validations_passed:3,current_evidence_selected:base.context.items.length>0,superseded_evidence_excluded:base.facts.excludedSources.length>0,manifest_hash:base.manifestHash,repository_digest:rows[0]!.descriptor.context!.repository_digest,original_folders_modified:false},null,2)+'\n');
console.log(JSON.stringify({packet_count:rows.length,selected_events:base.context.items.length,selected_files:base.repository.files.length,excluded_superseded:base.facts.excludedSources.length,manifest:base.manifestHash}));
