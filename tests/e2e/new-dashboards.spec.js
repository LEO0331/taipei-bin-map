import { expect, test } from '@playwright/test';

test('swimming-pool finder filters local records by district', async ({ page }) => {
  await page.goto('/#/swimming-pools');
  await expect(page.getByRole('button', { name: '尋找游泳池' })).toBeVisible();
  await page.getByLabel('行政區').selectOption('信義區');
  await expect(page.locator('.record-card').first()).toContainText('信義區');
  await expect(page.getByText('救生員目前值勤')).toHaveCount(0);
});

test('certified-bathhouse directory filters a local certification result', async ({ page }) => {
  await page.goto('/#/certified-bathhouses');
  await expect(page.getByRole('button', { name: '尋找認證浴室' })).toBeVisible();
  await page.getByLabel('評核結果').selectOption({ index: 1 });
  await expect(page.locator('.bulky-list article').first()).toBeVisible();
  await expect(page.getByText('精確地圖標記')).toHaveCount(0);
});

test('recycling analytics switches the selected period without a page reload', async ({ page }) => {
  await page.goto('/#/recycling-analytics');
  await expect(page.getByRole('button', { name: '資源回收統計' })).toBeVisible();
  await page.getByLabel('月份').selectOption('1');
  await expect(page.getByText('選取期間回收量（噸）')).toBeVisible();
});
