import { expect, test } from '@playwright/test';

test('shade metadata and district details honor the configured project base', async ({ page }) => {
  const requests = []; page.on('request', request => { if (request.url().includes('/data/shade-equity/')) requests.push(new URL(request.url()).pathname); });
  await page.goto('./#/shade-equity');
  await expect(page.getByRole('heading', { name: '樹蔭公平與都市熱環境決策分析', exact: true })).toBeVisible();
  await page.getByLabel('查核資料範圍（選區後載入明細）').selectOption('中正區');
  await expect.poll(() => requests.some(path => /district-.*\.json$/.test(path))).toBe(true);
  expect(requests.every(path => path.startsWith('/taipei-bin-map/data/shade-equity/'))).toBe(true);
});
