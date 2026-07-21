import { expect, test } from '@playwright/test';

test('unused-medicine directory filters and keeps map markers out', async ({ page }) => {
  await page.goto('/#/unused-medicine-collection-stations');
  await expect(page.getByRole('button', { name: '檢收站清單' })).toBeVisible();
  await page.getByRole('button', { name: '檢收站清單' }).click();
  await expect(page.locator('.directory-table-wrap tbody tr').first()).toBeVisible();
  await page.locator('.bulky-filters select').first().selectOption({ index: 1 });
  await expect(page.locator('.directory-table-wrap tbody tr').first()).toBeVisible();
  await expect(page.locator('.leaflet-container')).toHaveCount(0);
});
