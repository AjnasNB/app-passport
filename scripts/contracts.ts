import fs from 'node:fs/promises';
import {z} from 'zod';
import {descriptorSchema,envelopeSchema,policySchema} from '../packages/sdk/src/index';
import {graphSchema,graphEnvelopeSchema} from '../packages/sdk/src/graph';
await fs.mkdir('apps/web/public/contracts',{recursive:true});await fs.mkdir('packages/sdk/schemas',{recursive:true});
for(const [name,schema] of [['descriptor',descriptorSchema],['envelope',envelopeSchema],['policy',policySchema],['graph',graphSchema],['graph-envelope',graphEnvelopeSchema]] as const){
 const json=JSON.stringify(z.toJSONSchema(schema,{target:'draft-2020-12'}),null,2)+'\n';
 await fs.writeFile(`apps/web/public/contracts/app-passport-${name}.schema.json`,json);await fs.writeFile(`packages/sdk/schemas/${name}.schema.json`,json);
}
console.log(JSON.stringify({contracts:5,validation:'Strict runtime validation additionally checks digest bindings and signed validity.'}));
