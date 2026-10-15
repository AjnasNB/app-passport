import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.resolve('.local/ai-journey-recording');await fs.mkdir(root,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({viewport:{width:1600,height:900},deviceScaleFactor:2,recordVideo:{dir:root,size:{width:1600,height:900}}});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));const clock=Date.now(),events={};
try{
 await page.goto('https://arkivgraph.ajnasnb.com/app/');
 const response=page.waitForResponse(r=>r.url().endsWith('/api/run')&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Generate and test guard'}).click();
 const receipt=await(await response).json();if(!receipt.allowed||!receipt.model_evidence)throw new Error('Real admitted model evidence required');
 const encoded=JSON.stringify(receipt.model_evidence),digest='sha256:'+crypto.createHash('sha256').update(encoded).digest('hex');
 if(digest!==receipt.evidence_message_sha256)throw new Error('Evidence bytes do not match the model message identity');
 await page.getByRole('button',{name:'Inspect AI inputs'}).click();await page.locator('.ai-journey').scrollIntoViewIfNeeded();await page.waitForTimeout(800);
 events.inspector=(Date.now()-clock)/1000;await page.screenshot({path:root+'/inspector.png'});await page.waitForTimeout(1700);
 await page.getByText('Inspect exact model evidence',{exact:true}).click();await page.locator('.journey-json').scrollIntoViewIfNeeded();events.exact_message=(Date.now()-clock)/1000;await page.waitForTimeout(2300);await page.screenshot({path:root+'/message.png'});
 await page.getByRole('button',{name:'Original sources',exact:true}).click();await page.locator('.ai-journey').scrollIntoViewIfNeeded();events.sources=(Date.now()-clock)/1000;await page.waitForTimeout(2500);await page.screenshot({path:root+'/sources.png'});
 await page.getByRole('button',{name:'Connected evidence',exact:true}).click();events.graph=(Date.now()-clock)/1000;await page.waitForTimeout(2200);
 await page.getByRole('button',{name:'Real inference',exact:true}).click();events.model=(Date.now()-clock)/1000;await page.waitForTimeout(2200);await page.screenshot({path:root+'/model.png'});
 await page.getByRole('button',{name:'Checked result',exact:true}).click();events.result=(Date.now()-clock)/1000;await page.waitForTimeout(2000);
 await fs.writeFile(root+'/run.json',JSON.stringify(receipt,null,2));await fs.writeFile(root+'/capture.json',JSON.stringify({url:page.url(),recorded_at:new Date().toISOString(),events,video:await page.video().path(),browser_errors:errors,evidence_message_identity_verified:true},null,2));
 console.log(JSON.stringify({recorded:true,selected_sources:receipt.model_evidence.sources.length,selected_events:receipt.model_evidence.selected_events.length,memory_chars:receipt.memory_chars,browser_errors:errors.length}));
}finally{await context.close();await browser.close();}
