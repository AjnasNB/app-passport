import {DurableObject} from 'cloudflare:workers';
/** One small coordination object per UTC day. No prompt, IP, account or response is stored. */
export class AiBudget extends DurableObject {
 async fetch(request:Request){if(request.method!=='POST')return new Response('Method not allowed',{status:405});return this.ctx.storage.transaction(async txn=>{const used=await txn.get<number>('used')||0;if(used>=40)return new Response('Daily demo allowance reached',{status:429});await txn.put('used',used+1);await txn.setAlarm(Date.now()+2*86400000);return new Response(JSON.stringify({reserved:true,remaining:39-used}),{headers:{'content-type':'application/json'}});});}
 async alarm(){await this.ctx.storage.deleteAll();}
}
