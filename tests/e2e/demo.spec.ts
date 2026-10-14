import {test,expect} from '@playwright/test';
const check=async(page:any,title:string)=>{await page.getByRole('button',{name:'Verify context',exact:true}).click();await page.getByRole('button',{name:'Verify handoff',exact:true}).click();await expect(page.locator('.result h4')).toHaveText(title);};
test('live context admission, local tampering and source changes',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/app/');await check(page,'Requirements satisfied');await page.screenshot({path:'.local/screenshots/desktop.png',fullPage:true});
 await page.getByLabel('Compare with changed source').check();await check(page,'Source snapshot changed');await page.getByLabel('Compare with changed source').uncheck();await page.getByLabel('Modify the packet after publication').check();await check(page,'Artifact mismatch');
 await page.getByLabel('Modify the packet after publication').uncheck();await page.getByLabel('Context packet',{exact:true}).selectOption('withdrawn');await check(page,'Review withdrawn');await page.getByLabel('Context packet',{exact:true}).selectOption('expired');await check(page,'Review expired');
 expect(errors).toEqual([]);
});
test('uploaded files stay local and do not inherit an earlier approval',async({page})=>{
 const sent:string[]=[];page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))sent.push(r.url());});await page.goto('/app/');await check(page,'Requirements satisfied');
 await page.locator('.controls input[type=file]').setInputFiles({name:'not-a-packet.json',mimeType:'application/json',buffer:Buffer.from('{}')});await expect(page.locator('.result h4')).toHaveText('Lookup unavailable');await expect(page.locator('.decision')).not.toContainText('Admission permitted');
 await page.locator('.controls input[type=file]').setInputFiles({name:'null-packet.json',mimeType:'application/json',buffer:Buffer.from('null')});await expect(page.locator('.result h4')).toHaveText('Lookup unavailable');
 await page.locator('.controls input[type=file]').setInputFiles('apps/web/public/data/handoff-packet.json');await expect(page.locator('.result h4')).toHaveText('Requirements satisfied');
 expect(sent).toEqual([]);
});
test('real tool artifact, unknown replacement, SDK and evidence links',async({page})=>{
 await page.goto('/app/');await page.getByRole('button',{name:'Tool catalog',exact:true}).click();await expect(page.locator('.tool-item')).toHaveCount(10);await page.locator('.tool-item').filter({hasText:'MCP Memory'}).click();await page.getByRole('button',{name:'Verify reference artifact',exact:true}).click();await expect(page.locator('.result h4')).toHaveText('Requirements satisfied');
 await page.locator('.tool-detail input[type=file]').setInputFiles({name:'different-artifact.tgz',mimeType:'application/octet-stream',buffer:Buffer.from('modified artifact')});await expect(page.locator('.result h4')).toHaveText('Artifact mismatch');
 await expect(page.locator('.evidence summary')).toContainText('(2 records)');
 await page.getByRole('button',{name:'SDK',exact:true}).click();for(const path of ['/downloads/app-passport-sdk-0.2.1.tgz','/contracts/app-passport-envelope.schema.json','/data/handoff-consumer.json','/data/protocol-evaluation.json']){const r=await page.evaluate(async path=>{const response=await fetch(path);return {status:response.status,length:(await response.arrayBuffer()).byteLength};},path);expect(r.status).toBe(200);expect(r.length).toBeGreaterThan(100);}
});
test('provider outage removes an already displayed positive decision',async({page})=>{
 await page.goto('/app/');await check(page,'Requirements satisfied');await page.route('**/api/records',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Unavailable'})}));await page.getByRole('button',{name:'Refresh Arkiv records'}).click();await expect(page.locator('.result h4')).toHaveText('Lookup unavailable');await expect(page.getByRole('alert')).toContainText('unavailable');
 await page.unroute('**/api/records');await page.getByRole('button',{name:'Refresh Arkiv records'}).click();await expect(page.locator('.result h4')).toHaveText('Requirements satisfied');
});
test('fresh network reads reevaluate missing review status without a second user check',async({page})=>{
 await page.goto('/app/');await check(page,'Requirements satisfied');const data:any=await page.evaluate(async()=>(await fetch('/api/records')).json());data.records=[];await page.route('**/api/records',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)}));await page.getByRole('button',{name:'Refresh Arkiv records'}).click();await expect(page.locator('.result h4')).toHaveText('Review required');
});
test('mobile layout, theme persistence and read-only API',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/app/');await check(page,'Requirements satisfied');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.screenshot({path:'.local/screenshots/mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Switch to dark theme'}).click();await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await check(page,'Requirements satisfied');await page.screenshot({path:'.local/screenshots/dark.png',fullPage:true});
 const results=await page.evaluate(async()=>{const out=[];for(const [url,method] of [['/api/records','POST'],['/api/records?artifact=invalid','GET'],['/api/records?rpc=https://example.com','GET']])out.push((await fetch(url,{method})).status);out.push((await fetch('/')).headers.get('content-security-policy'));return out;});expect(results.slice(0,3)).toEqual([405,400,400]);expect(results[3]).toContain("script-src 'self'");
});
test('film plays and presentation/report downloads have the correct file formats',async({page})=>{
 await page.goto('/app/');await page.getByText('Watch the Arkiv Graph launch · 72 seconds',{exact:true}).click();const video=page.locator('video');await expect(video).toBeVisible();await video.evaluate(async(v:any)=>{v.muted=true;await v.play();});await expect.poll(()=>video.evaluate((v:any)=>v.currentTime)).toBeGreaterThan(0);await expect.poll(()=>video.evaluate((v:any)=>v.duration)).toBeGreaterThan(71);
 const files=await page.evaluate(async()=>{const out=[];for(const file of ['/downloads/arkiv-graph-pitch.pptx','/downloads/arkiv-graph-pitch.pdf','/downloads/arkiv-graph-sdk-0.2.0.tgz']){const r=await fetch(file);out.push({status:r.status,head:Array.from(new Uint8Array(await r.arrayBuffer()).slice(0,4))});}return out;});expect(files.map(f=>f.status)).toEqual([200,200,200]);expect(files[0].head.slice(0,2)).toEqual([80,75]);expect(files[1].head).toEqual([37,80,68,70]);expect(files[2].head.slice(0,2)).toEqual([31,139]);
});
