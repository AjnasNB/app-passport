import {z} from 'zod';
import {verifyMessage, type Hex} from 'viem';
import {canonicalJson, digestJson} from './canonical';

const digest=z.string().regex(/^sha256:[0-9a-f]{64}$/);
const address=z.string().regex(/^0x[0-9a-fA-F]{40}$/).transform(v=>v.toLowerCase());
const time=z.iso.datetime();
export const ROOT_UPDATE_DOMAIN='Arkiv Graph root revision v1';
/** Pinned out of band. A revision cannot replace its authority, profile, chain or policy. */
export const rootTrustConfigSchema=z.object({
  schema:z.literal('arkiv.graph-root-trust.v1'),
  chain_id:z.number().int().positive().safe(),
  registry_id:z.string().regex(/^[a-z0-9][a-z0-9:._-]{0,119}$/),
  profile:z.string().min(1).max(120),
  policy_digest:digest,
  genesis_root:digest,
  authority:address,
  max_revision_lifetime_seconds:z.number().int().min(60).max(30*86400),
}).strict();
export type RootTrustConfig=z.infer<typeof rootTrustConfigSchema>;
export const rootRevisionPayloadSchema=z.object({
  schema:z.literal('arkiv.graph-root-revision.v1'),scope_digest:digest,
  sequence:z.number().int().min(1).max(64),previous_revision_digest:digest,
  previous_root:digest,root:digest,issuer:address,issued_at:time,valid_until:time,
}).strict();
export type RootRevisionPayload=z.infer<typeof rootRevisionPayloadSchema>;
export const rootRevisionEnvelopeSchema=z.object({payload:rootRevisionPayloadSchema,signature:z.string().regex(/^0x[0-9a-fA-F]{130}$/)}).strict();
export type RootRevisionEnvelope=z.infer<typeof rootRevisionEnvelopeSchema>;
export const rootCheckpointSchema=z.object({
  schema:z.literal('arkiv.graph-root-checkpoint.v1'),scope_digest:digest,
  sequence:z.number().int().min(0).max(64),revision_digest:digest,root:digest,
  last_verified_at:time,
}).strict();
export type RootCheckpoint=z.infer<typeof rootCheckpointSchema>;

export function rootTrustScope(config:RootTrustConfig):string{return digestJson(rootTrustConfigSchema.parse(config));}
export function rootGenesisDigest(config:RootTrustConfig):string{return digestJson({schema:'arkiv.graph-root-genesis.v1',scope_digest:rootTrustScope(config)});}
export function rootRevisionMessage(payload:RootRevisionPayload):string{return `${ROOT_UPDATE_DOMAIN}\n${canonicalJson(rootRevisionPayloadSchema.parse(payload))}`;}
export async function signRootRevision(payload:RootRevisionPayload,signer:{address:string;signMessage(a:{message:string}):Promise<Hex>}):Promise<RootRevisionEnvelope>{
  canonicalJson(payload);const p=rootRevisionPayloadSchema.parse(payload);
  if(p.issuer!==signer.address.toLowerCase())throw new Error('Root revision signer mismatch');
  return {payload:p,signature:await signer.signMessage({message:rootRevisionMessage(p)})};
}
/**
 * Verifies the complete bounded revision chain from a pinned genesis, then checks a local
 * monotonic checkpoint. Store the returned checkpoint atomically only after graph verification.
 * The checkpoint is local state, not a remote proof; deleting it loses rollback history.
 * Signatures authenticate an authority's selected roots, not discovery of every newer revision.
 */
export async function verifyRootRevisions(input:{config:RootTrustConfig;revisions:unknown[];checkpoint?:RootCheckpoint;now?:number}):Promise<{root:string;checkpoint:RootCheckpoint;revisions:RootRevisionEnvelope[]}>{
  canonicalJson(input.config);canonicalJson(input.revisions);
  const config=rootTrustConfigSchema.parse(input.config),scope=rootTrustScope(config),now=input.now??Date.now();
  if(!Number.isFinite(now))throw new Error('Invalid verification clock');
  if(input.revisions.length>64)throw new Error('Root revision budget exceeded');
  if(input.checkpoint)canonicalJson(input.checkpoint);
  const checkpoint=input.checkpoint?rootCheckpointSchema.parse(input.checkpoint):undefined;
  if(checkpoint&&(checkpoint.scope_digest!==scope||Date.parse(checkpoint.last_verified_at)>now+30000))throw new Error('Root checkpoint scope or clock rollback');
  let root=config.genesis_root,previous=rootGenesisDigest(config),sequence=0,previousIssued=-Infinity,previousExpiry=Infinity;
  const accepted:RootRevisionEnvelope[]=[];
  for(const value of input.revisions){
    const envelope=rootRevisionEnvelopeSchema.parse(value),p=envelope.payload,issued=Date.parse(p.issued_at),expires=Date.parse(p.valid_until);
    if(p.scope_digest!==scope||p.issuer!==config.authority)throw new Error('Untrusted root revision scope or authority');
    if(p.sequence!==sequence+1||p.previous_revision_digest!==previous||p.previous_root!==root)throw new Error('Broken root revision chain');
    if(issued>now+30000||expires<=issued||expires-issued>config.max_revision_lifetime_seconds*1000||issued<previousIssued||issued>=previousExpiry)throw new Error('Invalid root revision validity');
    if(!await verifyMessage({address:config.authority as Hex,message:rootRevisionMessage(p),signature:envelope.signature as Hex}))throw new Error('Invalid root revision signature');
    root=p.root;previous=digestJson(envelope);sequence=p.sequence;previousIssued=issued;previousExpiry=expires;accepted.push(envelope);
  }
  if(sequence&&previousExpiry<=now)throw new Error('Root revision expired');
  if(checkpoint){
    if(sequence<checkpoint.sequence)throw new Error('Root revision rollback');
    const prior=checkpoint.sequence===0?{root:config.genesis_root,digest:rootGenesisDigest(config)}:{root:accepted[checkpoint.sequence-1]?.payload.root,digest:accepted[checkpoint.sequence-1]?digestJson(accepted[checkpoint.sequence-1]):undefined};
    if(prior.root!==checkpoint.root||prior.digest!==checkpoint.revision_digest)throw new Error('Root revision fork or checkpoint tampering');
  }
  return {root,revisions:accepted,checkpoint:{schema:'arkiv.graph-root-checkpoint.v1',scope_digest:scope,sequence,revision_digest:previous,root,last_verified_at:new Date(now).toISOString()}};
}
