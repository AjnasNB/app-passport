import fs from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {descriptorSchema,policySchema} from '../packages/sdk/src/index';
import {verifyQarinahHandoff} from '../packages/sdk/src/qarinah';
import {RPC} from '../packages/sdk/src/arkiv';
async function main(){
const {values}=parseArgs({options:{packet:{type:'string',default:'apps/web/public/data/handoff-packet.json'},descriptor:{type:'string',default:'apps/web/public/data/handoff-descriptor.json'},repository:{type:'string',default:'.local/context-fixture'}}});
const packet=JSON.parse(await fs.readFile(values.packet,'utf8')),descriptor=descriptorSchema.parse(JSON.parse(await fs.readFile(values.descriptor,'utf8'))),policy=policySchema.parse(JSON.parse(await fs.readFile('apps/web/public/data/policy.json','utf8')));
const headers=process.env.PASSPORT_ARKIV_KEY_FILE?{'X-API-KEY':(await fs.readFile(process.env.PASSPORT_ARKIV_KEY_FILE,'utf8')).trim()}:undefined;
const result=await verifyQarinahHandoff({packet,descriptor,repository:values.repository,connection:{policy,rpc:process.env.PASSPORT_READ_RPC||RPC,headers}});
const report={reader:'local-context-consumer',website_backend_used:false,context_delivered:result.context!==null,admission_status:result.admission.status,read_block:result.read_block,artifact_digest:descriptor.artifact_digest,current_source_files_checked:packet.repository.files.length,content_role:'untrusted-data',selected_event_count:packet.context.items.length,inference_run:false,note:'The example consumer receives an admitted context input. No second LLM run or independent organisation is claimed.'};
await fs.writeFile('apps/web/public/data/handoff-consumer.json',JSON.stringify(report,null,2)+'\n');
await fs.mkdir('.local/consumer',{recursive:true});if(result.context)await fs.writeFile('.local/consumer/context-input.json',JSON.stringify(result.context,null,2)+'\n');
console.log(JSON.stringify(report));if(!result.context)process.exitCode=2;
}
main().catch(()=>{console.error(JSON.stringify({status:'unavailable',context_delivered:false,error:'Context verification could not complete.'}));process.exitCode=1;});
