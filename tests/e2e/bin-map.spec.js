import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const facilities = JSON.parse(
  readFileSync(new URL('../../public/data/facilities.json', import.meta.url), 'utf8'),
);
const totalFacilityCount = facilities.length.toLocaleString('en-US');
const dogWasteBagBoxCount = facilities
  .filter((facility) => facility.type === 'dog_waste_bag_box')
  .length.toLocaleString('en-US');
const publicToiletCount = facilities
  .filter((facility) => facility.type === 'public_toilet')
  .length.toString();

test.describe('Taipei public amenities map public flows', () => {
  test('loads all three local datasets and avoids default marker clutter', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: '台北市公共便利設施地圖' })).toBeVisible();
    await expect(page.locator('.metrics-strip strong').first()).toHaveText(totalFacilityCount);
    await expect(page.getByText('資料更新:')).toBeVisible();
    await expect(page.getByLabel('使用提醒')).toContainText('公廁實際開放情況');
    await expect(page.getByLabel('地圖圖例')).toContainText('公廁');
    await expect(page.locator('.leaflet-map')).toBeVisible();
    await expect(page.getByText('目前結果較多')).toBeVisible();
    await expect(page.locator('.facility-list li')).toHaveCount(80);
  });

  test('persists the English language selection across reloads', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'English' }).click();
    await expect(page.getByRole('heading', { name: 'Taipei Public Amenities Map' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Taipei Public Amenities Map' })).toBeVisible();
    await expect(page.getByPlaceholder('Search address, road, place, or facility name')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Public Toilets' })).toBeVisible();
  });

  test('filters dog-waste bag boxes without labeling them as garbage bins', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: '狗便袋箱' }).click();

    await expect(page.getByText(`${dogWasteBagBoxCount} 筆資料`)).toBeVisible();
    await expect(page.locator('.facility-list li').first()).toContainText('狗便袋箱');
    await expect(page.locator('.facility-list li').first()).not.toContainText('Pedestrian Garbage Bin');
    await expect(page.getByLabel('使用提醒')).toContainText('隨手清狗便');
    await expect(page.getByLabel('使用提醒')).not.toContainText('家用垃圾');
  });

  test('filters public toilets by category and accessibility fields', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: '公廁' }).click();
    await expect(page.getByText(`${publicToiletCount} 筆資料`)).toBeVisible();
    await page.getByLabel('公廁類別').selectOption('交通');
    await page.getByLabel('有親子廁所').check();

    await expect(page.locator('.facility-list li').first()).toContainText('公廁');
    await expect(page.locator('.facility-list li').first()).toContainText('交通');
    await expect(page.locator('.facility-list li').first()).toContainText('親子廁座數');
  });

  test('searches public toilet name, manager, and address fields', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: '公廁' }).click();
    await page.getByPlaceholder('搜尋地址、路名、地點或設施名稱').fill('捷運劍潭站');
    await page.getByLabel('行政區').selectOption('士林區');

    await expect(page.locator('.facility-list li').first()).toContainText('捷運劍潭站');
    await expect(page.locator('.facility-list li').first()).toContainText('公廁');
    await expect(page.locator('.facility-list li').first()).not.toContainText('狗便袋箱');
  });

  test('searches dog road/location fields and shows coordinate warnings', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: '狗便袋箱' }).click();
    await page.getByPlaceholder('搜尋地址、路名、地點或設施名稱').fill('4段32號對面捷運線形公園');
    await page.getByLabel('行政區').selectOption('北投區');

    await expect(page.locator('.facility-list li')).toHaveCount(1);
    await expect(page.locator('.facility-list li').first()).toContainText('中央北路');
    await expect(page.locator('.facility-list li').first()).toContainText('此筆座標可能有誤');
  });

  test('shows nearest selected facility type after granted geolocation', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 25.0849, longitude: 121.5251 });
    await page.goto('/');

    await page.getByRole('button', { name: '公廁' }).click();
    await page.getByRole('button', { name: '顯示附近設施' }).click();

    await expect(page.getByRole('heading', { name: '最近的設施' })).toBeVisible();
    await expect(page.locator('.facility-list li')).toHaveCount(10);
    await expect(page.locator('.facility-list li').first()).toContainText('公廁');
    await expect(page.locator('.distance').first()).toContainText(/公尺|公里/);
  });

  test('shows a localized error when geolocation is denied', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: {
          getCurrentPosition: (_success, error) => {
            error?.({
              code: 1,
              message: 'denied',
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
            });
          },
        },
      });
    });
    await page.goto('/');

    await page.getByRole('button', { name: '顯示附近設施' }).click();

    await expect(page.getByText('無法取得您的位置，請確認定位權限。')).toBeVisible();
    await expect(page.getByRole('heading', { name: '符合條件的設施' })).toBeVisible();
  });
});
