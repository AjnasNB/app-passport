import {test,expect} from '@playwright/test';
import {twoClientBrowserFixture} from '../helpers/two-client-fixture';

test('two client UI preserves historical results and rereads B before refusing a withdrawn task',async({page})=>{
  const fixture=await twoClientBrowserFixture();let withdrawn=false;
  const requested:string[]=[],errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/data/two-client-session.json',route=>route.fulfill({json:fixture.session}));
  await page.route('**/api/records',route=>route.fulfill({json:fixture.read(false)}));
  await page.route('**/api/two-client/records?consumer=*',route=>{requested.push(new URL(route.request().url()).searchParams.get('consumer')!);return route.fulfill({json:fixture.read(withdrawn)});});
  await page.goto('/two-client/');
  await expect(page.getByRole('heading',{name:'Last request results'})).toBeVisible();
  const A=page.locator('[data-consumer="A"]'),B=page.locator('[data-consumer="B"]');
  await expect(A).toHaveAttribute('data-state','ready');await expect(B).toHaveAttribute('data-state','ready');
  await page.getByRole('button',{name:'Read both clients'}).click();
  await expect(A).toHaveAttribute('data-state','requirements-satisfied');await expect(B).toHaveAttribute('data-state','requirements-satisfied');
  expect(requested.sort()).toEqual(['A','B']);
  await expect(A).toContainText('Admission deadline:');await expect(A).toContainText('Recorded result: 6 / 6 deterministic guard cases passed');
  withdrawn=true;await B.getByRole('button',{name:'Run client B'}).click();
  await expect(B).toHaveAttribute('data-state','withdrawn');await expect(B).toContainText('Task did not run');
  await expect(B.getByText('Inspect deterministic guard output')).toHaveCount(0);
  await expect(A).toHaveAttribute('data-state','requirements-satisfied');
  expect(requested.filter(x=>x==='B')).toHaveLength(2);expect(requested.filter(x=>x==='A')).toHaveLength(1);
  await A.getByRole('button',{name:'Run client A'}).click();await expect(A).toHaveAttribute('data-state','withdrawn');
  await page.getByText('Inspect graph, identities and transactions',{exact:true}).click();
  await expect(page.getByRole('link',{name:'Open withdrawal transaction'})).toHaveAttribute('href',/^https:\/\/tiramisu\.explorer\.arkiv\.network\/tx\/0x[0-9a-f]{64}$/);
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'.local/screenshots/two-client-mobile-regression.png',fullPage:true});
  await page.getByRole('button',{name:'Switch to dark theme'}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'.local/screenshots/two-client-dark-mobile-regression.png',fullPage:true});
  await page.emulateMedia({reducedMotion:'reduce'});
  expect(await A.evaluate(node=>getComputedStyle(node).animationName)).toBe('none');
  await page.setViewportSize({width:1280,height:900});await page.screenshot({path:'.local/screenshots/two-client-desktop-regression.png',fullPage:true});
  expect(errors).toEqual([]);
});

test('a failed new read removes the earlier positive result and does not share another client decision',async({page})=>{
  const fixture=await twoClientBrowserFixture();let fail=false;
  await page.route('**/data/two-client-session.json',route=>route.fulfill({json:fixture.session}));
  await page.route('**/api/records',route=>route.fulfill({json:fixture.read(false)}));
  await page.route('**/api/two-client/records?consumer=*',route=>fail?route.fulfill({status:503,json:{error:'Synthetic unavailable test'}}):route.fulfill({json:fixture.read(false)}));
  await page.goto('/two-client/');const B=page.locator('[data-consumer="B"]');
  await B.getByRole('button',{name:'Run client B'}).click();await expect(B).toHaveAttribute('data-state','requirements-satisfied');
  fail=true;await B.getByRole('button',{name:'Run client B'}).click();await expect(B).toHaveAttribute('data-state','unavailable');
  await expect(B).toContainText('Task did not run');await expect(page.locator('[data-consumer="A"]')).toHaveAttribute('data-state','ready');
});
