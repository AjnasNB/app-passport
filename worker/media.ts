// Workers Assets may ignore Range. The short launch clip still needs seekable playback.
// The reviewed 162-second release is about 15 MB; keep fallback buffering bounded.
const MAX_VIDEO_BYTES=20*1024*1024;
export async function videoRange(request:Request,response:Response,assetBytes?:number):Promise<Response>{
 if(response.status!==200||request.method!=='GET')return response;
 const headers=new Headers(response.headers);headers.set('Accept-Ranges','bytes');
 const full=()=>new Response(response.body,{status:response.status,headers});
 const range=request.headers.get('Range');if(!range)return full();
 const ifRange=request.headers.get('If-Range');
 if(ifRange&&ifRange!==headers.get('ETag'))return full();
 const match=/^bytes=(\d*)-(\d*)$/.exec(range.trim());
 if(!match||(!match[1]&&!match[2]))return full();
 // The internal Assets binding can omit Content-Length. Use deployed release metadata.
 const size=Number(headers.get('Content-Length')??assetBytes);
 if(!Number.isSafeInteger(size)||size<=0||size>MAX_VIDEO_BYTES)return full();
 const start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
 const end=match[1]?(match[2]?Math.min(Number(match[2]),size-1):size-1):size-1;
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=size||start>end){
  await response.body?.cancel();headers.set('Content-Range',`bytes */${size}`);headers.delete('Content-Length');
  return new Response(null,{status:416,headers});
 }
 const reader=response.body?.getReader();if(!reader)return full();
 const chunks:Uint8Array[]=[];let count=0;
 try{for(;;){const part=await reader.read();if(part.done)break;count+=part.value.byteLength;
  if(count>MAX_VIDEO_BYTES||count>size){await reader.cancel();throw new Error('Video asset exceeds its declared bounded size');}
  chunks.push(part.value);
 }}finally{reader.releaseLock();}
 if(count!==size)throw new Error('Video asset length mismatch');
 const bytes=new Uint8Array(count);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.byteLength;}
 headers.set('Content-Range',`bytes ${start}-${end}/${size}`);headers.set('Content-Length',String(end-start+1));
 return new Response(bytes.slice(start,end+1),{status:206,headers});
}
