#!/usr/bin/env node
import fs from 'node:fs/promises';
import {parseArgs} from 'node:util';
import {descriptorSchema,evaluateAdmission,digestBytes,digestJson,policySchema} from './index';
import {readRecords,RPC} from './arkiv';
const {values}=parseArgs({options:{descriptor:{type:'string'},artifact:{type:'string'},policy:{type:'string'},rpc:{type:'string'},'repository-digest':{type:'string'},'key-file':{type:'string'}}});
try{
  if(!values.descriptor||!values.artifact||!values.policy)throw new Error('Usage: app-passport --descriptor file.json --artifact file --policy policy.json [--rpc URL] [--repository-digest sha256:...]');
  const descriptor=descriptorSchema.parse(JSON.parse(await fs.readFile(values.descriptor,'utf8'))),policy=policySchema.parse(JSON.parse(await fs.readFile(values.policy,'utf8')));
  const bytes=await fs.readFile(values.artifact);if(bytes.length>100*1024*1024)throw new Error('Artifact exceeds 100 MiB');
  const observedDigest=descriptor.kind==='context'?digestJson(JSON.parse(bytes.toString('utf8'))):digestBytes(bytes);
  const key=values['key-file']?(await fs.readFile(values['key-file'],'utf8')).trim():undefined;
  const read=await readRecords({rpc:values.rpc||RPC,policy,...(key?{headers:{'X-API-KEY':key}}:{})},descriptor.artifact_digest);
  const verdict=await evaluateAdmission({descriptor,observedDigest,records:read.records,policy,currentRepositoryDigest:values['repository-digest']});
  console.log(JSON.stringify({reader:'independent-cli',rpc_origin:new URL(values.rpc||RPC).origin,read_block:read.block,query:read.query,...verdict},null,2));process.exitCode=verdict.allowed?0:2;
}catch(error){console.error(JSON.stringify({status:'unavailable',allowed:false,error:error instanceof Error&&error.message.startsWith('Usage:')?error.message:'Verification could not complete.'}));process.exitCode=1;}
