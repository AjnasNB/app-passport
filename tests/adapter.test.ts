import fs from 'node:fs/promises';
import path from 'node:path';
import {describe,it,expect,beforeAll} from 'vitest';
import {currentSourceDigest,inspectQarinahPacket} from '../packages/sdk/src/qarinah';
import {repositoryDigest} from '../packages/sdk/src/index';
const root=path.resolve('.local/adapter-evaluation');let packet:any;
beforeAll(async()=>{packet=JSON.parse(await fs.readFile('apps/web/public/data/handoff-packet.json','utf8'));await fs.mkdir(path.join(root,'src'),{recursive:true});await fs.copyFile('apps/web/public/sources/release.ts',path.join(root,'src/release.ts'));});
describe('Qarinah source adapter',()=>{
 it('uses the original Qarinah validator',()=>expect(inspectQarinahPacket(packet).kind).toBe('context'));
 it('hashes actual selected files',async()=>expect(await currentSourceDigest(packet,root)).toBe(repositoryDigest(packet)));
 it('detects changed source bytes in an independent checkout',async()=>{const changed=path.resolve('.local/adapter-changed');await fs.mkdir(path.join(changed,'src'),{recursive:true});await fs.writeFile(path.join(changed,'src/release.ts'),'export const unreviewedChange=true;\n');expect(await currentSourceDigest(packet,changed)).not.toBe(repositoryDigest(packet));});
 it('does not substitute stored source hashes when a file disappears',async()=>{const missing=path.resolve('.local/adapter-empty');await fs.mkdir(missing,{recursive:true});await expect(currentSourceDigest(packet,missing)).rejects.toThrow();});
});
