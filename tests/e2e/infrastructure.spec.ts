import {test,expect} from '@playwright/test';
test('standalone infrastructure graph reads live and release downloads work',async({page})=>{
 await page.goto('/');await expect(page.getByRole('link',{name:'Arkiv Graph home'})).toBeVisible();
 await page.getByRole('button',{name:'SDK',exact:true}).click();await expect(page.locator('.infrastructure-counts')).toContainText('6 nodes · 6 edges · 13 signed entities');await expect(page.locator('.infrastructure-nodes article')).toHaveCount(6);
 await page.getByRole('button',{name:'Refresh infrastructure graph'}).click();await expect(page.locator('.infrastructure-counts')).toContainText('13 signed entities');
 const result=await page.evaluate(async()=>{const files=[];for(const path of ['/downloads/arkiv-graph-sdk-0.1.0.tgz','/downloads/app-passport-sdk-0.3.0.tgz','/contracts/arkiv-graph.schema.json','/data/graph-infrastructure-evaluation.json']){const r=await fetch(path);files.push({status:r.status,length:(await r.arrayBuffer()).byteLength});}return files;});expect(result.map(r=>r.status)).toEqual([200,200,200,200]);expect(result.every(r=>r.length>100)).toBe(true);
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'.local/screenshots/arkiv-graph-sdk-mobile.png',fullPage:true});
});
