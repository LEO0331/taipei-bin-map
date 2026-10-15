import { expect, test } from '@playwright/test';

test('shows separate data-health timestamps without claiming live data', async ({ page }, testInfo) => {
  await page.goto('/#/bin-policy');
  const health = page.locator('#policy-data-health');
  await expect(health.getByRole('heading', { name: '資料健康狀態', exact: true })).toBeVisible();
  await expect(health).toContainText('擷取成功不代表即時資料');
  await health.locator('details').first().locator('summary').click();
  await expect(health).toContainText('最後成功驗證');
  await health.screenshot({ path: testInfo.outputPath('data-health.png') });
});

test('offers bin reconciliation evidence and audit export', async ({ page }) => {
  await page.goto('/#/bin-policy');
  const section = page.locator('#policy-reconciliation');
  await expect(section).toContainText('1,197');
  await expect(section).toContainText('不是撤除證明');
  await section.locator('summary').first().click();
  const event = page.waitForEvent('download');
  await section.getByRole('button', { name: '匯出對帳 JSON', exact: true }).click();
  expect((await event).suggestedFilename()).toBe('bin-reconciliation.json');
});

test('keeps allocation available when governance evidence is incompatible', async ({ page }) => {
  await page.route('**/data/bin-policy/data-health.json', route => route.fulfill({ json: { schemaVersion: 1, snapshotId: 'unrelated' } }));
  await page.goto('/#/bin-policy');
  await expect(page.locator('#policy-data-health')).toContainText('未知');
  await expect(page.getByTestId('policy-gain')).toBeVisible();
});

test('retains candidate evidence and exports when external map tiles fail', async ({ page }) => {
  await page.route('https://tile.openstreetmap.org/**', route => route.abort());
  await page.goto('/#/bin-policy');
  await expect(page.getByTestId('policy-tile-status')).toContainText('底圖暫時無法載入');
  await expect(page.locator('.policy-candidate-list li').first()).toBeVisible();
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: '匯出決策摘要 JSON', exact: true }).click();
  expect((await event).suggestedFilename()).toBe('bin-policy-briefing.json');
});

test('localizes governance labels and preserves the original source language', async ({ page }) => {
  await page.goto('/#/bin-policy');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('#policy-data-health')).toContainText('Data Health');
  await expect(page.locator('#policy-reconciliation')).toContainText('Bin Data Reconciliation');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('keeps source-version sensitivity separate from the active allocation population', async ({ page }) => {
  await page.goto('/#/bin-policy');
  const section = page.locator('#policy-bus-versions');
  await section.locator('summary').click();
  await expect(section).toContainText('3,395');
  await expect(section).toContainText('3,453');
  await expect(section).toContainText('不是政策介入效果');
  await expect(page.locator('#policy-problem')).toContainText('3395');
});

test('defers large audit downloads until the related disclosure opens', async ({ page }) => {
  const requests = [];
  page.on('request', request => { if (/reconciliation\.json|bus-source-comparison\.json/.test(request.url())) requests.push(request.url()); });
  await page.goto('/#/bin-policy');
  await expect(page.getByTestId('policy-gain')).toBeVisible();
  expect(requests).toEqual([]);
  await page.locator('#policy-reconciliation summary').click();
  await expect(page.getByRole('button', { name: '匯出對帳 JSON', exact: true })).toBeVisible();
  expect(requests.some(url => url.endsWith('/reconciliation.json'))).toBe(true);
});
