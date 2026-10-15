import {digestJson} from '@ajnasnb/ai-passport';
import {verifyTwoClientSession} from './two-client-model';

// Historical snapshots retain the exact verifier used by consumers. Running
// these signature checks off the UI thread does not weaken or cache admission.
self.onmessage=async(event:MessageEvent<unknown>)=>{
  try{const session=await verifyTwoClientSession(event.data);self.postMessage({ok:true,session,identities:{descriptor:digestJson(session.descriptor),policy:digestJson(session.policy)}});}
  catch{self.postMessage({ok:false});}
};
