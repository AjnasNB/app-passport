import {test,expect} from '@playwright/test';

test('infrastructure overview, graph datasets and architecture are usable',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 await expect(page.getByRole('heading',{name:'Graphs built for AI context.'})).toBeVisible();
 await page.getByRole('button',{name:'Evidence graph',exact:true}).click();await expect(page.locator('.graph-node')).toHaveCount(7);
 await page.getByLabel('Graph dataset').selectOption('reference');await expect(page.locator('.graph-node')).toHaveCount(27);
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.goto('/architecture.html');await expect(page.getByRole('heading',{name:/Connected records, verified context/})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});

test('graph context checks loaded source bytes, exports a bounded packet within a smaller budget',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'AI context',exact:true}).click();
 await page.getByRole('button',{name:'Build graph context'}).click();await expect(page.locator('.context-result .run-status')).toContainText('sources verified');
 await expect(page.locator('.context-sources summary')).toHaveCount(1);await page.locator('.context-sources summary').click();await expect(page.locator('.context-sources pre')).toContainText('sha256:');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download context'}).click();expect((await download).suggestedFilename()).toBe('arkiv-graph-context.json');
 await page.getByLabel('Character budget').selectOption('2000');await page.getByRole('button',{name:'Build graph context'}).click();await expect(page.locator('.context-result .run-status')).toContainText('sources verified');await expect(page.locator('.run-metadata')).toContainText('characters');
 await page.getByLabel('Context path').selectOption('numbers');await page.getByRole('button',{name:'Build graph context'}).click();await expect(page.locator('.context-result [role=alert]')).toContainText('within this budget');await expect(page.getByRole('button',{name:'Download context'})).toHaveCount(0);await page.getByLabel('Character budget').selectOption('6000');await page.getByRole('button',{name:'Build graph context'}).click();await expect(page.locator('.context-result .run-status')).toContainText('sources verified');
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'.local/screenshots/graph-context-mobile.png',fullPage:true});
});

test('new hostname works, old site redirects and context endpoint rejects uncontrolled inputs',async({request,baseURL})=>{
 if(baseURL?.includes('arkivgraph.ajnasnb.com')){const old=await request.get('https://passport.ajnasnb.com/app/?check=1',{maxRedirects:0});expect(old.status()).toBe(308);expect(old.headers().location).toBe('https://arkivgraph.ajnasnb.com/app/?check=1');}
 for(const path of ['/api/context?task=shell','/api/context?task=coding&rpc=https://example.com','/api/context?task=coding&task=safety','/api/context?maxChars=Infinity'])expect((await request.get(path)).status()).toBe(400);
 const response=await request.get('/api/context?task=safety&maxChars=12000');expect(response.ok()).toBe(true);const result=await response.json();expect(result.packet.contentRole).toBe('untrusted-data');expect(result.packet.verification.execution_authority).toBe(false);expect(result.chars).toBeLessThanOrEqual(12000);expect(result.source_bodies_verified).toBeGreaterThan(0);
});
