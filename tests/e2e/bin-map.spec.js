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
const drinkingFountainCount = facilities
  .filter((facility) => facility.type === 'drinking_fountain')
  .length.toString();
const timedCollectionCount = facilities
  .filter((facility) => facility.type === 'timed_collection_point')
  .length.toString();
const defaultDirectDrinkingCount = facilities
  .filter(
    (facility) =>
      facility.type === 'direct_drinking_station' &&
      facility.directDrinkingStatus === 'normal' &&
      facility.isTaipeiCity,
  )
  .length.toString();
const usedClothingFacilities = facilities.filter(
  (facility) => facility.type === 'used_clothing_recycling_box',
);
const usedClothingCount = usedClothingFacilities.length.toString();
const usedClothingSample = usedClothingFacilities[0];
const lactationRooms = facilities.filter((facility) => facility.type === 'lactation_room');
const lactationRoomCount = lactationRooms.length.toString();
const riversideToilets = facilities.filter((facility) => facility.type === 'riverside_toilet');
const familyFriendlyToilets = facilities.filter((facility) => facility.type === 'family_friendly_toilet');
const riversideToiletCount = riversideToilets.length.toString();
const familyFriendlyToiletCount = familyFriendlyToilets.length.toString();
const inspectionStations = facilities.filter((facility) => facility.type === 'motorcycle_inspection_station');
const inspectionStationCount = inspectionStations.length.toString();
const chargingStations = facilities.filter((facility) => facility.type === 'electric_motorcycle_charging_station');
const chargingStationCount = chargingStations.length.toString();
const commercialEvStations = facilities.filter((facility) => facility.type === 'commercial_ev_charging_swap_station');
const commercialEvStationCount = commercialEvStations.length.toString();
const commercialEvSample =
  commercialEvStations.find((facility) => facility.serviceType === 'electric_motorcycle_battery_swap' && facility.operatorName === 'Gogoro Network') ??
  commercialEvStations[0];
const gasLpgStations = facilities.filter((facility) => facility.type === 'gas_lpg_station');
const gasLpgStationCount = gasLpgStations.length.toString();
const gasLpgSample = gasLpgStations.find((facility) => facility.supplier === '台塑' && facility.hasSelfService) ?? gasLpgStations[0];

test.describe('Taipei public amenities map public flows', () => {
  test('loads all fourteen local datasets and avoids default marker clutter', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: '台北市公共便利設施地圖' })).toBeVisible();
    await expect(page.locator('.metrics-strip strong').first()).toHaveText(totalFacilityCount);
    await expect(page.getByText('資料更新:')).toBeVisible();
    await expect(page.getByLabel('使用提醒')).toContainText('公廁實際開放情況');
    await expect(page.getByLabel('使用提醒')).toContainText('公共場所飲水機實際開放時間');
    await expect(page.getByLabel('地圖圖例')).toContainText('公廁');
    await expect(page.getByLabel('地圖圖例')).toContainText('公共場所飲水機');
    await expect(page.getByLabel('地圖圖例')).toContainText('限時收受點');
    await expect(page.getByLabel('地圖圖例')).toContainText('直飲臺');
    await expect(page.getByLabel('地圖圖例')).toContainText('舊衣回收箱');
    await expect(page.getByLabel('地圖圖例')).toContainText('哺集乳室');
    await expect(page.getByLabel('地圖圖例')).toContainText('河濱廁所');
    await expect(page.getByLabel('地圖圖例')).toContainText('親子友善廁所');
    await expect(page.getByLabel('地圖圖例')).toContainText('機車定檢站');
    await expect(page.getByLabel('地圖圖例')).toContainText('電動機車充電站');
    await expect(page.getByLabel('地圖圖例')).toContainText('營利型電動車充換電站');
    await expect(page.getByLabel('地圖圖例')).toContainText('加油站及加氣站');
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
    await expect(page.getByRole('button', { name: 'Public Drinking Fountains' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Timed Collection Points' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Direct Drinking Stations' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Used Clothing Recycling Boxes' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lactation Rooms' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Riverside Toilets' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Family-Friendly Toilets' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Motorcycle Inspection Stations' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Electric Motorcycle Charging Stations' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Commercial EV Charging & Battery Swap Stations' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gas & LPG Stations' })).toBeVisible();
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

  test('filters riverside toilets and supports nearby sorting', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 25.0746, longitude: 121.5359 });
    await page.goto('/');

    await page.getByRole('button', { name: '河濱廁所' }).click();
    await expect(page.getByText(`${riversideToiletCount} 筆資料`)).toBeVisible();
    await page.getByRole('combobox', { name: '河濱公園', exact: true }).selectOption('大佳河濱公園');
    await page.getByRole('combobox', { name: '廁所類型', exact: true }).selectOption('scenic');
    await page.getByRole('button', { name: '顯示附近河濱廁所' }).click();

    await expect(page.getByRole('heading', { name: '最近的設施' })).toBeVisible();
    await expect(page.locator('.facility-list li').first()).toContainText('河濱廁所');
    await expect(page.locator('.facility-list li').first()).toContainText('大佳河濱公園');
    await expect(page.locator('.distance').first()).toContainText(/公尺|公里/);
  });

  test('filters family-friendly toilets by equipment and award fields', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: '親子友善廁所' }).click();
    await expect(page.getByText(`${familyFriendlyToiletCount} 筆資料`)).toBeVisible();
    await page.getByLabel('有尿布臺').check();
    await page.getByLabel('有兒童座椅').check();
    await page.getByLabel('親子友善評鑑獲獎').check();

    await expect(page.locator('.facility-list li').first()).toContainText('親子友善廁所');
    await expect(page.locator('.facility-list li').first()).toContainText('尿布臺設置數量');
    await expect(page.locator('.facility-list li').first()).toContainText('兒童座椅設置數量');
  });

  test('shows coordinate-free motorcycle inspection stations without responsible person on cards', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: '機車定檢站' }).click();
    await expect(page.getByText(`${inspectionStationCount} 筆資料`)).toBeVisible();
    await expect(page.getByText('機車定檢站資料未提供經緯度')).toBeVisible();
    await page.getByLabel('廠牌').selectOption('山葉');
    await page.getByLabel('有電話').check();
    await page.getByPlaceholder('搜尋站號、廠牌、站名、行政區、地址或電話').fill('A12');

    await expect(page.locator('.facility-list li')).toHaveCount(1);
    await expect(page.locator('.facility-list li').first()).toContainText('機車定檢站');
    await expect(page.locator('.facility-list li').first()).toContainText('宏立機車事業有限公司');
    await expect(page.locator('.facility-list li').first()).not.toContainText('沈鳳雲');
  });

  test('explains why exact nearby distance is unavailable for motorcycle inspection stations', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: '機車定檢站' }).click();
    await page.getByRole('button', { name: '查看附近行政區機車定檢站' }).click();

    await expect(page.getByText('機車定檢站資料未提供經緯度，目前無法計算精確距離。')).toBeVisible();
  });

  test('shows coordinate-free electric motorcycle charging stations and focused filters', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: '電動機車充電站' }).click();
    await expect(page.getByText(`${chargingStationCount} 筆資料`)).toBeVisible();
    await expect(page.getByText('電動機車充電站資料未提供經緯度')).toBeVisible();
    await page.getByLabel('地點分類').selectOption('service_factory');
    await page.getByLabel('縣市').selectOption('臺北市');
    await page.getByLabel('行政區域代碼').selectOption('63000110');
    await page.getByLabel('有地址').check();
    await page.getByPlaceholder('搜尋編號、單位、行政區、地址或地點分類').fill('R01');

    await expect(page.locator('.facility-list li')).toHaveCount(1);
    await expect(page.locator('.facility-list li').first()).toContainText('電動機車充電站');
    await expect(page.locator('.facility-list li').first()).toContainText('中華汽車社子服務廠');
    await expect(page.locator('.facility-list li').first()).not.toContainText('即時');
    await page.getByRole('button', { name: '查看附近行政區電動機車充電站' }).click();
    await expect(page.getByText('電動機車充電站資料未提供經緯度，目前無法計算精確距離。')).toBeVisible();
  });

  test('shows commercial EV charging and swap stations as address-only records', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: '營利型電動車充換電站' }).click();
    await expect(page.getByText(`${commercialEvStationCount} 筆資料`)).toBeVisible();
    await expect(page.getByText('營利型電動車充換電站資料未提供經緯度')).toBeVisible();
    await page.getByLabel('服務類型').selectOption(commercialEvSample.serviceType);
    await page.getByLabel('業者').selectOption(commercialEvSample.operatorName);
    await page.getByRole('combobox', { name: '縣市', exact: true }).selectOption(commercialEvSample.city);
    await page.getByRole('combobox', { name: '縣市代碼', exact: true }).selectOption(commercialEvSample.cityCode);
    await page.getByLabel('有地址').check();
    await page.getByLabel('有行政區').check();
    await page.getByPlaceholder('搜尋業者、站名、行政區、地址或服務類型').fill(commercialEvSample.stationName);

    await expect(page.locator('.facility-list li').first()).toContainText('營利型電動車充換電站');
    await expect(page.locator('.facility-list li').first()).toContainText(commercialEvSample.stationName);
    await expect(page.locator('.facility-list li').first()).toContainText(commercialEvSample.operatorName);
    await expect(page.locator('.facility-list li').first()).toContainText('電動機車換電站');
    await expect(page.locator('.facility-list li').first()).not.toContainText('即時');
    await page.getByRole('button', { name: '查看附近行政區營利型電動車充換電站' }).click();
    await expect(page.getByText('營利型電動車充換電站資料未提供經緯度，目前無法計算精確距離。')).toBeVisible();
  });

  test('filters gas and LPG stations and supports nearby sorting', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: gasLpgSample.latitude, longitude: gasLpgSample.longitude });
    await page.goto('/');

    await page.getByRole('button', { name: '加油站及加氣站' }).click();
    await expect(page.getByText(`${gasLpgStationCount} 筆資料`)).toBeVisible();
    await page.getByLabel('供油廠商').selectOption(gasLpgSample.supplier);
    await page.getByRole('checkbox', { name: '加油站', exact: true }).check();
    await page.getByRole('checkbox', { name: '自助加油', exact: true }).check();
    await page.getByRole('checkbox', { name: '來源標示24小時', exact: true }).check();
    await page.getByRole('checkbox', { name: '有電話', exact: true }).check();
    await page.getByPlaceholder('搜尋站名、供油廠商、行政區、地址或電話').fill(gasLpgSample.stationName);

    await expect(page.locator('.facility-list li').first()).toContainText('加油站及加氣站');
    await expect(page.locator('.facility-list li').first()).toContainText(gasLpgSample.stationName);
    await expect(page.locator('.facility-list li').first()).toContainText(gasLpgSample.supplier);
    await expect(page.locator('.facility-list li').first()).not.toContainText('即時');
    await page.getByRole('button', { name: '顯示附近加油站及加氣站' }).click();
    await expect(page.getByRole('heading', { name: '最近的設施' })).toBeVisible();
    await expect(page.locator('.distance').first()).toContainText(/公尺|公里/);
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

  test('filters and searches drinking fountains by place fields', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: '公共場所飲水機' }).click();
    await expect(page.getByText(`${drinkingFountainCount} 筆資料`)).toBeVisible();
    await page.getByLabel('場所類型').selectOption('sports_center');
    await page.getByLabel('有開放時間資料').check();
    await page.getByPlaceholder('搜尋地址、路名、地點或設施名稱').fill('士林運動中心');

    await expect(page.locator('.facility-list li')).toHaveCount(1);
    await expect(page.locator('.facility-list li').first()).toContainText('公共場所飲水機');
    await expect(page.locator('.facility-list li').first()).toContainText('臺北市立士林運動中心');
    await expect(page.locator('.facility-list li').first()).toContainText('場所開放時間');
    await expect(page.locator('.facility-list li').first()).toContainText('飲水台數');
    await expect(page.getByLabel('使用提醒')).toContainText('公共場所飲水機實際開放時間');
  });

  test('shows timed collection points and applies conservative note filters', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: '限時收受點' }).click();
    await expect(page.getByText(`${timedCollectionCount} 筆資料`)).toBeVisible();
    await expect(page.locator('.facility-list li').first()).toContainText('分隊');

    await page.getByLabel('有特殊時間／備註').check();
    await expect(page.locator('.facility-list li').first()).toContainText('限時收受點');
  });

  test('shows Taipei normal direct drinking stations by default and can include suspended records', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: '直飲臺' }).click();
    await expect(page.getByText(`${defaultDirectDrinkingCount} 筆資料`)).toBeVisible();
    await expect(page.locator('.facility-list li').first()).toContainText('正常');

    await page.getByLabel('包含暫停').check();
    await page.getByPlaceholder('搜尋地址、路名、地點或設施名稱').fill('剝皮寮');
    await expect(page.locator('.facility-list li').first()).toContainText('暫停');
  });

  test('filters used-clothing recycling boxes by village and organization', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: '舊衣回收箱' }).click();
    await expect(page.getByText(`${usedClothingCount} 筆資料`)).toBeVisible();
    await page.getByLabel('里別').selectOption(usedClothingSample.village);
    await page.getByLabel('設置團體').selectOption(usedClothingSample.organizationName);
    await page.getByLabel('有電話').check();

    await expect(page.locator('.facility-list li').first()).toContainText(usedClothingSample.organizationName);
    await expect(page.locator('.facility-list li').first()).toContainText(usedClothingSample.village);
  });

  test('shows and filters coordinate-free lactation room records', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: '哺集乳室' }).click();
    await expect(page.getByText(`${lactationRoomCount} 筆資料`)).toBeVisible();
    await expect(page.getByText('哺集乳室資料未提供經緯度')).toBeVisible();
    await page.getByLabel('有位置指引').check();

    await expect(page.locator('.facility-list li').first()).toContainText('哺集乳室');
    await expect(page.locator('.facility-list li').first()).toContainText('位置指引');
    await expect(page.locator('.facility-list li').first()).not.toContainText('此筆座標可能有誤');
    await expect(page.locator('.leaflet-map canvas')).toBeVisible();
  });

  test('explains why exact nearby distance is unavailable for lactation rooms', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: '哺集乳室' }).click();
    await page.getByRole('button', { name: '查看附近行政區哺集乳室' }).click();

    await expect(page.getByText('哺集乳室資料未提供經緯度，目前無法計算精確距離。')).toBeVisible();
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

  test('shows nearby drinking fountains after granted geolocation', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 25.0893, longitude: 121.5215 });
    await page.goto('/');

    await page.getByRole('button', { name: '公共場所飲水機' }).click();
    await page.getByRole('button', { name: '顯示附近設施' }).click();

    await expect(page.getByRole('heading', { name: '最近的設施' })).toBeVisible();
    await expect(page.locator('.facility-list li')).toHaveCount(10);
    await expect(page.locator('.facility-list li').first()).toContainText('公共場所飲水機');
    await expect(page.locator('.facility-list li').first()).toContainText('臺北市立士林運動中心');
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
