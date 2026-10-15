import {afterEach,describe,it,expect,vi} from 'vitest';
import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts';
import {stringToHex,type Hex} from 'viem';
import {createGraphKit,AI_PASSPORT_PROFILE,digestJson,canonicalJson,type GraphRecord,type EvidenceGraph} from '../packages/arkiv-graph/src/index';
import {canonicalJson as passportCanonical} from '../packages/sdk/src/index';
const account=privateKeyToAccount(generatePrivateKey()),other=privateKeyToAccount(generatePrivateKey()),kit=createGraphKit();
const equipment=kit.graphSchema.parse({schema:'arkiv.graph.v1',label:'Equipment example',nodes:[{id:'asset:pump',type:'equipment',label:'Pump',digest:digestJson('public synthetic serial'),detail:'Synthetic equipment fixture'},{id:'check:one',type:'inspection',label:'Inspection',digest:digestJson({checked:true}),detail:'Synthetic inspection'}],edges:[{id:'link:check',from:'asset:pump',to:'check:one',relation:'inspected-by'}]});
async function rows(graph=equipment){const now=Date.now();return Promise.all(kit.graphPayloads(graph,account.address,new Date(now-1000).toISOString(),new Date(now+60000).toISOString()).map(async(p,i)=>({key:'0x'+String(i+1).padStart(64,'0'),creator:account.address,envelope:await kit.signGraph(p,account)})));}

// Exercise the actual installed SDK's expression rendering, HTTP transport, entity decoder and
// cursor handling. Only the remote JSON-RPC endpoint is simulated; no network calls are made.
type RpcEntity={key:string;creator:string;payload:Hex;creationFlags:number;attributes:{name:string;type:string;value:unknown}[]};
type QueryOptions={cursor?:string;limit:string;select:Record<string,boolean>};
function rpcEntity(row:GraphRecord):RpcEntity {
 const input=kit.graphEntityInput(row.envelope);
 return {key:row.key,creator:row.creator,payload:stringToHex(JSON.stringify(row.envelope)),creationFlags:1,attributes:Object.entries(input.attributes).map(([name,attr])=>({name,type:attr.type,value:typeof attr.value==='bigint'?`0x${attr.value.toString(16)}`:attr.value}))};
}
function mockRpc(queryPage:(query:string,options:QueryOptions)=>{data:RpcEntity[];cursor?:string}){
 const queries:{query:string;options:QueryOptions}[]=[];
 const fetch=vi.fn(async(input:string|URL|Request,init?:RequestInit)=>{
  const request=JSON.parse(typeof init?.body==='string'?init.body:await (input as Request).text());
  let result:unknown;
  if(request.method==='arkiv_getBlockTiming')result={current_block:'0x64',current_block_time:Date.now(),duration:2000};
  else if(request.method==='arkiv_query'){
   const [query,options]=request.params as [string,QueryOptions];queries.push({query,options});result={...queryPage(query,options),blockNumber:'0x64'};
  }else throw new Error(`Unexpected RPC method ${request.method}`);
  return new Response(JSON.stringify({jsonrpc:'2.0',id:request.id,result}),{headers:{'content-type':'application/json'}});
 });
 vi.stubGlobal('fetch',fetch);
 return {fetch,queries};
}
function pageOf(entities:RpcEntity[],options:QueryOptions){const offset=Number(options.cursor??0),limit=Number(BigInt(options.limit)),end=offset+limit;return {data:entities.slice(offset,end),...(end<entities.length?{cursor:String(end)}:{})};}
const connection={rpc:'https://arkiv.invalid',issuers:[account.address]};
afterEach(()=>vi.unstubAllGlobals());
describe('Reusable Arkiv Graph infrastructure',()=>{
 it('supports a non-AI domain with custom node types and relations',async()=>{expect(await kit.assembleGraph(await rows(),digestJson(equipment),[account.address])).toEqual(equipment);expect(kit.traverseGraph(equipment,'asset:pump').nodes.map(n=>n.type)).toEqual(['equipment','inspection']);});
 it('requires the manifest-listed inspection instead of returning a partial graph',async()=>{const r=await rows();r.splice(1,1);await expect(kit.assembleGraph(r,digestJson(equipment),[account.address])).rejects.toThrow();});
 it('keeps application signature domains isolated',async()=>{const r=await rows();expect(await createGraphKit(AI_PASSPORT_PROFILE).verifyGraphEnvelope(r[0]!.envelope)).toBeNull();});
 it('rejects replay under a changed custom signing domain',async()=>{const r=await rows();expect(await createGraphKit({...kit.profile,signatureDomain:'A different application'}).verifyGraphEnvelope(r[0]!.envelope)).toBeNull();});
 it('preserves canonical hashes across the existing application adapter',()=>{for(const value of [{a:1,b:['x',true]},equipment,{zero:-0}])expect(canonicalJson(value)).toBe(passportCanonical(value));});
 it('binds entity indexes to the configured graph profile and relation',async()=>{const r=await rows(),input=kit.graphEntityInput(r[2]!.envelope);expect(input.attributes.namespace!.value).toBe('arkiv-graph-v1');expect(input.attributes.relation!.value).toBe('inspected-by');expect(input.flags.readonly).toBe(true);});
 it('rejects invalid node taxonomies, traversal paths and repeated identities',()=>{for(const node of [{...equipment.nodes[0],type:'../private'},{...equipment.nodes[0],source_path:'/documents/../secret'}])expect(()=>kit.graphSchema.parse({...equipment,nodes:[node]})).toThrow();expect(()=>kit.graphSchema.parse({...equipment,nodes:[...equipment.nodes,equipment.nodes[0]]})).toThrow();});
 it('validates positive expiry before producing signed record inputs',()=>{expect(()=>kit.graphPayloads(equipment,account.address,'2026-10-14T00:00:00.000Z','2026-10-13T00:00:00.000Z')).toThrow();});
 it('retains fixed generic and AI Passport roots, signing domains and pre-change signatures',async()=>{
  const issuer='0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf';
  const vectors=[{profile:undefined,type:'equipment',root:'sha256:1bc1012110fbeb3d3d491addb6ccb792e67d3b5ad8fc45ea0e6ad8c9e6eb9e6e',signature:'0x0a36972c8485fd71d25b0b833dbcb5e41960c0a65ce2e2f9f89fb3dba5f1f94d4d7968fce2006765822069309947df723ff10fdc5510278afa517699d589d12f1c'},
   {profile:AI_PASSPORT_PROFILE,type:'source',root:'sha256:6e5306dfbdedd486bf3c1fffcf076a9475cda6a617da7fc052924d15aea3f787',signature:'0x4ec4defee24d6d95a358807d1fc0966e94494eca0d786dd955f98ee7a03fc0f86dc03516605489b29a033583cf451cf5f8217a31c92b87fd1171e96e439464d51c'}];
  for(const vector of vectors){const compatible=createGraphKit(vector.profile),graph=compatible.graphSchema.parse({schema:compatible.profile.graphSchema,label:'Compatibility vector',nodes:[{id:'source:one',type:vector.type,label:'Fixed source',digest:digestJson('fixed public fixture'),detail:'Synthetic compatibility vector'}],edges:[]});expect(digestJson(graph)).toBe(vector.root);const payload=compatible.graphPayloads(graph,issuer,'2026-10-14T00:00:00.000Z','2026-10-15T00:00:00.000Z').at(-1)!;expect(await compatible.verifyGraphEnvelope({payload,signature:vector.signature})).toEqual({payload,signature:vector.signature});}
 });
});

describe('Bounded independent Arkiv reader',()=>{
 it('excludes 900 untrusted entities copying the namespace, root and signed payload before pagination',async()=>{
  const trusted=(await rows()).map(rpcEntity),injected=Array.from({length:900},(_,i)=>({...trusted[i%trusted.length]!,key:`0x${(i+1000).toString(16).padStart(64,'0')}`,creator:other.address}));
  const all=[...injected,...trusted],rpc=mockRpc((query,options)=>{
   const creators=[...query.matchAll(/\$creator = addr\((0x[0-9a-fA-F]{40})\)/g)].map(match=>match[1]!.toLowerCase());
   return pageOf(creators.length?all.filter(entity=>creators.includes(entity.creator.toLowerCase())):all,options);
  });
  const result=await kit.readGraph(connection,digestJson(equipment));
  expect(result.graph).toEqual(equipment);expect(result.records).toHaveLength(4);expect(rpc.queries).toHaveLength(1);
  const {query,options}=rpc.queries[0]!;expect(query).toContain(`$creator = addr(${account.address})`);expect(query).toContain("namespace = str('arkiv-graph-v1')");expect(query).toContain(`graph_hash = bytes32(0x${digestJson(equipment).slice(7)})`);expect(query).toContain('schema_version = u64(1)');expect(query).toContain('$expiresAt > u64(100)');expect(options.limit).toBe('0x64');expect(Object.fromEntries(Object.entries(options.select).filter(([,enabled])=>enabled))).toEqual({key:true,creator:true,payload:true,attributes:true,creationFlags:true});
 });
 it('combines accepted creators with OR, deduplicates address casing and accepts a graph split across issuers',async()=>{
  const signed=await rows(),first=signed[0]!;first.creator=other.address;first.envelope=await kit.signGraph({...first.envelope.payload,issuer:other.address},other);
  const entities=signed.map(rpcEntity),rpc=mockRpc((_query,options)=>pageOf(entities,options));
  const result=await kit.readGraph({...connection,issuers:[account.address,account.address.toLowerCase(),other.address]},digestJson(equipment));
  expect(result.graph).toEqual(equipment);expect(rpc.queries[0]!.query).toContain(`($creator = addr(${account.address}) OR $creator = addr(${other.address}))`);expect(rpc.queries[0]!.query.match(/\$creator =/g)).toHaveLength(2);
 });
 it('still checks creator locally when the RPC returns records outside its creator predicate',async()=>{
  const trusted=(await rows()).map(rpcEntity),injected=trusted.map(entity=>({...entity,creator:other.address}));
  mockRpc(()=>({data:injected}));await expect(kit.readGraph(connection,digestJson(equipment))).rejects.toThrow('manifest');
  mockRpc(()=>({data:[...injected,...trusted]}));expect((await kit.readGraph(connection,digestJson(equipment))).records).toHaveLength(trusted.length);
 });
 it.each(['mutable entity','creator/issuer mismatch','invalid signature','wrong indexed namespace','wrong indexed root','wrong indexed kind','wrong indexed member','missing member','duplicate manifest','unlisted signed member'])('fails closed for %s even after a creator-filtered query',async scenario=>{
  const signed=await rows(),entities=signed.map(rpcEntity);
  if(scenario==='mutable entity')entities[0]!.creationFlags=0;
  if(scenario==='creator/issuer mismatch'){const payload={...signed[0]!.envelope.payload,issuer:other.address};signed[0]!.envelope=await kit.signGraph(payload,other);entities[0]=rpcEntity(signed[0]!);}
  if(scenario==='invalid signature'){const envelope=structuredClone(signed[0]!.envelope);if(envelope.payload.kind==='node')envelope.payload.node.label='Changed after signing';entities[0]!.payload=stringToHex(JSON.stringify(envelope));}
  const wrongAttribute={'wrong indexed namespace':['namespace','other-namespace'],'wrong indexed root':['graph_hash',`0x${'f'.repeat(64)}`],'wrong indexed kind':['kind','edge'],'wrong indexed member':['node_id','different:id']}[scenario];
  if(wrongAttribute)entities[0]!.attributes.find(attr=>attr.name===wrongAttribute[0])!.value=wrongAttribute[1];
  if(scenario==='missing member')entities.splice(0,1);
  if(scenario==='duplicate manifest')entities.push({...entities.at(-1)!,key:`0x${'f'.repeat(64)}`});
  if(scenario==='unlisted signed member'){const extra=structuredClone(signed[0]!);extra.key=`0x${'f'.repeat(64)}`;if(extra.envelope.payload.kind==='node')extra.envelope.payload.node.id='extra:unlisted';extra.envelope=await kit.signGraph(extra.envelope.payload,account);entities.push(rpcEntity(extra));}
  mockRpc(()=>({data:entities}));await expect(kit.readGraph(connection,digestJson(equipment))).rejects.toThrow();
 });
 it('stops at eight pages even when a trusted publisher floods the root',async()=>{
  const rpc=mockRpc((_query,options)=>({data:[],cursor:String(Number(options.cursor??0)+1)}));
  await expect(kit.readGraph(connection,digestJson(equipment))).rejects.toThrow('Graph page budget exceeded');expect(rpc.queries).toHaveLength(8);
 });
 it('reads the maximum supported graph (200 nodes, 500 edges, 701 signed entities) in eight bounded pages',async()=>{
  const graph=syntheticGraph(200,500),entities=(await rows(graph)).map(rpcEntity),rpc=mockRpc((_query,options)=>pageOf(entities,options));
  const result=await kit.readGraph(connection,digestJson(graph));expect(result.graph).toEqual(graph);expect(result.records).toHaveLength(701);expect(rpc.queries).toHaveLength(8);expect(result.block).toBe('100');expect(rpc.queries.map(page=>page.options.cursor)).toEqual([undefined,'100','200','300','400','500','600','700']);
 },20000);
 it.each([{name:'empty',issuers:[]},{name:'malformed',issuers:['invalid']},{name:'too many',issuers:Array(21).fill(account.address)}])('rejects $name issuer budgets before any HTTP call',async({issuers})=>{const rpc=mockRpc(()=>({data:[]}));await expect(kit.readGraph({...connection,issuers},digestJson(equipment))).rejects.toThrow();expect(rpc.fetch).not.toHaveBeenCalled();});
});

function syntheticGraph(count:number,edgeCount:number):EvidenceGraph {
 const nodes=Array.from({length:count},(_,i)=>({id:`node:${i}`,type:'fixture',label:`Node ${i}`,digest:digestJson(i),detail:'Synthetic traversal test'}));
 const edges=Array.from({length:edgeCount},(_,i)=>({id:`edge:${i}`,from:`node:${i<count-1?Math.floor(i/2):i%count}`,to:`node:${i<count-1?i+1:(i*7+1)%count}`,relation:'links'}));
 return kit.graphSchema.parse({schema:'arkiv.graph.v1',label:'Synthetic bounded graph',nodes,edges});
}

describe('Indexed traversal behavior',()=>{
 // This retained edge-scanning implementation is a test oracle for the old public semantics.
 function scanTraversal(graph:EvidenceGraph,start:string,depth:number,maxNodes:number){const visited=new Set([start]),queue=[{id:start,level:0}],edges:EvidenceGraph['edges']=[];let truncated=false;for(let i=0;i<queue.length;i++){const q=queue[i]!;if(q.level>=depth){if(graph.edges.some(e=>e.from===q.id&&!visited.has(e.to)))truncated=true;continue;}for(const edge of graph.edges.filter(e=>e.from===q.id)){if(!visited.has(edge.to)){if(visited.size>=maxNodes){truncated=true;continue;}visited.add(edge.to);queue.push({id:edge.to,level:q.level+1});}edges.push(edge);}}return {nodes:graph.nodes.filter(node=>visited.has(node.id)),edges,truncated};}
 it('preserves node order, edge order, cycles and truncation against the original scanner',()=>{
  for(const count of [20,100,200]){const graph=syntheticGraph(count,Math.min(500,count*3));for(const depth of [0,1,4,8])for(const maxNodes of [1,10,count])for(const start of ['node:0',`node:${count-1}`])expect(kit.traverseGraph(graph,start,{depth,maxNodes})).toEqual(scanTraversal(graph,start,depth,maxNodes));}
 });
 it('reports a completed traversal at exact node/depth limits and truncates only when an undiscovered target remains',()=>{
  expect(kit.traverseGraph(equipment,'asset:pump',{depth:1,maxNodes:2}).truncated).toBe(false);
  expect(kit.traverseGraph(equipment,'asset:pump',{depth:0,maxNodes:2}).truncated).toBe(true);
  expect(kit.traverseGraph(equipment,'asset:pump',{depth:1,maxNodes:1}).truncated).toBe(true);
  const cycle={...equipment,edges:[...equipment.edges,{id:'edge:cycle',from:'check:one',to:'asset:pump',relation:'links'}]};expect(kit.traverseGraph(cycle,'asset:pump',{depth:1,maxNodes:2}).truncated).toBe(false);
 });
 it('retains traversal budgets and the schema graph-size limits',()=>{
  for(const options of [{depth:-1},{depth:9},{depth:1.5},{maxNodes:0},{maxNodes:201},{maxNodes:NaN}])expect(()=>kit.traverseGraph(equipment,'asset:pump',options)).toThrow('budget');expect(()=>syntheticGraph(201,0)).toThrow();expect(()=>syntheticGraph(200,501)).toThrow();
 });
});
