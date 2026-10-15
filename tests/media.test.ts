import {describe,it,expect} from 'vitest';
import {videoRange} from '../worker/media';
const asset=()=>new Response(new Uint8Array([0,1,2,3,4,5,6,7,8,9]),{headers:{'Content-Length':'10','Content-Type':'video/mp4',ETag:'"revision-a"'}});
const request=(range?:string,ifRange?:string)=>new Request('https://example.com/media/arkiv-graph-launch.mp4',{headers:{...(range?{Range:range}:{}),...(ifRange?{'If-Range':ifRange}:{})}});
describe('seekable launch video',()=>{
 it('uses deployment metadata when the internal asset response omits Content-Length',async()=>{
  const r=await videoRange(request('bytes=1-2'),new Response(new Uint8Array([0,1,2,3])),4);expect(r.status).toBe(206);expect(r.headers.get('content-range')).toBe('bytes 1-2/4');expect([...new Uint8Array(await r.arrayBuffer())]).toEqual([1,2]);
 });
 it('fails if the complete asset differs from the declared release length',async()=>{
  await expect(videoRange(request('bytes=1-2'),new Response(new Uint8Array([0,1,2,3])),5)).rejects.toThrow('length mismatch');
  const oversized=await videoRange(request('bytes=1-2'),new Response(new Uint8Array([0,1,2,3])),9*1024*1024+1);expect(oversized.status).toBe(200);expect((await oversized.arrayBuffer()).byteLength).toBe(4);
 });
 it('serves the exact requested middle bytes with their complete-file offsets',async()=>{
  const r=await videoRange(request('bytes=3-6'),asset());expect(r.status).toBe(206);expect(r.headers.get('content-range')).toBe('bytes 3-6/10');expect([...new Uint8Array(await r.arrayBuffer())]).toEqual([3,4,5,6]);
 });
 it('supports open-ended and suffix requests used during forward and backward seeking',async()=>{
  for(const range of ['bytes=7-','bytes=-3']){const r=await videoRange(request(range),asset());expect(r.status).toBe(206);expect(r.headers.get('content-range')).toBe('bytes 7-9/10');expect([...new Uint8Array(await r.arrayBuffer())]).toEqual([7,8,9]);}
 });
 it('rejects unsatisfiable requests without returning the full asset as a partial response',async()=>{
  for(const range of ['bytes=10-','bytes=7-3','bytes=-0']){const r=await videoRange(request(range),asset());expect(r.status).toBe(416);expect(r.headers.get('content-range')).toBe('bytes */10');expect((await r.arrayBuffer()).byteLength).toBe(0);}
 });
 it('returns the whole current revision when If-Range names an older revision',async()=>{
  const r=await videoRange(request('bytes=3-6','"revision-old"'),asset());expect(r.status).toBe(200);expect((await r.arrayBuffer()).byteLength).toBe(10);
 });
 it('ignores malformed or multipart range headers and keeps ordinary playback intact',async()=>{
  for(const range of [undefined,'garbage','bytes=0-1,3-4']){const r=await videoRange(request(range),asset());expect(r.status).toBe(200);expect(r.headers.get('accept-ranges')).toBe('bytes');expect((await r.arrayBuffer()).byteLength).toBe(10);}
 });
});
