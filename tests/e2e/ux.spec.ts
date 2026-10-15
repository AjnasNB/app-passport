import {test,expect} from '@playwright/test';

test('graph profile survives sharing, reload, active navigation and browser Back',async({page})=>{
 await page.goto('/?view=graph');
 await expect(page.getByLabel('Graph dataset')).toHaveValue('infrastructure');
 await expect(page.locator('.graph-node')).toHaveCount(7);
 await page.getByLabel('Graph dataset').selectOption('reference');
 await expect(page).toHaveURL(/\?view=reference-graph$/);
 await expect(page.locator('.graph-node')).toHaveCount(27);
 await page.reload();
 await expect(page.getByLabel('Graph dataset')).toHaveValue('reference');
 await page.getByRole('button',{name:'Evidence graph',exact:true}).click();
 await expect(page).toHaveURL(/\?view=reference-graph$/);
 await expect(page.locator('.graph-node')).toHaveCount(27);
 await page.goBack();
 await expect(page).toHaveURL(/\?view=graph$/);
 await expect(page.getByLabel('Graph dataset')).toHaveValue('infrastructure');
 await expect(page.locator('.graph-node')).toHaveCount(7);
});

test('keyboard skip, shareable task views and browser back preserve orientation',async({page})=>{
 await page.goto('/');
 await page.getByRole('heading',{name:'Graphs built for AI context.'}).waitFor();
 await page.keyboard.press('Tab');
 await expect(page.getByRole('link',{name:'Skip to main content'})).toBeFocused();
 await page.keyboard.press('Enter');
 await expect(page.locator('main')).toBeFocused();
 const navigation=page.getByRole('navigation',{name:'Main navigation'});
 await navigation.getByRole('button',{name:'AI context',exact:true}).click();
 await expect(page).toHaveURL(/\?view=context$/);
 await expect(page.getByRole('heading',{level:1})).toHaveText('Build source-backed AI context');
 await expect(page.locator('main')).toBeFocused();
 await navigation.getByRole('button',{name:'SDK',exact:true}).click();
 await expect(page).toHaveURL(/\?view=sdk$/);
 await page.reload();
 await expect(page.getByRole('heading',{level:1})).toHaveText('Build with Arkiv Graph');
 await page.goBack();
 await expect(page.getByRole('heading',{level:1})).toHaveText('Build source-backed AI context');
 await expect(navigation.getByRole('button',{name:'AI context',exact:true})).toHaveAttribute('aria-current','page');
});

test('mobile context keeps the selected example when opening AI Passport',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/?view=context');
 await page.getByLabel('Context path',{exact:true}).selectOption('numbers');
 const build=page.getByRole('button',{name:'Build graph context',exact:true});
 const position=await build.boundingBox();
 expect(position).not.toBeNull();
 expect(position!.y+position!.height).toBeLessThan(844);
 await build.click();
 await page.getByRole('button',{name:'Run this example in AI Passport'}).click();
 await expect(page).toHaveURL(/\/app\/$/);
 await expect(page.getByRole('button',{name:/India number tutor/})).toHaveAttribute('aria-pressed','true');
 await expect(page.getByLabel('Amount in rupees')).toBeVisible();
 const selectedNavigation=await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'AI Passport',exact:true}).boundingBox();
 expect(selectedNavigation!.x).toBeGreaterThanOrEqual(0);
 expect(selectedNavigation!.x+selectedNavigation!.width).toBeLessThanOrEqual(390);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('completed withdrawal distinguishes recorded acceptance from a fresh read',async({page})=>{
 await page.goto('/two-client/');
 await expect(page.getByRole('heading',{level:1})).toContainText('Both clients check again.');
 await expect(page.locator('.two-client-completed')).toContainText('Fresh reads should refuse');
 await expect(page.locator('.two-client-proof')).toContainText('Your next click makes two new reads');
 await page.getByRole('link',{name:'Inspect the before-and-after proof'}).click();
 await expect(page).toHaveURL(/#recorded-lifecycle$/);
 const lifecycle=page.locator('#recorded-lifecycle');
 await expect(lifecycle.locator('li')).toHaveCount(4);
 await expect(lifecycle).toContainText('guard task ran');
 await expect(lifecycle).toContainText('task refused');
 await page.getByRole('button',{name:'Open the coding example'}).click();
 await expect(page.getByRole('button',{name:/Coding handoff Generate and test/})).toHaveAttribute('aria-pressed','true');
 await expect(page).toHaveURL(/\/app\/$/);
});
