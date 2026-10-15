import fs from 'node:fs/promises';
import path from 'node:path';
import {cleanInstall} from './consumer-install.mjs';

// This gate uses public npm, an empty npm configuration and a new OS-temp consumer.
const root=process.cwd();
const {directory,run,installation}=await cleanInstall({root,label:'arkiv-backend-independence',registry:true});
await fs.copyFile(path.join(root,'scripts/backend-independence-consumer.mjs'),path.join(directory,'check.mjs'));
const result=JSON.parse((await run(process.execPath,['check.mjs',root])).trim());
if(result.passed!==7||result.total!==7)throw new Error('Backend independence checks did not all pass');
const report={...result,installation};
const file=path.join(root,'apps/web/public/data/backend-independence.json');
await fs.writeFile(file+'.tmp',JSON.stringify(report,null,2)+'\n');
await fs.rename(file+'.tmp',file);
console.log(JSON.stringify(report));
