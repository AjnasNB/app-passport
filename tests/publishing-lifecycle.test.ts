import {beforeEach, describe, expect, it, vi} from 'vitest';
import {generatePrivateKey, privateKeyToAccount} from 'viem/accounts';
const calls=vi.hoisted(()=>({getEntity:vi.fn(),createEntity:vi.fn()}));
vi.mock('@arkiv-network/sdk',async importOriginal=>({...await importOriginal<typeof import('@arkiv-network/sdk')>(),
 createPublicClient:()=>({getEntity:calls.getEntity,getBlockTiming:async()=>({currentBlock:100n})}),
 createWalletClient:()=>({createEntity:calls.createEntity}),
}));
import {digestJson,recordSchema,signRecord,descriptorSchema} from '../packages/sdk/src/index';
import {entityInput,publishEnvelope} from '../packages/sdk/src/arkiv';

const account=privateKeyToAccount(generatePrivateKey()),other=privateKeyToAccount(generatePrivateKey());
const targetKey=('0x'+'a'.repeat(64)) as `0x${string}`;
const descriptor=descriptorSchema.parse({schema:'app-passport.descriptor.v1',kind:'tool',name:'Retention fixture',version:'1',artifact_digest:'sha256:'+'b'.repeat(64),source_url:'https://example.com/synthetic',provenance:'synthetic-fixture',capabilities:[]});
const connection={policy:{issuers:[account.address],reviewers:[account.address],scope:'identity-and-protocol' as const}};
beforeEach(()=>{vi.clearAllMocks();calls.createEntity.mockResolvedValue({entityKey:'0x'+'c'.repeat(64),txHash:'0x'+'d'.repeat(64)});});
async function fixture(){
 const now=Date.now(),base={schema:'app-passport.record.v1',namespace:'app-passport-v1',issuer:account.address,artifact_digest:descriptor.artifact_digest,descriptor_digest:digestJson(descriptor),issued_at:new Date(now-1000).toISOString(),valid_until:new Date(now+3600000).toISOString(),disclosure:'synthetic-fixture'};
 const target=await signRecord(recordSchema.parse({...base,kind:'review',scope:'identity-and-protocol',conclusion:'requirements-satisfied',evidence_url:'https://example.com/synthetic',checks:[{name:'fixture',passed:true,detail:'Synthetic.'}]}),account);
 const attributes=entityInput(target).attributes;
 calls.getEntity.mockResolvedValue({key:targetKey,creator:account.address,owner:account.address,createdAt:50n,expiresAt:9000000n,creationFlags:{readonly:true},attributes,toJson:()=>target});
 const withdrawal=await signRecord(recordSchema.parse({...base,kind:'withdrawal',target_key:targetKey,reason:'Synthetic retention test'}),account);
 return {withdrawal,target};
}
describe('withdrawal publication covers target retention',()=>{
 it('uses the observed extended target block plus a relative lifetime floor',async()=>{const {withdrawal}=await fixture();await publishEnvelope(connection,account,withdrawal);const input=calls.createEntity.mock.calls[0]![0];expect(input.expires.expiresAt).toBe(9000000n);expect(input.expires.minLifetime).toBeGreaterThan(0n);expect(input.flags.readonly).toBe(true);});
 it('rejects insufficient signed coverage before broadcasting',async()=>{const {withdrawal}=await fixture();const short=await signRecord({...withdrawal.payload,valid_until:new Date(Date.now()+60000).toISOString()},account);await expect(publishEnvelope(connection,account,short)).rejects.toThrow('cover target validity');expect(calls.createEntity).not.toHaveBeenCalled();});
 it('rejects a different transaction author before any provider write',async()=>{const {withdrawal}=await fixture();await expect(publishEnvelope(connection,other,withdrawal)).rejects.toThrow('authentic envelope');expect(calls.createEntity).not.toHaveBeenCalled();});
});
