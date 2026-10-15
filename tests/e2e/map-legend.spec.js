import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/');
  await expect(page.locator('.leaflet-container')).toBeVisible();
});

test('hides the legend when no facility or user location is displayed', async ({ page }) => {
  await expect(page.locator('.map-legend')).toHaveCount(0);
});

test('shows only the selected facility and removes the previous legend entry', async ({ page }) => {
  await page.locator('.facility-type-layer').getByRole('button', { name: '公廁', exact: true }).click();
  const legend = page.locator('.map-legend');
  if (!await legend.evaluate(element => element.open)) await legend.locator('summary').click();
  await expect(legend.locator('.map-legend-items')).toHaveText('🚻公廁');
  await page.locator('.facility-type-layer').getByRole('button', { name: '狗便袋箱', exact: true }).click();
  await expect(legend.locator('.map-legend-items')).toHaveText('🐾狗便袋箱');
});

test('uses a responsive default and supports keyboard disclosure', async ({ page, isMobile }, testInfo) => {
  await page.locator('.facility-type-layer').getByRole('button', { name: '公廁', exact: true }).click();
  const legend = page.locator('.map-legend');
  await expect(legend).toHaveJSProperty('open', !isMobile);
  const summary = legend.locator('summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(legend.locator('.map-legend-items')).toBeVisible({ visible: isMobile });
  await page.screenshot({ path: testInfo.outputPath('legend.png') });
});
