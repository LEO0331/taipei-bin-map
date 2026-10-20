import { expect, test } from '@playwright/test';

test('cached shade inventory survives offline navigation without external tiles', async ({ page, context }) => {
  let navigations = 0;
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations++; });
  await page.goto('/#/shade-equity');
  await expect(page.getByRole('heading', { name: 'A 政策問題與分析限制' })).toBeVisible();
  // The session marker is set before reload commits. Observe the second navigation itself.
  await expect.poll(() => navigations, { timeout: 15000 }).toBeGreaterThanOrEqual(2);
  await expect.poll(async () => {
    try { return await page.evaluate(() => Boolean(navigator.serviceWorker.controller) && sessionStorage.getItem('sw-reloaded') === '1'); }
    catch { return false; }
  }, { timeout: 15000 }).toBe(true);
  await expect(page.getByRole('heading', { name: 'A 政策問題與分析限制' })).toBeVisible();
  await expect.poll(() => page.evaluate(async () => !!await caches.match('/data/shade-equity/snapshot.json'))).toBe(true);
  await context.setOffline(true); await page.reload();
  await expect(page.getByRole('heading', { name: 'A 政策問題與分析限制' })).toBeVisible();
  await expect(page.locator('.shade-dashboard')).toContainText('目前離線');
});
