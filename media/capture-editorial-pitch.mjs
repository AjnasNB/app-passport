import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
const origin='https://arkivgraph.ajnasnb.com';
const out=path.resolve('apps/web/public/brand/arkiv-graph/editorial');
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PASSPORT_CHROME_PATH||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined)});
const context=await browser.newContext({viewport:{width:1600,height:1000},locale:'en-GB'}),page=await context.newPage();
const captures=[];
async function capture(name,selector,{height}={}){
 const loc=page.locator(selector);await loc.scrollIntoViewIfNeeded();await page.evaluate(()=>document.fonts.ready);
 const box=await loc.boundingBox();if(!box)throw new Error('Missing capture subject');
 const target=path.join(out,name+'.png');
 if(height)await page.screenshot({path:target,clip:{x:box.x,y:box.y,width:box.width,height:Math.min(height,box.height)}});else await loc.screenshot({path:target});
 captures.push({name,url:page.url(),selector,clip_height:height??null,captured_at:new Date().toISOString(),text:await loc.innerText(),sha256:createHash('sha256').update(await fs.readFile(target)).digest('hex')});
}
try{
 await page.goto(origin,{waitUntil:'networkidle'});await capture('website','.graph-product-hero');
 await page.goto(origin+'/two-client/',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Read both clients',exact:true}).click();
 for(const id of ['A','B']){
  const loc=page.locator(`[data-consumer="${id}"]`);await loc.locator('.two-client-status').filter({hasText:'withdrawn'}).waitFor({timeout:60000});
  if(await loc.getAttribute('data-state')!=='withdrawn')throw new Error('Expected current withdrawn request');
  await capture('client-'+id,`[data-consumer="${id}"]`,{height:210});
 }
 await page.goto(origin+'/?view=trust',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Verify live root updates',exact:true}).click();
 await page.getByRole('heading',{name:'Revision 2 accepted',exact:true}).waitFor({timeout:60000});await capture('root-result','.trust-result');
 await fs.writeFile(path.join(out,'captures.json'),JSON.stringify({schema:'arkiv-graph.editorial-captures.v1',scope:'Actual owned-site screenshots. Cards cropped to header/outcome, without changing DOM content. Fresh read-only requests, no transaction or model inference.',captures},null,2)+'\n');
 console.log(JSON.stringify({captures:captures.map(c=>({name:c.name,captured_at:c.captured_at})),out}));
}finally{await browser.close();}
