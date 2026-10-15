import {test,expect} from '@playwright/test';

test('static mobile views load without starting live admission reads or subscriptions',async({page})=>{
 const reads:string[]=[],sockets:string[]=[];
 page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))reads.push(request.url());});
 page.on('websocket',socket=>sockets.push(socket.url()));
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'Graphs built for AI context.'})).toBeVisible();
 await expect(page.locator('.evaluation-numbers>div').first().locator('strong')).toHaveText('10');
 await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'AI context',exact:true}).click();
 await expect(page.getByRole('button',{name:'Build graph context',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(reads).toEqual([]);expect(sockets).toEqual([]);
});

test('a missing historical verifier worker refuses the session and keeps consumers disabled',async({page})=>{
 await page.route('**/assets/two-client-session.worker-*.js',route=>route.abort());
 await page.goto('/two-client/');
 await expect(page.getByRole('alert')).toContainText('signed session report could not be verified');
 await expect(page.getByRole('button',{name:'Read both clients',exact:true})).toBeDisabled();
 await expect(page.locator('#recorded-lifecycle li')).toHaveCount(0);
});
