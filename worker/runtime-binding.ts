import {z} from 'zod';
import {digestJson} from '../packages/sdk/src/index';
import type {EvidenceGraph} from '../packages/sdk/src/graph';

export const modelDeclarationSchema=z.object({
 provider:z.literal('cloudflare-workers-ai'),
 model:z.literal('@cf/meta/llama-3.2-3b-instruct'),
 node_id:z.literal('model:llama'),
}).strict();
export const MODEL_DECLARATION=Object.freeze(modelDeclarationSchema.parse({provider:'cloudflare-workers-ai',model:'@cf/meta/llama-3.2-3b-instruct',node_id:'model:llama'}));

/** Compatibility encoding used by build-ai-fixtures.ts for the existing signed node.
 * The provider declaration is drift protection, not attestation of hosted weights.
 */
export function modelDeclarationIdentity(value:unknown){
 const declaration=modelDeclarationSchema.parse(value);
 return {id:declaration.node_id,label:'Llama 3.2 · 3B',detail:`Cloudflare-hosted alias ${declaration.model}. We cannot hash or attest the hosted model weights. Provider identity is declared, not independently verified.`};
}

/** readGraph authenticates graph membership; this checks the application's required semantics. */
export function assertRuntimeBinding(graph:Pick<EvidenceGraph,'nodes'|'edges'>,task:'coding'|'numbers'|'safety',configuredModel:string,runtimeDigest:string){
 const declaration=MODEL_DECLARATION,identity=modelDeclarationIdentity(declaration),modelDigest=digestJson(identity),taskId='app:'+task;
 const hasUse=(to:string)=>graph.edges.some(edge=>edge.from===taskId&&edge.to===to&&edge.relation==='uses');
 if(!graph.nodes.some(node=>node.id===taskId&&node.type==='application'))throw new Error('TASK_APPLICATION_BINDING_MISSING');
 if(configuredModel!==declaration.model)throw new Error('MODEL_CONFIGURATION_MISMATCH');
 if(!hasUse(declaration.node_id))throw new Error('TASK_MODEL_RELATION_MISSING');
 if(!hasUse('tool:runtime'))throw new Error('TASK_RUNTIME_RELATION_MISSING');
 const model=graph.nodes.find(node=>node.id===declaration.node_id);
 if(!model||model.type!=='model'||model.digest!==modelDigest||digestJson({id:model.id,label:model.label,detail:model.detail})!==modelDigest)throw new Error('SIGNED_MODEL_DECLARATION_MISMATCH');
 const runtime=graph.nodes.find(node=>node.id==='tool:runtime');
 if(!runtime||runtime.type!=='tool'||runtime.source_path!=='/sources/tools.ts'||runtime.digest!==runtimeDigest)throw new Error('SIGNED_RUNTIME_DECLARATION_MISMATCH');
 return {...declaration,digest:modelDigest,runtime_node_id:runtime.id,runtime_digest:runtimeDigest};
}
