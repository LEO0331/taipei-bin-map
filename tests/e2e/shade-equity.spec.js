import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const snapshot = JSON.parse(readFileSync(new URL('../../public/data/shade-equity/snapshot.json', import.meta.url), 'utf8'));
test('ordinary facility discovery does not request shade research data', async ({ page }) => {
  const requests = []; page.on('request', request => { if (request.url().includes('/data/shade-equity/')) requests.push(request.url()); });
  await page.goto('/'); await expect(page.locator('.facility-type-layer')).toBeVisible();
  expect(requests).toEqual([]);
});
test('shade route presents audited inventories without implying measured shade', async ({ page }, info) => {
  await page.goto('/#/shade-equity');
  await expect(page.getByRole('heading', { name: '樹蔭公平與都市熱環境決策分析', exact: true })).toBeVisible();
  await expect(page.locator('.shade-dashboard')).toContainText('登錄行道樹 ≠ 實測樹冠');
  await expect(page.locator('.shade-dashboard')).toContainText(snapshot.snapshotId);
  await page.locator('.shade-dashboard').screenshot({ path: info.outputPath('shade-inventory.png') });
});
test('official district details load only after selecting that scope', async ({ page }) => {
  const requested = []; page.on('request', request => { if (/district-.*\.json/.test(request.url())) requested.push(request.url()); });
  await page.goto('/#/shade-equity');
  await expect(page.getByRole('heading', { name: '樹蔭公平與都市熱環境決策分析', exact: true })).toBeVisible();
  expect(requested).toHaveLength(0);
  await page.getByLabel('查核資料範圍（選區後載入明細）').selectOption('中正區');
  await expect.poll(() => requested.length).toBeGreaterThan(0);
  await expect(page.locator('.shade-dashboard')).toContainText('中正區');
});
test('unverified measurement definitions cannot become an environmental ranking', async ({ page }) => {
  await page.goto('/#/shade-equity');
  await page.getByRole('button', { name: '查核優先順序', exact: true }).click();
  await expect(page.locator('.shade-dashboard')).toContainText('目前沒有符合證據門檻');
  await expect(page.getByRole('option', { name: '低登錄樹木量（需可比較）' })).toHaveAttribute('disabled', '');
});
test('export preserves zero eligible reviews rather than fabricated five candidates', async ({ page }) => {
  await page.goto('/#/shade-equity');
  await page.getByRole('button', { name: '現勘摘要與匯出', exact: true }).click();
  const downloaded = page.waitForEvent('download'); await page.getByRole('button', { name: '匯出現勘摘要 JSON', exact: true }).click();
  const file = await downloaded; const data = JSON.parse(readFileSync(await file.path(), 'utf8'));
  expect(data.snapshotId).toBe(snapshot.snapshotId);
  expect(data.methodologyVersion).toBe('shade-equity-evidence-review-v1');
  expect(data.selected).toEqual([]);
  expect(data.sources.some(source => source.id === 'roadside_trees' && source.rawCount === 90358)).toBe(true);
});
test('CSV briefing retains source provenance even with no selected units', async ({ page }) => {
  await page.goto('/#/shade-equity'); await page.getByRole('button', { name: '現勘摘要與匯出', exact: true }).click();
  const downloaded = page.waitForEvent('download'); await page.getByRole('button', { name: '匯出現勘摘要 CSV', exact: true }).click();
  const file = await downloaded; const content = readFileSync(await file.path(), 'utf8');
  expect(content).toContain(snapshot.snapshotId); expect(content).toContain('2fd54772656da39ff0b50fa997a5a25c99d83deb7494ac49962911397e2c3efa');
});
test('malformed shade data shows a recoverable error instead of blank application', async ({ page }) => {
  await page.route('**/data/shade-equity/snapshot.json', route => route.fulfill({ json: { schemaVersion: 99 } }));
  await page.goto('/#/shade-equity'); await expect(page.getByRole('alert')).toContainText('來源版本或格式無法驗證');
  await page.unroute('**/data/shade-equity/snapshot.json'); await page.getByRole('button', { name: '重試資料', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A 政策問題與分析限制' })).toBeVisible();
});
test('English shade controls remain readable on the mobile viewport', async ({ page }, info) => {
  await page.goto('/#/shade-equity'); await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Shade Equity & Urban Heat Preparedness', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Review priorities', exact: true }).click();
  await expect(page.getByLabel('Maximum survey slots')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.locator('.shade-dashboard').screenshot({ path: info.outputPath('shade-controls-en.png') });
});
test('offline tolerance comparison explicitly reports different evidence scopes', async ({ page }) => {
  await page.goto('/#/shade-equity');
  await page.getByRole('button', { name: '容量與敏感度', exact: true }).click();
  await expect(page.getByRole('heading', { name: '離線空間容許距離比較' })).toBeVisible();
  await expect(page.getByRole('table').filter({ has: page.getByText('樹木：匹配／未匹配／模糊', { exact: true }) })).toContainText('41830 / 48030 / 0');
});
