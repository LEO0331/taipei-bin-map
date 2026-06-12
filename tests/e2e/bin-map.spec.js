import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const facilities = JSON.parse(
  readFileSync(new URL('../../public/data/facilities.json', import.meta.url), 'utf8'),
);
const totalFacilityCount = facilities.length.toLocaleString('en-US');
const dogWasteBagBoxCount = facilities
  .filter((facility) => facility.type === 'dog_waste_bag_box')
  .length.toLocaleString('en-US');

test.describe('Taipei street cleanliness map public flows', () => {
  test('loads both local datasets and renders the public map experience', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: '台北市街頭清潔便利地圖' })).toBeVisible();
    await expect(page.locator('.metrics-strip strong').first()).toHaveText(totalFacilityCount);
    await expect(page.getByText('資料更新:')).toBeVisible();
    await expect(page.getByLabel('使用提醒').getByText('嚴禁投入家用垃圾')).toBeVisible();
    await expect(page.getByLabel('使用提醒').getByText('隨手清狗便')).toBeVisible();
    await expect(page.getByLabel('地圖圖例')).toContainText('狗便袋箱');
    await expect(page.locator('.leaflet-map')).toBeVisible();
    await expect(page.locator('.facility-list li')).toHaveCount(80);
    await expect(page.getByText('列表先顯示前 80 筆')).toBeVisible();
  });

  test('persists the English language selection across reloads', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'English' }).click();
    await expect(page.getByRole('heading', { name: 'Taipei Street Cleanliness Map' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Taipei Street Cleanliness Map' })).toBeVisible();
    await expect(page.getByPlaceholder('Search address, road, or place')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dog Waste Bag Boxes' })).toBeVisible();
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

  test('searches across road and location fields and shows coordinate warnings', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: '狗便袋箱' }).click();
    await page.getByPlaceholder('搜尋地址、路名或地點').fill('4段32號對面捷運線形公園');
    await page.getByLabel('行政區').selectOption('北投區');

    await expect(page.locator('.facility-list li')).toHaveCount(1);
    await expect(page.locator('.facility-list li').first()).toContainText('中央北路');
    await expect(page.locator('.facility-list li').first()).toContainText('此筆座標可能有誤');
  });

  test('shows nearest selected facility type after granted geolocation', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 25.03848, longitude: 121.5172 });
    await page.goto('/');

    await page.getByRole('button', { name: '狗便袋箱' }).click();
    await page.getByRole('button', { name: '顯示附近設施' }).click();

    await expect(page.getByRole('heading', { name: '最近的設施' })).toBeVisible();
    await expect(page.locator('.facility-list li')).toHaveCount(10);
    await expect(page.locator('.facility-list li').first()).toContainText('狗便袋箱');
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
