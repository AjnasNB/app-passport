import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createGraphKit,digestJson,DEFAULT_RPC} from '@ajnasnb/arkiv-graph';
import {readRootRegistry,rootTrustConfigSchema,rootTrustScope,verifyRootRevisions,verifyRpcObservations} from '@ajnasnb/arkiv-graph/trust';

const root=process.argv[2],checks=[];
function assert(value){if(!value)throw new Error('Packaged trust consumer assertion failed');}
async function check(name,kind,run){await run();checks.push({name,passed:true,evidence_kind:kind});}
async function rejects(run){let refused=false;try{await run();}catch{refused=true;}assert(refused);}
const load=async name=>JSON.parse(await fs.readFile(path.join(root,'apps/web/public/data',name),'utf8'));
const config=rootTrustConfigSchema.parse(await load('root-trust-config.json'));
const graphPackage=JSON.parse(await fs.readFile('node_modules/@ajnasnb/arkiv-graph/package.json','utf8'));
const trustPath=path.resolve('node_modules/@ajnasnb/arkiv-graph/dist/trust.js');
const trustBytes=await fs.readFile(trustPath);
assert(graphPackage.version==='0.4.0');
const live=await readRootRegistry(config);
let checkpoint;
await check('Published /trust entry point performs live registry and graph verification','live-rpc',async()=>{
  assert(live.revisions.length===2&&live.root===digestJson(live.graph.graph)&&live.graph.block===live.block);
  const verified=await verifyRootRevisions({config,revisions:live.revisions});checkpoint=verified.checkpoint;assert(verified.root===live.root);
});
const graphRevisions=[];
await check('Installed graph reader verifies both published revisions at the registry snapshot','live-rpc',async()=>{
  for(const revision of live.revisions){const read=await createGraphKit().readGraph({rpc:DEFAULT_RPC,issuers:[config.authority],atBlock:BigInt(live.block)},revision.payload.root);assert(digestJson(read.graph)===revision.payload.root&&read.block===live.block);graphRevisions.push({sequence:revision.payload.sequence,root:revision.payload.root,block:read.block,nodes:read.graph.nodes.length,edges:read.graph.edges.length,entities:read.records.length});}
});
await check('Persisted checkpoint reload accepts the same authentic head','signed-public-evidence-replay',async()=>{
  await fs.writeFile('root-checkpoint.json',JSON.stringify(checkpoint));const saved=JSON.parse(await fs.readFile('root-checkpoint.json','utf8'));
  assert((await verifyRootRevisions({config,revisions:live.revisions,checkpoint:saved})).root===live.root);
});
await check('Published verifier rejects a hidden latest revision after checkpoint','signed-public-evidence-replay',()=>rejects(()=>verifyRootRevisions({config,revisions:live.revisions.slice(0,1),checkpoint})));
await check('Published verifier rejects tampered root bytes under the authentic signature','signed-public-evidence-replay',async()=>{
  const changed=structuredClone(live.revisions);changed[1].payload.root=digestJson('locally modified root');await rejects(()=>verifyRootRevisions({config,revisions:changed}));
});
await check('Published verifier rejects cross-chain, policy and registry substitutions','signed-public-evidence-replay',async()=>{
  for(const changed of [{chain_id:42},{policy_digest:digestJson('other policy')},{registry_id:'different:registry'}])await rejects(()=>verifyRootRevisions({config:{...config,...changed},revisions:live.revisions}));
});
await check('Published verifier refuses an expired signed head','signed-public-evidence-replay',()=>rejects(()=>verifyRootRevisions({config,revisions:live.revisions,now:Date.parse(live.revisions.at(-1).payload.valid_until)+1})));
await check('One actual RPC remains explicitly labeled as single-provider observation','live-rpc',()=>{
  const result=verifyRpcObservations({policy:{schema:'arkiv.graph-rpc-policy.v1',scope_digest:rootTrustScope(config),providers:[{id:'tiramisu-official',operator:'Arkiv official public RPC'}],minimum_operators:1,max_age_seconds:120},observations:[{provider_id:'tiramisu-official',scope_digest:rootTrustScope(config),block:live.block,block_time:live.block_time,read_at:live.read_at,value_digest:live.value_digest}]});
  assert(result.mode==='single-provider-observed'&&result.operators===1);
});
console.log(JSON.stringify({schema:'arkiv.graph-npm-trust-consumer.v1',checked_at:new Date().toISOString(),sdk_version:graphPackage.version,trust_entrypoint:'@ajnasnb/arkiv-graph/trust',trust_entrypoint_bytes:trustBytes.length,trust_entrypoint_sha256:createHash('sha256').update(trustBytes).digest('hex'),passed:checks.length,total:8,checks,live:{rpc:DEFAULT_RPC,chain_id:config.chain_id,registry_block:live.block,current_root:live.root,revisions:graphRevisions},bootstrap_config_source:'Reviewed public root-trust-config.json loaded as data; no source-workspace package imports.',website_backend_used:false,api_key_used:false,wallet_used:false,transactions_written:0,limitations:['One official public RPC; no independent-provider quorum or cryptographic non-omission proof.','Checkpoint tests deliberately replay, truncate or tamper actual signed public records locally; these injections are not additional live chain events.','Pinned authority/configuration remains an explicit consumer trust decision. Storage deletion loses local rollback history.']}));
