/** Compatibility adapter: preserves existing AI Passport signatures and graph roots. */
import {createGraphKit,AI_PASSPORT_PROFILE} from '@ajnasnb/arkiv-graph';
import type {Policy} from './index';
import type {z} from 'zod';
const kit=createGraphKit(AI_PASSPORT_PROFILE);
export const GRAPH_NAMESPACE=AI_PASSPORT_PROFILE.namespace;
export const {graphNodeSchema,graphEdgeSchema,graphSchema,graphPayloadSchema,graphEnvelopeSchema,graphMessage,signGraph,verifyGraphEnvelope,graphPayloads,graphEntityInput,assembleGraph,traverseGraph}=kit;
export type EvidenceGraph=z.infer<typeof graphSchema>;
export type GraphNode=z.infer<typeof graphNodeSchema>;
export type GraphPayload=z.infer<typeof graphPayloadSchema>;
export type GraphEnvelope=z.infer<typeof graphEnvelopeSchema>;
export type GraphRecord={key:string;creator:string;envelope:GraphEnvelope};
export function readGraph(c:{rpc?:string;headers?:Record<string,string>;policy:Policy;atBlock?:bigint},graphDigest:string){return kit.readGraph({rpc:c.rpc,headers:c.headers,issuers:c.policy.issuers,atBlock:c.atBlock},graphDigest);}
