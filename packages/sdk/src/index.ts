import {sha256, stringToHex, verifyMessage, type Hex} from 'viem';
import {z} from 'zod';

z.config({jitless:true});
export const NAMESPACE='app-passport-v1';
export const digestSchema=z.string().regex(/^sha256:[0-9a-f]{64}$/);
const address=z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const https=z.string().url().max(1000).refine(s=>s.startsWith('https://'));
export const descriptorSchema=z.object({
  schema:z.literal('app-passport.descriptor.v1'),kind:z.enum(['tool','context']),
  name:z.string().min(1).max(120),version:z.string().min(1).max(100),artifact_digest:digestSchema,
  source_url:https,provenance:z.enum(['upstream-artifact-reference','publisher-attested','synthetic-fixture']),
  capabilities:z.array(z.string().min(1).max(100)).max(100),
  context:z.object({manifest_hash:digestSchema,repository_digest:digestSchema,compiler_version:z.string().max(100)}).strict().optional(),
}).strict().superRefine((v,c)=>{if(v.kind==='context'&&!v.context)c.addIssue({code:'custom',message:'Context identity is required'});if(v.kind==='tool'&&v.context)c.addIssue({code:'custom',message:'A tool cannot contain a context binding'});});
export type Descriptor=z.infer<typeof descriptorSchema>;
const common={schema:z.literal('app-passport.record.v1'),namespace:z.literal(NAMESPACE),issuer:address,
  artifact_digest:digestSchema,descriptor_digest:digestSchema,issued_at:z.iso.datetime(),valid_until:z.iso.datetime(),
  disclosure:z.enum(['public-artifact','synthetic-fixture'])};
const recordUnion=z.discriminatedUnion('kind',[
  z.object({...common,kind:z.literal('passport'),descriptor:descriptorSchema}).strict(),
  z.object({...common,kind:z.literal('review'),scope:z.literal('identity-and-protocol'),
    conclusion:z.enum(['requirements-satisfied','attention-required']),evidence_url:https,
    checks:z.array(z.object({name:z.string().min(1).max(100),passed:z.boolean(),detail:z.string().max(500)}).strict()).min(1).max(30)}).strict(),
  z.object({...common,kind:z.literal('withdrawal'),target_key:z.string().regex(/^0x[0-9a-fA-F]{64}$/),reason:z.string().min(1).max(500)}).strict(),
]);
export const recordSchema=recordUnion.superRefine((v,c)=>{
  if(Date.parse(v.valid_until)<=Date.parse(v.issued_at)||Date.parse(v.valid_until)-Date.parse(v.issued_at)>90*86400000)c.addIssue({code:'custom',message:'Validity must be positive and at most 90 days'});
  if(v.kind==='passport'&&(v.artifact_digest!==v.descriptor.artifact_digest||v.descriptor_digest!==digestJson(v.descriptor)))c.addIssue({code:'custom',message:'Descriptor binding mismatch'});
  if(v.kind==='review'&&v.conclusion==='requirements-satisfied'&&v.checks.some(x=>!x.passed))c.addIssue({code:'custom',message:'A failed check cannot satisfy a review'});
});
export type RecordPayload=z.infer<typeof recordSchema>;
export const envelopeSchema=z.object({payload:recordSchema,signature:z.string().regex(/^0x[0-9a-fA-F]{130}$/)}).strict();
export type Envelope=z.infer<typeof envelopeSchema>;
export const policySchema=z.object({issuers:z.array(address).min(1).max(20),reviewers:z.array(address).min(1).max(20),scope:z.literal('identity-and-protocol')}).strict();
export type Policy=z.infer<typeof policySchema>;
export interface VerifiedRecord {key:string;creator:string;owner:string;created_at_block:string;expires_at_block:string;envelope:Envelope;}
export interface Admission {status:'requirements-satisfied'|'unknown'|'expired'|'withdrawn'|'artifact-mismatch'|'stale-context'|'attention-required'|'unavailable';allowed:boolean;reason:string;records:VerifiedRecord[];}

/** Bounded canonical JSON. Accessors, cycles, prototypes and unsupported values are rejected. */
export function canonicalJson(value:unknown):string {
  let nodes=0;const seen=new Set<object>();
  function visit(v:unknown,depth:number):unknown {
    if(++nodes>50000||depth>40)throw new Error('JSON exceeds structural limits');
    if(v===null||typeof v==='string'||typeof v==='boolean')return v;
    if(typeof v==='number'&&Number.isFinite(v))return Object.is(v,-0)?0:v;
    if(typeof v!=='object'||!v)throw new Error('Only plain JSON values are allowed');
    if(seen.has(v))throw new Error('Cyclic references are not JSON');seen.add(v);
    const proto=Object.getPrototypeOf(v);
    if(!Array.isArray(v)&&proto!==Object.prototype&&proto!==null)throw new Error('Only plain records are allowed');
    const descriptors=Object.getOwnPropertyDescriptors(v);const out:Record<string,unknown>={};
    if(Array.isArray(v)){
      for(const k of Reflect.ownKeys(descriptors))if(typeof k!=='string'||(k!=='length'&&!/^(0|[1-9][0-9]*)$/.test(k)))throw new Error('Unsupported array property');
      const array=Array.from({length:v.length},(_,i)=>{const d=descriptors[String(i)];if(!d||!('value'in d))throw new Error('Sparse arrays and accessors are rejected');return visit(d.value,depth+1);});seen.delete(v);return array;
    }
    for(const key of Reflect.ownKeys(descriptors).sort()){
      if(typeof key!=='string'||['__proto__','prototype','constructor'].includes(key))throw new Error('Unsupported record key');
      const d=descriptors[key]!;if(!d.enumerable||!('value'in d)||d.value===undefined)throw new Error('Only enumerable data properties are allowed');
      Object.defineProperty(out,key,{value:visit(d.value,depth+1),enumerable:true});
    }seen.delete(v);return out;
  }
  const serialized=JSON.stringify(visit(value,0));if(new TextEncoder().encode(serialized).length>2*1024*1024)throw new Error('JSON exceeds two MiB');return serialized;
}
export function digestJson(value:unknown):string{return `sha256:${sha256(stringToHex(canonicalJson(value))).slice(2)}`;}
export function digestBytes(value:Uint8Array):string{return `sha256:${sha256(value).slice(2)}`;}
export function recordMessage(payload:RecordPayload):string{return `AppPassport signed record v1\n${canonicalJson(recordSchema.parse(payload))}`;}
export async function signRecord(payload:RecordPayload,signer:{address:string;signMessage(args:{message:string}):Promise<Hex>}):Promise<Envelope>{
  const parsed=recordSchema.parse(payload);if(parsed.issuer.toLowerCase()!==signer.address.toLowerCase())throw new Error('Issuer must be the signing account');
  return envelopeSchema.parse({payload:parsed,signature:await signer.signMessage({message:recordMessage(parsed)})});
}
export async function verifyEnvelope(value:unknown):Promise<Envelope|null>{
  try{canonicalJson(value);const e=envelopeSchema.parse(value);return await verifyMessage({address:e.payload.issuer as Hex,message:recordMessage(e.payload),signature:e.signature as Hex})?e:null;}catch{return null;}
}
export function repositoryDigest(proof:any):string{return digestJson(proof.repository.files.map((f:any)=>({path:f.path,contentHash:f.contentHash})).sort((a:any,b:any)=>a.path.localeCompare(b.path)));}
/** Browser-compatible identity checks matching Qarinah's published outer/nested manifest contract. */
export function validateContextPacket(proof:any):void{
  canonicalJson(proof);
  if(proof?.schemaVersion!=='qarinah.proof-context.v1'||!digestSchema.safeParse(proof.manifestHash).success||!Array.isArray(proof.repository?.files)||!Array.isArray(proof.context?.items))throw new Error('Unsupported Qarinah packet');
  const {manifestHash,...core}=proof;const {manifestHash:nested,...context}=proof.context;
  if(digestJson(core)!==manifestHash||digestJson(context)!==nested)throw new Error('Qarinah packet manifest does not match its contents');
  for(const file of proof.repository.files)if(!digestSchema.safeParse(file.contentHash).success)throw new Error('Invalid source identity');
}
export function contextDescriptor(proof:any,name='Qarinah handoff',version='1'):Descriptor{
  validateContextPacket(proof);return descriptorSchema.parse({schema:'app-passport.descriptor.v1',kind:'context',name,version,artifact_digest:digestJson(proof),
    source_url:'https://github.com/AjnasNB/qarinah',provenance:'synthetic-fixture',capabilities:['cited-context','source-identity','temporal-selection'],
    context:{manifest_hash:proof.manifestHash,repository_digest:repositoryDigest(proof),compiler_version:proof.producer?.version||proof.context?.producer?.version||'qarinah-0.6.0'}});
}
export async function evaluateAdmission(input:{descriptor:Descriptor;observedDigest:string;records:VerifiedRecord[];policy:Policy;now?:number;currentRepositoryDigest?:string;available?:boolean}):Promise<Admission>{
  const descriptor=descriptorSchema.parse(input.descriptor),policy=policySchema.parse(input.policy),now=input.now??Date.now();
  const answer=(status:Admission['status'],reason:string,records:VerifiedRecord[]=input.records):Admission=>({status,allowed:status==='requirements-satisfied',reason,records});
  if(input.available===false)return answer('unavailable','The current review could not be read. No admission decision is available.',[]);
  if(input.observedDigest!==descriptor.artifact_digest)return answer('artifact-mismatch','The supplied bytes do not match the passport.');
  if(descriptor.kind==='context'&&(!input.currentRepositoryDigest||input.currentRepositoryDigest!==descriptor.context!.repository_digest))return answer('stale-context','The packet is not bound to the current source snapshot.');
  const descriptorHash=digestJson(descriptor);
  const authenticated=[];for(const r of input.records){if(await verifyEnvelope(r.envelope))authenticated.push(r);}
  const relevant=authenticated.filter(r=>r.envelope.payload.artifact_digest===descriptor.artifact_digest&&r.envelope.payload.descriptor_digest===descriptorHash&&r.envelope.payload.issuer.toLowerCase()===r.creator.toLowerCase());
  const role=(r:VerifiedRecord)=>r.envelope.payload.kind==='passport'?policy.issuers:r.envelope.payload.kind==='review'?policy.reviewers:[...policy.issuers,...policy.reviewers];
  const trusted=relevant.filter(r=>role(r).some(a=>a.toLowerCase()===r.creator.toLowerCase()));
  const live=trusted.filter(r=>Date.parse(r.envelope.payload.valid_until)>now&&Date.parse(r.envelope.payload.issued_at)<=now+60000);
  const withdrawn=(target:VerifiedRecord)=>live.some(r=>r.envelope.payload.kind==='withdrawal'&&r.envelope.payload.target_key.toLowerCase()===target.key.toLowerCase()&&r.creator.toLowerCase()===target.creator.toLowerCase()&&BigInt(r.created_at_block)>=BigInt(target.created_at_block));
  const passports=live.filter(r=>r.envelope.payload.kind==='passport');const reviews=live.filter(r=>r.envelope.payload.kind==='review');
  const currentPassport=passports.find(r=>!withdrawn(r));const currentReviews=reviews.filter(r=>!withdrawn(r));
  if(currentReviews.some(r=>r.envelope.payload.kind==='review'&&r.envelope.payload.conclusion==='attention-required'))return answer('attention-required','An accepted reviewer reports a check requiring attention.',trusted);
  if(!currentPassport||!currentReviews.length){
    if((!currentPassport&&passports.some(withdrawn))||(!currentReviews.length&&reviews.some(withdrawn)))return answer('withdrawn','An accepted issuer withdrew the required passport or review.',trusted);
    const expired=trusted.some(r=>r.envelope.payload.kind!=='withdrawal'&&Date.parse(r.envelope.payload.valid_until)<=now);
    return expired?answer('expired','The required passport or review has expired. Renewal needs fresh evidence.',trusted):answer('unknown','An accepted current passport and review are both required.',trusted);
  }
  return answer('requirements-satisfied','Artifact identity and current review satisfy this policy. This is not a safety certification.',trusted);
}
