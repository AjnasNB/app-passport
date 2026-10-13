import fs from 'node:fs/promises';
import {readRecords,RPC} from '../packages/sdk/src/arkiv';
import {evaluateAdmission,descriptorSchema,policySchema,type Policy} from '../packages/sdk/src/index';
async function main(){
const policy=policySchema.parse(JSON.parse(await fs.readFile('apps/web/public/data/policy.json','utf8')));
const headers=process.env.PASSPORT_ARKIV_KEY_FILE?{'X-API-KEY':(await fs.readFile(process.env.PASSPORT_ARKIV_KEY_FILE,'utf8')).trim()}:undefined;
const read=await readRecords({policy,rpc:process.env.PASSPORT_READ_RPC||RPC,headers});
const tools=JSON.parse(await fs.readFile('apps/web/public/data/tools.json','utf8')),contexts=JSON.parse(await fs.readFile('apps/web/public/data/contexts.json','utf8'));
const results=[];
for(const item of [...tools,...contexts]){
 const d=descriptorSchema.parse(item.descriptor);const result=await evaluateAdmission({descriptor:d,observedDigest:d.artifact_digest,currentRepositoryDigest:d.context?.repository_digest,records:read.records,policy});
 const expected=item.id==='withdrawn'?'withdrawn':item.id==='expired'?'expired':'requirements-satisfied';
 results.push({id:item.id,expected,observed:result.status,passed:result.status===expected,entity_keys:result.records.map(r=>r.key)});
}
const report={verified_at:read.read_at,reader:'independent-sdk-direct-rpc',rpc_origin:new URL(process.env.PASSPORT_READ_RPC||RPC).origin,website_backend_used:false,provider_state_proofs_checked:false,query:read.query,block:read.block,records:read.records.length,results,passed:results.filter(r=>r.passed).length,total:results.length};
await fs.writeFile('apps/web/public/data/live-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({direct_rpc:true,records:read.records.length,passed:report.passed,total:report.total}));if(report.passed!==report.total)process.exitCode=1;
}
main().catch(error=>{console.error(JSON.stringify({status:'unavailable',error_type:error instanceof Error?error.name:'UnknownError'}));process.exitCode=1;});
