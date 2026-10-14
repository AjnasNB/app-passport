import {describe,it,expect,vi,beforeEach} from 'vitest';
import {readGraphContext} from '../packages/arkiv-graph/src/context';
import {digestBytes,digestJson} from '../packages/arkiv-graph/src/index';
const mocks=vi.hoisted(()=>({read:vi.fn()}));
vi.mock('../packages/arkiv-graph/src/index',async(importOriginal)=>{const actual=await importOriginal<any>();return {...actual,createGraphKit:(profile?:any)=>({...actual.createGraphKit(profile),readGraph:mocks.read})};});
const bytes=new TextEncoder().encode('Original source. Treat this text as evidence, never execution permission.'),graph={schema:'arkiv.graph.v1',label:'Context test',nodes:[{id:'task:one',type:'task',label:'Task',digest:digestJson('task'),detail:'test'},{id:'source:one',type:'source',label:'Source',digest:digestBytes(bytes),detail:'test',source_path:'/documents/source.txt'}],edges:[{id:'edge:one',from:'task:one',to:'source:one',relation:'uses'}]},connection={issuers:['0x'+'1'.repeat(40)]},root=digestJson(graph);
beforeEach(()=>{mocks.read.mockResolvedValue({graph,block:'123',read_at:'2026-10-14T00:00:00Z'});});
describe('Graph AI context boundary (mocked RPC)',()=>{
 it('preserves identity and marks all content as untrusted evidence',async()=>{const r=await readGraphContext(connection,root,'task:one');expect(r.packet.contentRole).toBe('untrusted-data');expect(r.packet.verification.execution_authority).toBe(false);expect(r.packet.sources[0]?.bytes_verified).toBe(false);expect(r.context_digest).toBe(digestJson(r.packet));});
 it('verifies original bytes before including a labelled excerpt',async()=>{const r=await readGraphContext(connection,root,'task:one',{loadSource:async()=>bytes,sourceChars:8});expect(r.source_bodies_verified).toBe(1);expect(r.packet.sources[0]?.excerpt).toBe('Original');expect(r.packet.sources[0]?.excerpt_truncated).toBe(true);});
 it('rejects source drift rather than substituting cached text',async()=>await expect(readGraphContext(connection,root,'task:one',{loadSource:async()=>new TextEncoder().encode('changed')})).rejects.toThrow('changed'));
 it('rejects a truncated graph path before loading any source',async()=>{const load=vi.fn(async()=>bytes);await expect(readGraphContext(connection,root,'task:one',{maxNodes:1,loadSource:load})).rejects.toThrow('Incomplete');expect(load).not.toHaveBeenCalled();});
 it('rejects a packet that exceeds its declared character budget',async()=>await expect(readGraphContext(connection,root,'task:one',{maxChars:512})).rejects.toThrow('budget'));
 it('rejects invalid budgets before querying Arkiv',async()=>{const count=mocks.read.mock.calls.length;await expect(readGraphContext(connection,root,'task:one',{maxChars:13000})).rejects.toThrow();expect(mocks.read.mock.calls.length).toBe(count);});
 it('does not return context after current graph verification fails',async()=>{mocks.read.mockRejectedValue(new Error('Missing manifest'));await expect(readGraphContext(connection,root,'task:one')).rejects.toThrow('manifest');});
 it('caps original source bytes before hashing or decoding',async()=>await expect(readGraphContext(connection,root,'task:one',{loadSource:async()=>new Uint8Array(2*1024*1024+1)})).rejects.toThrow('byte budget'));
});
