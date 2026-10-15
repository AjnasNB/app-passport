import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const releases=[['@ajnasnb/arkiv-graph','0.3.0','ajnasnb-arkiv-graph-0.3.0.tgz'],['@ajnasnb/ai-passport','0.5.0','ajnasnb-ai-passport-0.5.0.tgz']];
const results=[];
await fs.mkdir('.local/npm-release',{recursive:true});
for(const [name,version,file] of releases){
 const url='https://registry.npmjs.org/'+name;
 const response=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error('Published registry metadata unavailable');
 const packument=await response.json(),metadata=packument.versions?.[version];if(metadata?.name!==name||metadata?.version!==version)throw new Error('Expected npm release is not visible');
 const tarballURL=new URL(metadata.dist.tarball);if(tarballURL.origin!=='https://registry.npmjs.org')throw new Error('Unexpected tarball origin');
 const tarball=await fetch(tarballURL,{signal:AbortSignal.timeout(20000)});if(!tarball.ok)throw new Error('Registry tarball unavailable');
 const bytes=Buffer.from(await tarball.arrayBuffer()),integrity='sha512-'+createHash('sha512').update(bytes).digest('base64');
 const local=await fs.readFile('apps/web/public/downloads/'+file);
 if(integrity!==metadata.dist.integrity||!bytes.equals(local))throw new Error('Registry artifact differs from the reviewed tarball');
 let downloads={available:false,reason:'Registry statistics not yet available'};
 try{const r=await fetch('https://api.npmjs.org/downloads/point/last-week/'+name,{signal:AbortSignal.timeout(15000)});if(r.ok){const data=await r.json();if(Number.isInteger(data.downloads))downloads={available:true,downloads:data.downloads,start:data.start,end:data.end,period:'last-week',scope:'npm download events, including project verification installs. Not unique users, customers or independent adoption.'};}}catch{}
 results.push({name,version,published:true,registry_url:url+'/'+version,package_url:'https://www.npmjs.com/package/'+name,published_at:packument.time?.[version]??null,integrity,reviewed_tarball_match:true,bytes:bytes.length,provenance_attestation:metadata.dist.attestations?'registry-metadata-present':'not-claimed',downloads});
 if(name==='@ajnasnb/arkiv-graph')await fs.writeFile('.local/npm-release/registry-proof.json',JSON.stringify({...results.at(-1),checked_at:new Date().toISOString()},null,2)+'\n');
}
const report={checked_at:new Date().toISOString(),registry:'https://registry.npmjs.org',authentication_used_for_verification:false,packages:results,external_adoption_verified:false,scope:'Two public package releases and exact registry byte integrity; installs and downloads are not evidence of independent use.'};
await fs.writeFile('apps/web/public/data/npm-release.json',JSON.stringify(report,null,2)+'\n');
await fs.mkdir('.local/npm-release',{recursive:true});await fs.writeFile('.local/npm-release/registry-proof.json',JSON.stringify({...results[0],checked_at:report.checked_at},null,2)+'\n');
console.log(JSON.stringify(report));
