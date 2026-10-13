import {beforeAll,describe,it,expect} from 'vitest';
import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts';
import {str,u64,bytes32} from '@arkiv-network/sdk/attr';
import {canonicalJson,digestJson,descriptorSchema,signRecord,verifyEnvelope,evaluateAdmission,recordSchema,contextDescriptor,validateContextPacket,NAMESPACE,type RecordPayload,type VerifiedRecord} from '../packages/sdk/src/index';
import {decodeEntity,entityInput} from '../packages/sdk/src/arkiv';
import fs from 'node:fs/promises';

// Accounts are generated afresh for each test run. No signing key is persisted or funded.
const issuer=privateKeyToAccount(generatePrivateKey()),reviewer=privateKeyToAccount(generatePrivateKey()),stranger=privateKeyToAccount(generatePrivateKey());
const now=Date.now(),issued=new Date(now-1000).toISOString(),until=new Date(now+86400000).toISOString();
const descriptor=descriptorSchema.parse({schema:'app-passport.descriptor.v1',kind:'tool',name:'Synthetic artifact',version:'1',artifact_digest:'sha256:'+'a'.repeat(64),source_url:'https://example.com/artifact',provenance:'synthetic-fixture',capabilities:['read-fixture']});
const policy={issuers:[issuer.address],reviewers:[reviewer.address],scope:'identity-and-protocol' as const};
const common={schema:'app-passport.record.v1' as const,namespace:NAMESPACE,artifact_digest:descriptor.artifact_digest,descriptor_digest:digestJson(descriptor),issued_at:issued,valid_until:until,disclosure:'synthetic-fixture' as const};
let passport:VerifiedRecord,review:VerifiedRecord;
async function signed(kind:'passport'|'review',account=kind==='passport'?issuer:reviewer,patch:any={}){
 const payload:RecordPayload=recordSchema.parse({...common,issuer:account.address,kind,...(kind==='passport'?{descriptor}:{scope:'identity-and-protocol',conclusion:'requirements-satisfied',evidence_url:'https://example.com/test',checks:[{name:'controlled-protocol',passed:true,detail:'Synthetic test'}]}),...patch});
 return {key:'0x'+(kind==='passport'?'1':'2').repeat(64),creator:account.address,owner:account.address,created_at_block:'10',expires_at_block:'100',envelope:await signRecord(payload,account)};
}
beforeAll(async()=>{passport=await signed('passport');review=await signed('review');});
const admit=(records=[passport,review],patch:any={})=>evaluateAdmission({descriptor,observedDigest:descriptor.artifact_digest,policy,records,now,...patch});
function entity(r:VerifiedRecord){return {key:r.key,creator:r.creator,owner:r.owner,createdAt:10n,expiresAt:100n,creationFlags:{readonly:true},payload_json:r.envelope,attributes:{namespace:str(NAMESPACE),schema_version:u64(1),kind:str(r.envelope.payload.kind),artifact_hash:bytes32(('0x'+r.envelope.payload.artifact_digest.slice(7)) as any),descriptor_hash:bytes32(('0x'+r.envelope.payload.descriptor_digest.slice(7)) as any)}};}
describe('signed artifact and reviewer boundary',()=>{
 it('admits an exact artifact with accepted current passport and review',async()=>expect((await admit()).allowed).toBe(true));
 it('rejects changed artifact bytes',async()=>expect((await admit(undefined,{observedDigest:'sha256:'+'b'.repeat(64)})).status).toBe('artifact-mismatch'));
 it('requires a reviewer even when a passport exists',async()=>expect((await admit([passport])).status).toBe('unknown'));
 it('requires a passport even when a reviewer exists',async()=>expect((await admit([review])).status).toBe('unknown'));
 it('rejects a correctly signed but unaccepted publisher',async()=>expect((await admit([await signed('passport',stranger),review])).allowed).toBe(false));
 it('rejects a correctly signed but unaccepted reviewer',async()=>expect((await admit([passport,await signed('review',stranger)])).allowed).toBe(false));
 it('rejects a forged issuer label',async()=>{const e=structuredClone(review);e.envelope.payload.issuer=stranger.address;expect(await verifyEnvelope(e.envelope)).toBeNull();});
 it('rejects modified review evidence after signing',async()=>{const e=structuredClone(review);(e.envelope.payload as any).checks[0].passed=false;expect((await admit([passport,e])).allowed).toBe(false);});
 it('rejects unknown payload fields',async()=>{const e=structuredClone(passport.envelope);(e.payload as any).administrator_override=true;expect(await verifyEnvelope(e)).toBeNull();});
 it('rejects a copied signature from a different payload',async()=>{const e=structuredClone(review.envelope);e.signature=passport.envelope.signature;expect(await verifyEnvelope(e)).toBeNull();});
 it('expires a required review at its signed deadline',async()=>expect((await admit(undefined,{now:Date.parse(until)})).status).toBe('expired'));
 it('cannot create satisfied review containing a failed check',()=>expect(()=>recordSchema.parse({...review.envelope.payload,checks:[{name:'failed',passed:false,detail:'Failure'}]})).toThrow());
 it('reports an accepted negative review as requiring attention',async()=>expect((await admit([passport,await signed('review',reviewer,{conclusion:'attention-required',checks:[{name:'failure',passed:false,detail:'Failure'}]})])).status).toBe('attention-required'));
 it('fails closed when the provider is unavailable',async()=>expect((await admit(undefined,{available:false})).status).toBe('unavailable'));
 it('does not admit a future-dated review',async()=>expect((await admit([passport,await signed('review',reviewer,{issued_at:new Date(now+120000).toISOString()})])).allowed).toBe(false));
});
describe('withdrawals and chain metadata',()=>{
 async function withdrawal(account=reviewer,patch:any={}){return {key:'0x'+'3'.repeat(64),creator:account.address,owner:account.address,created_at_block:'11',expires_at_block:'100',envelope:await signRecord(recordSchema.parse({...common,issuer:account.address,kind:'withdrawal',target_key:review.key,reason:'Synthetic withdrawal',...patch}),account)};}
 it('applies an authentic same-author withdrawal',async()=>expect((await admit([passport,review,await withdrawal()])).status).toBe('withdrawn'));
 it('rejects another wallet trying to withdraw an accepted review',async()=>expect((await admit([passport,review,await withdrawal(stranger)])).allowed).toBe(true));
 it('does not withdraw a different target',async()=>expect((await admit([passport,review,await withdrawal(reviewer,{target_key:passport.key})])).allowed).toBe(true));
 it('does not apply a withdrawal older than its target',async()=>expect((await admit([passport,review,{...await withdrawal(),created_at_block:'9'}])).allowed).toBe(true));
 it('allows a fresh review after withdrawing a specific older review',async()=>{const fresh={...await signed('review'),key:'0x'+'4'.repeat(64),created_at_block:'12'};expect((await admit([passport,review,await withdrawal(),fresh])).allowed).toBe(true);});
 it('accepts readonly chain entity bound to the signed payload',async()=>expect(await decodeEntity(entity(passport),20n)).not.toBeNull());
 it('rejects mutable entities after ownership transfer',async()=>expect(await decodeEntity({...entity(passport),owner:stranger.address,creationFlags:{readonly:false}},20n)).toBeNull());
 it('rejects protocol creator mismatch',async()=>expect(await decodeEntity({...entity(passport),creator:stranger.address},20n)).toBeNull());
 it('rejects query attribute and payload disagreement',async()=>{const e=entity(passport);e.attributes.namespace=str('unrelated');expect(await decodeEntity(e,20n)).toBeNull();});
 it('rejects chain-expired records',async()=>expect(await decodeEntity(entity(passport),100n)).toBeNull());
 it('rejects storage that ends before signed validity',()=>expect(()=>entityInput(passport.envelope,1)).toThrow());
});
describe('Qarinah and bounded JSON',()=>{
 it('validates a genuine generated Qarinah packet',async()=>{const p=JSON.parse(await fs.readFile('apps/web/public/data/handoff-packet.json','utf8'));expect(()=>validateContextPacket(p)).not.toThrow();expect(contextDescriptor(p).kind).toBe('context');});
 it('rejects a changed Qarinah packet manifest',async()=>{const p=JSON.parse(await fs.readFile('apps/web/public/data/handoff-packet.json','utf8'));p.query+=' altered';expect(()=>validateContextPacket(p)).toThrow();});
 it('detects a changed repository snapshot before admission',async()=>{const p=JSON.parse(await fs.readFile('apps/web/public/data/handoff-packet.json','utf8'));const d=contextDescriptor(p);expect((await admit([],{descriptor:d,observedDigest:d.artifact_digest,currentRepositoryDigest:'sha256:'+'e'.repeat(64)})).status).toBe('stale-context');});
 it('rejects cyclic values',()=>{const a:any={};a.self=a;expect(()=>canonicalJson(a)).toThrow();});
 it('rejects accessors without invoking them',()=>{let invoked=false;const a=Object.defineProperty({},'secret',{enumerable:true,get(){invoked=true;return 'x';}});expect(()=>canonicalJson(a)).toThrow();expect(invoked).toBe(false);});
 it('rejects unsupported prototype instances',()=>expect(()=>canonicalJson(new Date())).toThrow());
 it('rejects over-deep input',()=>{let a:any={};for(let i=0;i<45;i++)a={a};expect(()=>canonicalJson(a)).toThrow();});
 it('rejects oversized input',()=>expect(()=>canonicalJson({a:'a'.repeat(2*1024*1024)})).toThrow());
});
