import {describe,it,expect} from 'vitest';
import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts';
import {createGraphKit,AI_PASSPORT_PROFILE,digestJson,canonicalJson} from '../packages/arkiv-graph/src/index';
import {canonicalJson as passportCanonical} from '../packages/sdk/src/index';
const account=privateKeyToAccount(generatePrivateKey()),kit=createGraphKit();
const equipment=kit.graphSchema.parse({schema:'arkiv.graph.v1',label:'Equipment example',nodes:[{id:'asset:pump',type:'equipment',label:'Pump',digest:digestJson('public synthetic serial'),detail:'Synthetic equipment fixture'},{id:'check:one',type:'inspection',label:'Inspection',digest:digestJson({checked:true}),detail:'Synthetic inspection'}],edges:[{id:'link:check',from:'asset:pump',to:'check:one',relation:'inspected-by'}]});
async function rows(){const now=Date.now();return Promise.all(kit.graphPayloads(equipment,account.address,new Date(now-1000).toISOString(),new Date(now+60000).toISOString()).map(async(p,i)=>({key:'0x'+String(i+1).padStart(64,'0'),creator:account.address,envelope:await kit.signGraph(p,account)})));}
describe('Reusable Arkiv Graph infrastructure',()=>{
 it('supports a non-AI domain with custom node types and relations',async()=>{expect(await kit.assembleGraph(await rows(),digestJson(equipment),[account.address])).toEqual(equipment);expect(kit.traverseGraph(equipment,'asset:pump').nodes.map(n=>n.type)).toEqual(['equipment','inspection']);});
 it('requires the manifest-listed inspection instead of returning a partial graph',async()=>{const r=await rows();r.splice(1,1);await expect(kit.assembleGraph(r,digestJson(equipment),[account.address])).rejects.toThrow();});
 it('keeps application signature domains isolated',async()=>{const r=await rows();expect(await createGraphKit(AI_PASSPORT_PROFILE).verifyGraphEnvelope(r[0]!.envelope)).toBeNull();});
 it('rejects replay under a changed custom signing domain',async()=>{const r=await rows();expect(await createGraphKit({...kit.profile,signatureDomain:'A different application'}).verifyGraphEnvelope(r[0]!.envelope)).toBeNull();});
 it('preserves canonical hashes across the existing application adapter',()=>{for(const value of [{a:1,b:['x',true]},equipment,{zero:-0}])expect(canonicalJson(value)).toBe(passportCanonical(value));});
 it('binds entity indexes to the configured graph profile and relation',async()=>{const r=await rows(),input=kit.graphEntityInput(r[2]!.envelope);expect(input.attributes.namespace!.value).toBe('arkiv-graph-v1');expect(input.attributes.relation!.value).toBe('inspected-by');expect(input.flags.readonly).toBe(true);});
 it('rejects invalid node taxonomies, traversal paths and repeated identities',()=>{for(const node of [{...equipment.nodes[0],type:'../private'},{...equipment.nodes[0],source_path:'/documents/../secret'}])expect(()=>kit.graphSchema.parse({...equipment,nodes:[node]})).toThrow();expect(()=>kit.graphSchema.parse({...equipment,nodes:[...equipment.nodes,equipment.nodes[0]]})).toThrow();});
 it('validates positive expiry before producing signed record inputs',()=>{expect(()=>kit.graphPayloads(equipment,account.address,'2026-10-14T00:00:00.000Z','2026-10-13T00:00:00.000Z')).toThrow();});
});
