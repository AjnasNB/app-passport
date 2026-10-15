import {test,expect} from '@playwright/test';
import {twoClientBrowserFixture} from '../helpers/two-client-fixture';

test('two tabs serialize the entire client read and preserve withdrawal after reload',async({context,page})=>{
  const fixture=await twoClientBrowserFixture();let calls=0,releaseFirst!:()=>void,firstStarted!:()=>void;
  const started=new Promise<void>(resolve=>{firstStarted=resolve;}),release=new Promise<void>(resolve=>{releaseFirst=resolve;});
  await context.route('**/data/two-client-session.json',route=>route.fulfill({json:fixture.session}));
  await context.route('**/api/records',route=>route.fulfill({json:fixture.read(false)}));
  await context.route('**/api/two-client/records?consumer=A',async route=>{
    const call=++calls;if(call===1){firstStarted();await release;}
    const value=fixture.read(call===1);value.block=String(120+call);value.graph.block=String(120+call);
    await route.fulfill({json:value});
  });
  const other=await context.newPage();await page.goto('/two-client/');await other.goto('/two-client/');
  const a=page.locator('[data-consumer="A"]'),b=other.locator('[data-consumer="A"]');
  await expect(a).toHaveAttribute('data-state','ready');await expect(b).toHaveAttribute('data-state','ready');
  await a.getByRole('button',{name:'Run client A'}).click();await started;
  await b.getByRole('button',{name:'Run client A'}).click();
  await expect(b).toHaveAttribute('data-state','checking');
  // Inspect the browser lock manager rather than inferring serialization from timing.
  await expect.poll(()=>other.evaluate(async()=>{const state=await navigator.locks.query();return state.pending?.filter(lock=>lock.name?.startsWith('arkiv-graph:two-client:v1:A:')).length??0;})).toBe(1);
  expect(calls).toBe(1);releaseFirst();
  await expect(a).toHaveAttribute('data-state','withdrawn');await expect(b).toHaveAttribute('data-state','withdrawn');expect(calls).toBe(2);
  await other.reload();const reloaded=other.locator('[data-consumer="A"]');await reloaded.getByRole('button',{name:'Run client A'}).click();await expect(reloaded).toHaveAttribute('data-state','withdrawn');expect(calls).toBe(3);
  const saved=await other.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('arkiv-graph:two-client:v1:A:')).map(key=>JSON.parse(localStorage.getItem(key)!)));
  expect(saved).toHaveLength(1);expect(saved[0].withdrawals).toHaveLength(1);
});

test('live client retains a signed withdrawal when its target is initially omitted',async({page})=>{
  const fixture=await twoClientBrowserFixture();let calls=0;
  await page.route('**/data/two-client-session.json',route=>route.fulfill({json:fixture.session}));
  await page.route('**/api/records',route=>route.fulfill({json:fixture.read(false)}));
  await page.route('**/api/two-client/records?consumer=A',route=>{
    const value=fixture.read(++calls===1);value.block=String(120+calls);value.graph.block=String(120+calls);
    if(calls===1)value.records=value.records.filter(record=>record.envelope.payload.kind!=='review');
    return route.fulfill({json:value});
  });
  await page.goto('/two-client/');const A=page.locator('[data-consumer="A"]');await A.getByRole('button',{name:'Run client A'}).click();await expect(A).toHaveAttribute('data-state','unknown');
  await A.getByRole('button',{name:'Run client A'}).click();await expect(A).toHaveAttribute('data-state','withdrawn');await expect(A).toContainText('Task did not run');
});

test('live client refuses when local storage is unavailable',async({page})=>{
  const fixture=await twoClientBrowserFixture();
  await page.route('**/data/two-client-session.json',route=>route.fulfill({json:fixture.session}));
  await page.route('**/api/records',route=>route.fulfill({json:fixture.read(false)}));
  await page.route('**/api/two-client/records?consumer=A',route=>route.fulfill({json:fixture.read(false)}));
  await page.goto('/two-client/');const A=page.locator('[data-consumer="A"]');await expect(A).toHaveAttribute('data-state','ready');
  await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new Error('Synthetic denied storage');};});
  await A.getByRole('button',{name:'Run client A'}).click();await expect(A).toHaveAttribute('data-state','unavailable');await expect(A).toContainText('Task did not run');
});

test('live client refuses before a remote read if exclusive browser locks are unavailable',async({page})=>{
  const fixture=await twoClientBrowserFixture();let remoteReads=0;
  await page.route('**/data/two-client-session.json',route=>route.fulfill({json:fixture.session}));
  await page.route('**/api/records',route=>route.fulfill({json:fixture.read(false)}));
  await page.route('**/api/two-client/records?consumer=A',route=>{remoteReads++;return route.fulfill({json:fixture.read(false)});});
  await page.goto('/two-client/');const A=page.locator('[data-consumer="A"]');await expect(A).toHaveAttribute('data-state','ready');
  await page.evaluate(()=>Object.defineProperty(navigator,'locks',{value:undefined,configurable:true}));
  await A.getByRole('button',{name:'Run client A'}).click();await expect(A).toHaveAttribute('data-state','unavailable');expect(remoteReads).toBe(0);
});
