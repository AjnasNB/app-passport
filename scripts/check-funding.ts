import fs from 'node:fs/promises';
import {operators} from './private-operator';
const o=await operators();await fs.mkdir('apps/web/public/data',{recursive:true});
await fs.writeFile('apps/web/public/data/policy.json',JSON.stringify(o.policy,null,2)+'\n');
console.log(JSON.stringify({network:'Tiramisu',producer:o.producer.address,reviewer:o.reviewer.address,producer_balance_wei:String(await o.reader.getBalance({address:o.producer.address})),roles:'Both demo roles are controlled by this project, not independent organisations.'}));
