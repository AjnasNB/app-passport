import {describe,it,expect} from 'vitest';
import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts';
import {graphSchema,graphPayloads,signGraph,assembleGraph,traverseGraph,verifyGraphEnvelope,type GraphRecord} from '../packages/sdk/src/graph';
import {digestJson} from '../packages/sdk/src/index';
import {testGuard,runGuard,indianNumber,safetyQuestions} from '../packages/sdk/src/tools';
const signer=privateKeyToAccount(generatePrivateKey()),other=privateKeyToAccount(generatePrivateKey());
const graph=graphSchema.parse({schema:'ai-passport.graph.v1',label:'Test graph',nodes:[{id:'app:a',type:'application',label:'Application',digest:digestJson('app'),detail:'test'},{id:'source:b',type:'source',label:'Source',digest:digestJson('source'),detail:'test',source_path:'/sources/test.ts'}],edges:[{id:'edge:a',from:'app:a',to:'source:b',relation:'uses'},{id:'edge:b',from:'source:b',to:'app:a',relation:'cites'}]});
async function records(){const now=Date.now(),payloads=graphPayloads(graph,signer.address,new Date(now-1000).toISOString(),new Date(now+60000).toISOString());const rows:GraphRecord[]=[];for(const [i,p] of payloads.entries())rows.push({key:'0x'+String(i+1).padStart(64,'0'),creator:signer.address,envelope:await signGraph(p,signer)});return rows;}
describe('Signed graph contract',()=>{
 it('assembles authentic complete members against a pinned root',async()=>expect(await assembleGraph(await records(),digestJson(graph),[signer.address])).toEqual(graph));
 it('rejects a missing node, edge or manifest',async()=>{for(const index of [0,2,4]){const rows=await records();rows.splice(index,1);await expect(assembleGraph(rows,digestJson(graph),[signer.address])).rejects.toThrow();}});
 it('rejects reused entity keys across different members',async()=>{const rows=await records();rows[1]!.key=rows[0]!.key;await expect(assembleGraph(rows,digestJson(graph),[signer.address])).rejects.toThrow();});
 it('rejects duplicate members',async()=>{const rows=await records();rows.push(rows[0]!);await expect(assembleGraph(rows,digestJson(graph),[signer.address])).rejects.toThrow();});
 it('rejects forged changed content',async()=>{const rows=await records();(rows[0]!.envelope.payload as any).node.label='Changed';expect(await verifyGraphEnvelope(rows[0]!.envelope)).toBeNull();await expect(assembleGraph(rows,digestJson(graph),[signer.address])).rejects.toThrow();});
 it('rejects an unaccepted signer or mismatched chain creator',async()=>{const rows=await records();await expect(assembleGraph(rows,digestJson(graph),[other.address])).rejects.toThrow();rows[0]!.creator=other.address;await expect(assembleGraph(rows,digestJson(graph),[signer.address])).rejects.toThrow();});
 it('rejects expired graph evidence',async()=>await expect(assembleGraph(await records(),digestJson(graph),[signer.address],Date.now()+120000)).rejects.toThrow());
 it('rejects a substituted graph root',async()=>await expect(assembleGraph(await records(),digestJson('wrong'),[signer.address])).rejects.toThrow());
 it('rejects dangling edges, duplicate IDs and source traversal',()=>{expect(()=>graphSchema.parse({...graph,edges:[{...graph.edges[0],to:'missing'}]})).toThrow();expect(()=>graphSchema.parse({...graph,nodes:[...graph.nodes,graph.nodes[0]]})).toThrow();expect(()=>graphSchema.parse({...graph,nodes:[{...graph.nodes[1],source_path:'/sources/../private'}]})).toThrow();});
 it('traverses cycles once and reports bounded incomplete traversal',()=>{expect(traverseGraph(graph,'app:a').nodes).toHaveLength(2);expect(traverseGraph(graph,'app:a',{maxNodes:1}).truncated).toBe(true);expect(traverseGraph(graph,'app:a',{depth:0}).truncated).toBe(true);expect(()=>traverseGraph(graph,'missing')).toThrow();expect(()=>traverseGraph(graph,'app:a',{depth:20})).toThrow();});
});
describe('Useful bounded tools',()=>{
 it('generates a release guard that passes six substantive boundaries',()=>{const r=testGuard({operation:'all',checks:['sha256-format','review-current']});expect(r.passed).toBe(true);expect(r.cases).toHaveLength(6);expect(r.code).toContain('64');});
 it('rejects model output omitting either required behavior',()=>{for(const checks of [['sha256-format'],['review-current']])expect(testGuard({operation:'all',checks}).passed).toBe(false);});
 it('does not execute arbitrary model code or unknown operations',()=>{for(const input of [{operation:'eval',code:'process.exit()'},{operation:'all',checks:['shell']},{operation:'all',checks:['review-current','review-current']}])expect(()=>runGuard(input,'sha256:',true)).toThrow();});
 it('calculates exact paise and Indian grouping without float accumulation',()=>{expect(indianNumber('1234567.89')).toEqual({formatted:'12,34,567.89',paise:'123456789',crore:'0.1235',lakh:'12.3457'});expect(indianNumber('0.01').paise).toBe('1');expect(indianNumber('999999999.99').paise).toBe('99999999999');});
 it('rejects malformed, negative or over-precision calculator inputs',()=>{for(const n of ['-1','1e9','0.001','NaN','1000000000','01','<script>'])expect(()=>indianNumber(n)).toThrow();});
 it('keeps safety questions connected to NPCI primary guidance',()=>{expect(safetyQuestions).toHaveLength(3);for(const q of safetyQuestions){expect(q.source).toMatch(/^https:\/\/www.npci.org.in\//);expect(q.choices[q.correct]).toBeTruthy();}});
});
