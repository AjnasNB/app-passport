import fs from 'node:fs/promises';
import {test,expect,type APIRequestContext} from '@playwright/test';
import {rootTrustScope,type RootTrustConfig} from '../../packages/arkiv-graph/src/root-update';

const config=JSON.parse(await fs.readFile('apps/web/public/data/root-trust-config.json','utf8')) as RootTrustConfig;
const storageKey='arkiv-graph:root-trust:'+rootTrustScope(config);
async function snapshot(request:APIRequestContext){const response=await request.get('/api/trust');expect(response.ok()).toBe(true);const value=await response.json();expect(value.schema).toBe('arkiv.graph-root-read.v1');return value;}
const verifyButton={name:'Verify live root updates',exact:true};

test('live root updates verify the published graph, reject local rollback/tampering and survive reload on mobile',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.setViewportSize({width:390,height:844});await page.goto('/?view=trust');
 await expect(page.getByRole('heading',{name:'A new root needs an authorized history.'})).toBeVisible();
 await page.getByRole('button',verifyButton).click();await expect(page.getByRole('heading',{name:'Revision 2 accepted'})).toBeVisible();
 await expect(page.locator('.trust-result')).toContainText('One configured operator');
 const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),storageKey);expect(saved.root.sequence).toBe(2);expect(BigInt(saved.rpc.block)).toBeGreaterThan(0n);
 await page.getByRole('button',{name:'Test an older signed revision'}).click();await expect(page.locator('.trust-rejected')).toContainText('Rollback rejected');
 await page.getByRole('button',{name:'Test a changed root'}).click();await expect(page.locator('.trust-rejected')).toContainText('Tampering rejected');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 // Reset scrolling before a full-document capture: off-viewport fixed skip links can otherwise
 // appear in the middle of Chrome's beyond-viewport screenshot even while hidden in the viewport.
 await page.evaluate(()=>window.scrollTo(0,0));await expect(page.getByRole('link',{name:'Skip to main content',exact:true})).not.toBeInViewport();
 await page.screenshot({path:'.local/screenshots/trust-mobile-live.png',fullPage:true});
 await page.reload();expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).root.revision_digest,storageKey)).toBe(saved.root.revision_digest);
 await page.getByRole('button',verifyButton).click();await expect(page.getByRole('heading',{name:'Revision 2 accepted'})).toBeVisible();
 const reloaded=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),storageKey);expect(reloaded.root.sequence).toBe(2);expect(BigInt(reloaded.rpc.block)).toBeGreaterThanOrEqual(BigInt(saved.rpc.block));expect(errors).toEqual([]);
});

test('root updates fail closed before acceptance if persistent storage cannot retain the checkpoint',async({page,request})=>{
 // Authentic live records are replayed locally; only the storage failure is simulated.
 const live=await snapshot(request);await page.route('**/api/trust',route=>route.fulfill({json:live}));
 await page.addInitScript(key=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(name,value){if(name===key)throw new DOMException('Synthetic storage quota failure','QuotaExceededError');return original.call(this,name,value);};},storageKey);
 await page.goto('/?view=trust');await page.getByRole('button',verifyButton).click();await expect(page.getByRole('alert')).toContainText('Verification refused');await expect(page.getByRole('heading',{name:'Revision 2 accepted'})).toHaveCount(0);
 expect(await page.evaluate(key=>localStorage.getItem(key),storageKey)).toBeNull();
});

test('malformed root history is refused without replacing saved bytes or querying the provider',async({page})=>{
 let requests=0;await page.route('**/api/trust',route=>{requests++;return route.fulfill({status:503,json:{error:'Unexpected request in malformed-state test'}});});
 const malformed=JSON.stringify({schema:'incorrect-checkpoint'});await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:storageKey,value:malformed});
 await page.goto('/?view=trust');await page.getByRole('button',verifyButton).click();await expect(page.getByRole('alert')).toContainText('Saved checkpoint is malformed');expect(requests).toBe(0);expect(await page.evaluate(key=>localStorage.getItem(key),storageKey)).toBe(malformed);
});

test('a browser without Web Locks refuses root updates before RPC or checkpoint writes',async({page})=>{
 let requests=0;await page.route('**/api/trust',route=>{requests++;return route.fulfill({status:503,json:{error:'Unexpected request without checkpoint lock'}});});
 await page.addInitScript(()=>Object.defineProperty(navigator,'locks',{configurable:true,value:undefined}));
 await page.goto('/?view=trust');await page.getByRole('button',verifyButton).click();await expect(page.getByRole('alert')).toContainText('cannot safely coordinate persistent checkpoints');expect(requests).toBe(0);expect(await page.evaluate(key=>localStorage.getItem(key),storageKey)).toBeNull();
});

test('a browser without Web Locks refuses a two-client task before its live RPC read',async({page})=>{
 let requests=0;await page.route('**/api/two-client/records?consumer=*',route=>{requests++;return route.fulfill({status:503,json:{error:'Unexpected unlocked consumer request'}});});
 await page.addInitScript(()=>Object.defineProperty(navigator,'locks',{configurable:true,value:undefined}));
 await page.goto('/two-client/');const client=page.locator('[data-consumer="A"]');await expect(client).toHaveAttribute('data-state','ready');await client.getByRole('button',{name:'Run client A'}).click();
 await expect(client).toHaveAttribute('data-state','unavailable');await expect(client).toContainText('Task did not run');expect(requests).toBe(0);
 expect(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('arkiv-graph:two-client:v1:')))).toEqual([]);
});

test('two tabs serialize root checkpoint reads and a queued older RPC snapshot cannot overwrite accepted history',async({context,request})=>{
 // This is a controlled browser-local rollback simulation using an authentic live head.
 const live=await snapshot(request),older=structuredClone(live);older.block=String(BigInt(live.block)-1n);older.graph.block=older.block;
 let requests=0,releaseFirst!:()=>void;const hold=new Promise<void>(resolve=>{releaseFirst=resolve;});
 await context.route('**/api/trust',async route=>{const ordinal=++requests;if(ordinal===1){await hold;return route.fulfill({json:live});}return route.fulfill({json:older});});
 const A=await context.newPage(),B=await context.newPage();await Promise.all([A.goto('/?view=trust'),B.goto('/?view=trust')]);
 try{
  await A.getByRole('button',verifyButton).click();await expect.poll(()=>requests).toBe(1);
  await B.getByRole('button',verifyButton).click();await expect(B.getByRole('button',{name:'Verifying current revisions…'})).toBeVisible();expect(requests).toBe(1);
  releaseFirst();await expect(A.getByRole('heading',{name:'Revision 2 accepted'})).toBeVisible();await expect(B.getByRole('alert')).toContainText('RPC block rollback');expect(requests).toBe(2);
  const saved=await B.evaluate(key=>JSON.parse(localStorage.getItem(key)!),storageKey);expect(saved.root.sequence).toBe(2);expect(saved.rpc.block).toBe(live.block);await expect(B.getByRole('heading',{name:'Revision 2 accepted'})).toHaveCount(0);
 }finally{releaseFirst();await A.close();await B.close();}
});
