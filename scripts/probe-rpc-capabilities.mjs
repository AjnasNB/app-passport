import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// This intentionally probes the documented anonymous public endpoint only.
// No environment variables, credentials, wallet or project API are used.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const endpoint='https://rpc.tiramisu.db-chain.testnet.arkiv.network';
const expectedChain=7738577n;
const observations=[];
let requestId=0;
async function rpc(method,params){
  const started=Date.now();
  const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},redirect:'error',signal:AbortSignal.timeout(15000),body:JSON.stringify({jsonrpc:'2.0',id:++requestId,method,params})});
  if(!response.ok)throw new Error(`${method}: HTTP ${response.status}`);
  const body=await response.json();
  if(body.jsonrpc!=='2.0'||body.id!==requestId)throw new Error(`${method}: invalid JSON-RPC response`);
  const observation={method,params,duration_ms:Date.now()-started,...(body.error?{error:{code:body.error.code,message:String(body.error.message).slice(0,300)}}:{result:body.result})};
  observations.push(observation);
  return body;
}

const chain=await rpc('eth_chainId',[]);
if(chain.error||BigInt(chain.result)!==expectedChain)throw new Error('Public endpoint returned an unexpected chain');
const timing=await rpc('arkiv_getBlockTiming',[]);
if(timing.error||!Number.isSafeInteger(timing.result?.current_block)||timing.result.current_block<1)throw new Error('Current block timing was not available');
const block=BigInt(timing.result.current_block);
const reader=JSON.parse(await fs.readFile(path.join(root,'apps/web/public/data/arkiv-graph-reader.json'),'utf8'));
const query=`namespace = str('arkiv-graph-v1') AND graph_hash = bytes32(0x${reader.graph_digest.slice(7)}) AND $creator = addr(${reader.issuers[0]})`;
const snapshot=await rpc('arkiv_query',[query,{atBlock:`0x${block.toString(16)}`,limit:'0x1',select:{key:true,creator:true}}]);
if(snapshot.error||BigInt(snapshot.result?.blockNumber??-1)!==block||!Array.isArray(snapshot.result?.data)||snapshot.result.data.length!==1)throw new Error('Explicit snapshot query did not return the requested block and one public graph record');
const proof=await rpc('eth_getProof',['0x0000000000000000000000000000000000000000',[],'latest']);
const stateProofAvailable=!proof.error&&Array.isArray(proof.result?.accountProof);
const report={
  schema:'arkiv-graph.rpc-capabilities.v1',evaluated_at:new Date().toISOString(),endpoint,chain_id:Number(expectedChain),anonymous:true,
  scope:'A project-run read-only capability probe of the single documented anonymous Tiramisu endpoint. It is not a provider quorum, state-proof verifier or completeness proof. A different endpoint or future deployment may expose different methods.',
  checks:[
    {name:'Expected Tiramisu chain',passed:true,observed:chain.result},
    {name:'Head timing is readable',passed:true,block:String(block)},
    {name:'Explicit atBlock query returns the requested snapshot',passed:true,block:String(block),records:snapshot.result.data.length},
    {name:'eth_getProof availability',available:stateProofAvailable,...(proof.error?{error:proof.error}:{}),note:stateProofAvailable?'The method is exposed. This probe does not verify its proofs or any query result.':'The endpoint did not expose an account-proof result. No independent state proof is checked by this project.'}
  ],
  trust_boundary:'Signatures and manifests bind returned content to an accepted author and root. Snapshot/freshness checks and retained client checkpoints mitigate inconsistent reads and rollback of previously observed state. They cannot establish that a fresh client received every current or historical matching record. No independently operated second provider was verified for the demo.',
  sources:[
    {url:'https://docs.arkiv.network/networks/tiramisu/',relevance:'Official chain ID and public HTTP/WebSocket endpoint.'},
    {url:'https://docs.arkiv.network/json-rpc/querying-data/',relevance:'atBlock query option and returned snapshot block number.'},
    {url:'https://docs.arkiv.network/typescript-sdk/querying-data/',relevance:'Pagination snapshot semantics and historical retained-range limits.'},
    {url:'https://docs.arkiv.network/start-here/access-keys/',relevance:'Access keys change quota on the same endpoint, not provider independence.'},
    {url:'https://github.com/Arkiv-Network/arkiv-op-reth/blob/develop/docs/3_query.md',relevance:'Lower-level development design describes eth_getProof/eth_getCode verification recipes; these are not implemented by this SDK or established by this capability probe.'}
  ],
  observations
};
await fs.writeFile(path.join(root,'apps/web/public/data/rpc-capabilities.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({chain_id:report.chain_id,snapshot_block:String(block),eth_getProof_available:stateProofAvailable,...(proof.error?{proof_error_code:proof.error.code}:{})}));
