import fs from 'node:fs/promises';
import path from 'node:path';
import {cleanInstall} from './consumer-install.mjs';

const root=process.cwd();
const {directory,run,installation}=await cleanInstall({root,label:'arkiv-npm-trust-consumer',registry:true});
await fs.copyFile(path.join(root,'scripts/npm-trust-consumer.mjs'),path.join(directory,'check.mjs'));
const result=JSON.parse((await run(process.execPath,['check.mjs',root])).trim());
if(result.passed!==8||result.total!==8||result.sdk_version!=='0.4.1')throw new Error('Installed npm trust functionality did not pass every check');
const report={...result,installation,reproduce:'node scripts/verify-npm-trust-consumer.mjs'};
const destination=path.join(root,'apps/web/public/data/npm-trust-consumer.json');
await fs.writeFile(destination+'.tmp',JSON.stringify(report,null,2)+'\n');await fs.rename(destination+'.tmp',destination);
console.log(JSON.stringify(report));
