import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];

page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') {
    errors.push(message.text());
  }
});

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.waitForSelector('.leaflet-map', { timeout: 10_000 });
await page.waitForSelector('.bin-list li', { timeout: 10_000 });

const title = await page.locator('h1').textContent();
const countText = await page.locator('.list-heading span').textContent();

await page.getByRole('button', { name: 'English' }).click();
const englishTitle = await page.locator('h1').textContent();

await page.getByPlaceholder('Search address or place').fill('外交部');
await page.waitForTimeout(300);
const filteredCount = await page.locator('.bin-list li').count();
const firstAddress = await page.locator('.bin-list li p').first().textContent();

await page.locator('select').selectOption('中正區');
await page.waitForTimeout(300);
const districtFilteredCount = await page.locator('.bin-list li').count();
const markerCount = await page.locator('.bin-marker').count();

await page.screenshot({ path: '.omx/app-smoke-mobile.png', fullPage: true });
await browser.close();

console.log(
  JSON.stringify(
    {
      title,
      countText,
      englishTitle,
      filteredCount,
      firstAddress,
      districtFilteredCount,
      markerCount,
      errors,
    },
    null,
    2,
  ),
);
