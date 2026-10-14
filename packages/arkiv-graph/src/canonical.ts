import {sha256,stringToHex} from 'viem';
/** Bounded canonical JSON. Accessors, cycles, prototypes and unsupported values are rejected. */
export function canonicalJson(value:unknown):string {
  let nodes=0;const seen=new Set<object>();
  function visit(v:unknown,depth:number):unknown {
    if(++nodes>50000||depth>40)throw new Error('JSON exceeds structural limits');
    if(v===null||typeof v==='string'||typeof v==='boolean')return v;
    if(typeof v==='number'&&Number.isFinite(v))return Object.is(v,-0)?0:v;
    if(typeof v!=='object'||!v)throw new Error('Only plain JSON values are allowed');
    if(seen.has(v))throw new Error('Cyclic references are not JSON');seen.add(v);
    const proto=Object.getPrototypeOf(v);
    if(!Array.isArray(v)&&proto!==Object.prototype&&proto!==null)throw new Error('Only plain records are allowed');
    const descriptors=Object.getOwnPropertyDescriptors(v);const out:Record<string,unknown>={};
    if(Array.isArray(v)){
      for(const k of Reflect.ownKeys(descriptors))if(typeof k!=='string'||(k!=='length'&&!/^(0|[1-9][0-9]*)$/.test(k)))throw new Error('Unsupported array property');
      const array=Array.from({length:v.length},(_,i)=>{const d=descriptors[String(i)];if(!d||!('value'in d))throw new Error('Sparse arrays and accessors are rejected');return visit(d.value,depth+1);});seen.delete(v);return array;
    }
    for(const key of Reflect.ownKeys(descriptors).sort()){
      if(typeof key!=='string'||['__proto__','prototype','constructor'].includes(key))throw new Error('Unsupported record key');
      const d=descriptors[key]!;if(!d.enumerable||!('value'in d)||d.value===undefined)throw new Error('Only enumerable data properties are allowed');
      Object.defineProperty(out,key,{value:visit(d.value,depth+1),enumerable:true});
    }seen.delete(v);return out;
  }
  const serialized=JSON.stringify(visit(value,0));if(new TextEncoder().encode(serialized).length>2*1024*1024)throw new Error('JSON exceeds two MiB');return serialized;
}
export function digestJson(value:unknown):string{return `sha256:${sha256(stringToHex(canonicalJson(value))).slice(2)}`;}
export function digestBytes(value:Uint8Array):string{return `sha256:${sha256(value).slice(2)}`;}
