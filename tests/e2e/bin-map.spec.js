import { expect, test } from '@playwright/test';

test.describe('Taipei bin map public flows', () => {
  test('loads local bin data and renders the public map experience', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: '台北市行人專用清潔箱地圖' })).toBeVisible();
    await expect(page.getByText('1197 筆資料')).toBeVisible();
    await expect(page.getByText('資料更新:')).toBeVisible();
    await expect(page.getByLabel('使用提醒').getByText('嚴禁投入家用垃圾')).toBeVisible();
    await expect(page.locator('.leaflet-map')).toBeVisible();
    await expect(page.locator('.bin-list li')).toHaveCount(80);
    await expect(page.getByText('列表先顯示前 80 筆')).toBeVisible();
  });

  test('persists the English language selection across reloads', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'English' }).click();
    await expect(page.getByRole('heading', { name: 'Taipei Pedestrian Garbage Bin Map' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Taipei Pedestrian Garbage Bin Map' })).toBeVisible();
    await expect(page.getByPlaceholder('Search address or place')).toBeVisible();
  });

  test('searches by location keyword and filters by district', async ({ page }) => {
    await page.goto('/');

    await page.getByPlaceholder('搜尋地址或地點').fill('外交部');
    await page.getByLabel('行政區').selectOption('中正區');

    await expect(page.getByText('2 筆資料')).toBeVisible();
    await expect(page.locator('.bin-list li')).toHaveCount(2);
    await expect(page.locator('.bin-list li').first()).toContainText('中山南路(西側)外交部');
  });

  test('shows nearest bins after granted geolocation', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 25.03848, longitude: 121.5172 });
    await page.goto('/');

    await page.getByRole('button', { name: '顯示附近清潔箱' }).click();

    await expect(page.getByRole('heading', { name: '最近的清潔箱' })).toBeVisible();
    await expect(page.locator('.bin-list li')).toHaveCount(10);
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

    await page.getByRole('button', { name: '顯示附近清潔箱' }).click();

    await expect(page.getByText('無法取得您的位置，請確認定位權限。')).toBeVisible();
    await expect(page.getByRole('heading', { name: '符合條件的清潔箱' })).toBeVisible();
  });
});
