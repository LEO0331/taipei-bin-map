import { expect, test } from '@playwright/test';

test('production preview retains policy data and exports offline after a cached visit', async ({ page, context }, testInfo) => {
  // Do not bulk-fetch third-party tiles in automated offline regression checks.
  await page.route('https://tile.openstreetmap.org/**', route => route.abort());
  await page.goto('/#/bin-policy');
  await expect(page.getByTestId('policy-gain')).toBeVisible();
  // First activation intentionally reloads the app. Observe lifecycle state across that navigation.
  await expect.poll(async () => {
    try { return await page.evaluate(() => Boolean(navigator.serviceWorker.controller) && sessionStorage.getItem('sw-reloaded') === '1'); }
    catch { return false; }
  }, { timeout: 15000 }).toBe(true);
  await page.reload();
  await expect(page.getByTestId('policy-gain')).toBeVisible();
  await expect(page.locator('#policy-data-health')).toContainText('資料健康狀態');
  await page.locator('#policy-reconciliation summary').click();
  await expect(page.getByRole('button', { name: '匯出對帳 JSON', exact: true })).toBeVisible();
  await page.locator('#policy-data-health').screenshot({ path: testInfo.outputPath('health-preview.png') });
  await page.locator('#policy-distribution').screenshot({ path: testInfo.outputPath('map-offline-tiles.png') });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId('policy-gain')).toBeVisible();
  await expect(page.locator('#policy-data-health')).toContainText('目前離線');
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: '匯出決策摘要 JSON', exact: true }).click();
  expect((await event).suggestedFilename()).toBe('bin-policy-briefing.json');
  await context.setOffline(false);
});
