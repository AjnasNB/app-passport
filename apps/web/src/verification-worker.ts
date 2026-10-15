import type {TwoClientSession} from './two-client-model';

/** Isolate expensive historical signature checks; any timeout/error refuses. */
export type VerifiedPublishedSession={session:TwoClientSession;identities:{descriptor:string;policy:string}};
export function verifyPublishedSession(value:unknown,signal?:AbortSignal):Promise<VerifiedPublishedSession>{
 return new Promise((resolve,reject)=>{
  if(signal?.aborted){reject(new Error('Session verification cancelled'));return;}
  const worker=new Worker(new URL('./two-client-session.worker.ts',import.meta.url),{type:'module'});
  const finish=(error?:Error,verified?:VerifiedPublishedSession)=>{
   clearTimeout(timer);signal?.removeEventListener('abort',abort);worker.terminate();
   if(error)reject(error);else resolve(verified!);
  };
  const abort=()=>finish(new Error('Session verification cancelled'));
  const timer=setTimeout(()=>finish(new Error('Session verification deadline exceeded')),45000);
  signal?.addEventListener('abort',abort,{once:true});
  worker.onmessage=event=>event.data?.ok&&event.data.session&&/^sha256:[0-9a-f]{64}$/.test(event.data.identities?.descriptor)&&/^sha256:[0-9a-f]{64}$/.test(event.data.identities?.policy)?finish(undefined,{session:event.data.session,identities:event.data.identities}):finish(new Error('Signed session verification failed'));
  worker.onerror=event=>{event.preventDefault();finish(new Error('Session verifier unavailable'));};
  worker.onmessageerror=()=>finish(new Error('Session verifier returned an unreadable result'));
  try{worker.postMessage(value);}catch{finish(new Error('Session evidence could not be sent to the verifier'));}
 });
}
