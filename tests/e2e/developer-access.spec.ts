import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';

test('overview distinguishes infrastructure, keeps download evidence honest and opens the lazy film',async({page})=>{
 const mediaRequests:string[]=[];
 page.on('request',request=>{if(new URL(request.url()).pathname.endsWith('arkiv-graph-launch.mp4'))mediaRequests.push(request.url());});
 await page.setViewportSize({width:1440,height:1000});
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'Graphs built for AI context.'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Start with the SDK'})).toBeVisible();
 await expect(page.getByRole('link',{name:'Pitch deck PPTX',exact:true})).toHaveAttribute('href','/downloads/arkiv-graph-pitch.pptx');
 await expect(page.getByRole('link',{name:'Pitch deck PDF',exact:true})).toHaveAttribute('href','/downloads/arkiv-graph-pitch.pdf');
 await expect(page.locator('.usage-table tbody tr')).toHaveCount(4);
 const usage=JSON.parse(await fs.readFile('apps/web/public/data/npm-usage.json','utf8'));
 for(const [index,window] of usage.packages.flatMap((pkg:any)=>pkg.windows).entries()){
  const value=page.locator('.usage-table tbody tr').nth(index).locator('td').last();
  await expect(value).toHaveText(window.status==='available'?Number(window.downloads).toLocaleString('en-GB'):'Unavailable');
 }
 await expect(page.locator('.npm-usage')).toContainText('project installs');
 await expect(page.locator('.npm-usage')).toContainText('runtime graph reads');
 expect(mediaRequests).toEqual([]);
 await page.screenshot({path:'.local/screenshots/developer-overview-desktop.png'});
 await page.getByRole('button',{name:'Watch infrastructure + reference app · 162 seconds'}).click();
 await expect(page.locator('#launch')).toHaveAttribute('open','');
 await expect(page.locator('#launch video')).toHaveAttribute('preload','none');
 await expect(page.locator('#launch video')).toHaveAttribute('poster','/media/arkiv-graph-poster.png');
 await expect(page.locator('#launch track')).toHaveAttribute('src','/media/arkiv-graph-launch.vtt');
 expect(mediaRequests).toEqual([]);
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 await expect(page.getByRole('button',{name:'Start with the SDK'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'.local/screenshots/developer-overview-mobile.png'});
});

test('SDK quickstart copies the exact runnable documentation example and fits mobile',async({page})=>{
 await page.addInitScript(()=>{let copied='';Object.defineProperty(navigator,'clipboard',{value:{writeText:async(value:string)=>{copied=value;},readText:async()=>copied}});});
 // This test exercises interface and copy controls. Network verification has its own integration checks.
 await page.route('**/api/infrastructure-graph',route=>route.fulfill({json:{graph:{nodes:[{id:'test:source',label:'UI fixture',type:'source',detail:'Interface test fixture.'}],edges:[]},records:[],block:'123',graph_digest:'sha256:ui-fixture'}}));
 await page.goto('/?view=sdk');
 await expect(page.getByRole('heading',{name:'Install. Build a graph. Run it.'})).toBeVisible();
 await page.getByRole('button',{name:'Copy install the sdk command',exact:true}).click();
 expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe('npm init -y\nnpm install @ajnasnb/arkiv-graph@0.4.1');
 await page.getByText('Copy the complete example into graph.mjs',{exact:true}).click();
 await page.getByRole('button',{name:'Copy graph.mjs example command',exact:true}).click();
 const guide=await fs.readFile('docs/GETTING_STARTED.md','utf8');
 const example=guide.split('<!-- quickstart:offline:start -->')[1]!.split('```js')[1]!.split('```')[0]!.trim();
 expect((await page.evaluate(()=>navigator.clipboard.readText())).trim()).toBe(example);
 await expect(page.getByRole('status').filter({hasText:'graph.mjs example command copied.'})).toBeVisible();
 await page.getByRole('button',{name:'Copy run the local graph command',exact:true}).click();
 expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe('node graph.mjs');
 await page.getByRole('heading',{name:'A small graph contract'}).scrollIntoViewIfNeeded();
 await expect(page.locator('.schema-diagram')).toContainText('Signed manifest');
 await expect(page.getByRole('link',{name:'Graph JSON Schema',exact:true})).toHaveAttribute('href','/contracts/arkiv-graph.schema.json');
 await page.locator('.schema-diagram').screenshot({path:'.local/screenshots/developer-schema-desktop.png'});
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('heading',{name:'A small graph contract'}).scrollIntoViewIfNeeded();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('.schema-diagram').screenshot({path:'.local/screenshots/developer-schema-mobile.png'});
 await page.getByRole('button',{name:'Copy start the mcp reader command',exact:true}).click();
 expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe('npx arkiv-graph mcp reader.json');
 await page.getByRole('button',{name:'Copy test the repository command',exact:true}).click();
 expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe('npm test\nnpm run typecheck\nnpm run build');
});
