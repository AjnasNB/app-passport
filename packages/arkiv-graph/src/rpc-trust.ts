import {z} from 'zod';
import {canonicalJson,digestJson} from './canonical';

const digest=z.string().regex(/^sha256:[0-9a-f]{64}$/),height=z.string().regex(/^(0|[1-9][0-9]{0,29})$/),time=z.iso.datetime();
export const rpcTrustPolicySchema=z.object({
  schema:z.literal('arkiv.graph-rpc-policy.v1'),scope_digest:digest,
  providers:z.array(z.object({id:z.string().min(1).max(100),operator:z.string().min(1).max(100)}).strict()).min(1).max(8),
  minimum_operators:z.number().int().min(1).max(8),max_age_seconds:z.number().int().min(1).max(600),
}).strict().superRefine((p,c)=>{
  if(new Set(p.providers.map(v=>v.id)).size!==p.providers.length)c.addIssue({code:'custom',message:'Duplicate provider identity'});
  if(new Set(p.providers.map(v=>v.operator)).size<p.minimum_operators)c.addIssue({code:'custom',message:'Insufficient configured independent operators'});
});
export type RpcTrustPolicy=z.infer<typeof rpcTrustPolicySchema>;
export const rpcObservationSchema=z.object({provider_id:z.string().min(1).max(100),scope_digest:digest,block:height,block_time:time,read_at:time,value_digest:digest}).strict();
export type RpcObservation=z.infer<typeof rpcObservationSchema>;
export const rpcCheckpointSchema=z.object({schema:z.literal('arkiv.graph-rpc-checkpoint.v1'),policy_digest:digest,block:height,value_digest:digest,last_verified_at:time}).strict();
export type RpcCheckpoint=z.infer<typeof rpcCheckpointSchema>;
/**
 * Compare results actually fetched by configured transports at ONE requested block. Provider and
 * operator labels are local configuration, not identities proven by RPC. Never count aliases or
 * two access keys to one operator as independent. A colluding quorum can still omit records.
 */
export function verifyRpcObservations(input:{policy:RpcTrustPolicy;observations:unknown[];checkpoint?:RpcCheckpoint;now?:number}){
  canonicalJson(input.policy);canonicalJson(input.observations);
  const policy=rpcTrustPolicySchema.parse(input.policy),policyDigest=digestJson(policy),now=input.now??Date.now();
  if(!Number.isFinite(now))throw new Error('Invalid verification clock');
  if(input.observations.length>8)throw new Error('RPC observation budget exceeded');
  const observations=input.observations.map(v=>rpcObservationSchema.parse(v));
  if(!observations.length)throw new Error('No RPC observations');
  const seen=new Set<string>(),operators=new Set<string>();
  const first=observations[0]!;
  for(const observation of observations){
    const provider=policy.providers.find(p=>p.id===observation.provider_id);
    if(!provider||seen.has(provider.id)||observation.scope_digest!==policy.scope_digest)throw new Error('Unknown, duplicate or cross-scope RPC observation');
    seen.add(provider.id);operators.add(provider.operator);
    const read=Date.parse(observation.read_at),blockTime=Date.parse(observation.block_time);
    if(read>now+30000||blockTime>now+30000||read<blockTime-30000||now-read>policy.max_age_seconds*1000||now-blockTime>policy.max_age_seconds*1000)throw new Error('RPC observation stale or future-dated');
    if(observation.block!==first.block||observation.value_digest!==first.value_digest||observation.block_time!==first.block_time)throw new Error('RPC providers disagree at the requested snapshot');
  }
  if(operators.size<policy.minimum_operators)throw new Error('RPC operator quorum unavailable');
  if(input.checkpoint)canonicalJson(input.checkpoint);
  const checkpoint=input.checkpoint?rpcCheckpointSchema.parse(input.checkpoint):undefined;
  if(checkpoint){
    if(checkpoint.policy_digest!==policyDigest||Date.parse(checkpoint.last_verified_at)>now+30000)throw new Error('RPC checkpoint policy or clock rollback');
    if(BigInt(first.block)<BigInt(checkpoint.block))throw new Error('RPC block rollback');
    if(first.block===checkpoint.block&&first.value_digest!==checkpoint.value_digest)throw new Error('RPC state changed at checkpointed block');
  }
  return {mode:operators.size>1?'configured-operator-cross-check' as const:'single-provider-observed' as const,operators:operators.size,block:first.block,value_digest:first.value_digest,checkpoint:{schema:'arkiv.graph-rpc-checkpoint.v1' as const,policy_digest:policyDigest,block:first.block,value_digest:first.value_digest,last_verified_at:new Date(now).toISOString()}};
}

export const withdrawalJournalSchema=z.object({schema:z.literal('arkiv.graph-withdrawal-journal.v1'),scope_digest:digest,evidence:z.array(z.unknown()).max(200)}).strict();
export type WithdrawalJournal=z.infer<typeof withdrawalJournalSchema>;
/**
 * Keep signed withdrawal evidence once observed. The application MUST revalidate every old/new
 * item with the supplied verifier (signature, exact artifact/policy, target and retention).
 * Unauthenticated items fail closed. Merge returned evidence into current admission inputs.
 * This prevents observed withdrawals disappearing on a later RPC response; it does not prove
 * an unseen withdrawal exists, and storage deletion/reset cannot be detected here.
 */
export async function mergeWithdrawalJournal<T>(input:{scope_digest:string;journal?:WithdrawalJournal;observed:T[];verify:(evidence:unknown)=>Promise<boolean>}):Promise<WithdrawalJournal>{
  digest.parse(input.scope_digest);canonicalJson(input.observed);
  const journal=input.journal?withdrawalJournalSchema.parse(input.journal):{schema:'arkiv.graph-withdrawal-journal.v1' as const,scope_digest:input.scope_digest,evidence:[]};
  if(journal.scope_digest!==input.scope_digest)throw new Error('Withdrawal journal scope mismatch');
  const evidence:unknown[]=[],seen=new Set<string>();
  for(const item of [...journal.evidence,...input.observed]){
    canonicalJson(item);
    if(!await input.verify(item))throw new Error('Invalid cached or observed withdrawal evidence');
    const identity=digestJson(item);if(!seen.has(identity)){seen.add(identity);evidence.push(item);}
    if(evidence.length>200)throw new Error('Withdrawal journal budget exceeded');
  }
  return {schema:'arkiv.graph-withdrawal-journal.v1',scope_digest:input.scope_digest,evidence};
}
