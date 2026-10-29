import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
const snapshot = JSON.parse(readFileSync(new URL('../../public/data/shade-equity/snapshot.json', import.meta.url), 'utf8'));

test('expanded source evidence does not stretch collapsed neighbors into blank cards', async ({ page }, info) => {
  await page.goto('/#/shade-equity');
  const rows = page.locator('.shade-source-accordion');
  await expect(rows).toHaveCount(snapshot.sources.length);
  await rows.first().locator('.shade-source-header').click();
  const opened = await rows.first().boundingBox(), closed = await rows.nth(1).boundingBox();
  expect(closed.y).toBeGreaterThanOrEqual(opened.y + opened.height);
  expect(closed.height).toBeLessThan(140);
  expect(Math.abs(closed.width - opened.width)).toBeLessThan(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('region', { name: '官方資料來源', exact: true }).screenshot({ path: info.outputPath('source-accordion.png') });
});

test('keyboard activation opens only one source and can collapse it again', async ({ page }) => {
  await page.goto('/#/shade-equity');
  const headers = page.locator('.shade-source-header');
  await headers.first().focus(); await page.keyboard.press('Enter');
  await expect(headers.first()).toHaveAttribute('aria-expanded', 'true');
  await headers.nth(1).focus(); await page.keyboard.press('Space');
  await expect(headers.nth(1)).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.shade-source-accordion[open]')).toHaveCount(1);
  await expect(headers.first()).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Enter');
  await expect(page.locator('.shade-source-accordion[open]')).toHaveCount(0);
});

test('English technical disclosure copies the full source hash', async ({ page }, info) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async value => { window.__copiedSourceValue = value; } } });
  });
  await page.goto('/#/shade-equity'); await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.locator('.shade-source-header').first().click();
  await expect(page.getByRole('button', { name: 'Copy SHA256', exact: true })).toHaveCount(0);
  await page.getByText('Technical information', { exact: true }).click();
  await page.getByRole('button', { name: 'Copy SHA256', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Copied SHA256');
  expect(await page.evaluate(() => window.__copiedSourceValue)).toBe(snapshot.sources[0].sha256);
  await page.getByRole('region', { name: 'Official data sources', exact: true }).screenshot({ path: info.outputPath('source-technical-en.png') });
});
