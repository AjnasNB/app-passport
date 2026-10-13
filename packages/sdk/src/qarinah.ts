import {validateProofContext} from 'qarinah';
import fs from 'node:fs/promises';
import path from 'node:path';
import {contextDescriptor,validateContextPacket,digestBytes,digestJson,repositoryDigest,evaluateAdmission,type Descriptor,type Policy} from './index';
import {readRecords,type Connection} from './arkiv';
export function inspectQarinahPacket(packet:unknown,name='Qarinah handoff',version='1'):Descriptor{
  validateProofContext(packet);validateContextPacket(packet);return contextDescriptor(packet,name,version);
}
export async function currentSourceDigest(packet:any,repository:string):Promise<string>{
 validateContextPacket(packet);const root=await fs.realpath(repository);const snapshot=structuredClone(packet);
 for(const file of snapshot.repository.files){
  if(typeof file.path!=='string'||path.isAbsolute(file.path)||/^[A-Za-z]:/.test(file.path))throw new Error('Source references must be relative');
  const resolved=await fs.realpath(path.resolve(root,file.path));const relative=path.relative(root,resolved);
  if(relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw new Error('Source reference escapes the selected repository');
  const stat=await fs.stat(resolved);if(!stat.isFile()||stat.size>2*1024*1024)throw new Error('Source reference exceeds the adapter boundary');
  file.contentHash=digestBytes(await fs.readFile(resolved));
 }
 return repositoryDigest(snapshot);
}
export async function verifyQarinahHandoff(input:{packet:unknown;descriptor:Descriptor;repository:string;connection:Connection}){
 inspectQarinahPacket(input.packet,input.descriptor.name,input.descriptor.version);
 const currentRepositoryDigest=await currentSourceDigest(input.packet,input.repository);
 const read=await readRecords(input.connection,input.descriptor.artifact_digest);
 const admission=await evaluateAdmission({descriptor:input.descriptor,observedDigest:digestJson(input.packet),currentRepositoryDigest,records:read.records,policy:input.connection.policy});
 return {admission,read_block:read.block,query:read.query,context:admission.allowed?{contentRole:'untrusted-data' as const,packet:input.packet}:null};
}
