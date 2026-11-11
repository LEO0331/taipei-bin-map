import { expect, test } from '@playwright/test';

const destinations = [
  ['#/', '公共設施主地圖', 'button', '公廁'],
  ['#/public-school-sports-venues', '公立學校運動場地', 'button', '尋找運動場地'],
  ['#/cooling-comfort-spots', '臺北涼適點', 'button', '探索'],
  ['#/swimming-pools', '游泳池查詢', 'button', '尋找游泳池'],
  ['#/bulky-waste-collection-booking', '大型廢棄物清運', 'button', '預約清單'],
  ['#/industrial-waste-reuse-operators', '工業廢棄物再利用', 'button', '機構目錄'],
  ['#/recycling-analytics', '資源回收統計', 'button', '資源回收統計'],
  ['#/unused-medicine-collection-stations', '廢藥回收站', 'button', '檢收站清單'],
  ['#/certified-bathhouses', '衛生認證浴室', 'button', '尋找認證浴室'],
  ['#/bin-policy', '清潔箱配置決策支援', 'heading', '清潔箱配置決策支援'],
  ['#/shade-equity', '樹蔭公平研究', 'heading', '樹蔭公平與都市熱環境決策分析'],
];

const entry = (page, english = false) => page.getByRole('button', {
  name: english ? 'Explore Public Services' : '探索公共服務', exact: true,
});
const dialog = (page, english = false) => page.getByRole('dialog', {
  name: english ? 'Civic Explorer' : '公共服務探索', exact: true,
});
const listLink = (surface, hash) =>
  surface.locator('.civic-list').getByRole('link').and(surface.locator(`a[href="${hash}"]`));
const map = (page) => page.locator('.map-panel .leaflet-container');

async function openExplorer(page, english = false) {
  await entry(page, english).click();
  const surface = dialog(page, english);
  await expect(surface).toBeVisible();
  return surface;
}

async function tabTo(page, target) {
  await expect(target).toBeVisible();
  for (let i = 0; i < 24; i++) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
}

test.beforeEach(async ({ page }) => {
  // Basemap artwork is unrelated to navigation; keep assertions offline and deterministic.
  await page.route('https://**', (route) => route.abort());
});

test('places the Explorer entry next to Shade Equity in the service navigation row', async ({ page }, testInfo) => {
  await page.goto('/#/');
  const navigation = page.getByRole('navigation', { name: '服務目錄', exact: true });
  const button = navigation.getByRole('button', { name: '探索公共服務', exact: true });
  await expect(button).toBeAttached();
  expect(await button.evaluate((element) => element.previousElementSibling?.getAttribute('href'))).toBe('#/shade-equity');
  await button.focus();
  await expect(button).toBeInViewport();
  const shade = await navigation.locator('a[href="#/shade-equity"]').boundingBox();
  const explorer = await button.boundingBox();
  expect(Math.abs(shade.y + shade.height / 2 - explorer.y - explorer.height / 2)).toBeLessThan(2);
  await page.locator('header').screenshot({ path: testInfo.outputPath('header-inline-explorer.png') });
});

test('keeps Back to amenities map after the inline Explorer entry', async ({ page }) => {
  await page.goto('/#/swimming-pools');
  const navigation = page.getByRole('navigation', { name: '服務目錄', exact: true });
  const button = navigation.getByRole('button', { name: '探索公共服務', exact: true });
  await expect(button).toBeAttached();
  expect(await button.evaluate((element) => element.nextElementSibling?.getAttribute('href'))).toBe('#/');
});

for (const [hash, label, role, name] of destinations) {
  test(`opens ${label} through its existing native hash link`, async ({ page }) => {
    await page.goto(hash === '#/' ? '/#/swimming-pools' : '/#/');
    const surface = await openExplorer(page);
    const link = listLink(surface, hash);
    await expect(link).toHaveAccessibleName(new RegExp(label));
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${hash}$`));
    await expect(surface).toBeHidden();
    await expect(page.getByRole(role, { name, exact: true })).toBeVisible();
  });
}

test('preserves browser Back and Forward history across Explorer navigation', async ({ page }) => {
  await page.goto('/#/');
  await listLink(await openExplorer(page), '#/swimming-pools').click();
  await expect(page.getByRole('button', { name: '尋找游泳池', exact: true })).toBeVisible();
  await page.goBack();
  await expect(map(page)).toBeVisible();
  await expect(dialog(page)).toBeHidden();
  await page.goForward();
  await expect(page.getByRole('button', { name: '尋找游泳池', exact: true })).toBeVisible();
  await expect(dialog(page)).toBeHidden();
});

test('does not surface a Leaflet resize error during rapid route changes', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#/');
  await listLink(await openExplorer(page), '#/swimming-pools').click();
  await expect(page).toHaveURL(/#\/swimming-pools$/);
  await page.goBack();
  await expect(map(page)).toBeVisible();
  await page.goForward();
  await expect(page.getByRole('button', { name: '尋找游泳池', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('closes Explorer when browser history changes the active route', async ({ page }) => {
  await page.goto('/#/');
  await page.getByRole('navigation', { name: '服務目錄', exact: true })
    .getByRole('link', { name: '臺北市游泳池查詢', exact: true }).click();
  const surface = await openExplorer(page);
  await page.goBack();
  await expect(surface).toBeHidden();
  await expect(map(page)).toBeVisible();
});

test('reloads the selected module without reopening Explorer', async ({ page }) => {
  await page.goto('/#/');
  await listLink(await openExplorer(page), '#/swimming-pools').click();
  await expect(page).toHaveURL(/#\/swimming-pools$/);
  await page.reload();
  await expect(page.getByRole('button', { name: '尋找游泳池', exact: true })).toBeVisible();
  await expect(dialog(page)).toBeHidden();
});

test('navigates to an existing module without reloading the document', async ({ page }) => {
  await page.goto('/#/');
  const surface = await openExplorer(page);
  await page.locator('html').evaluate((element) => { element.dataset.explorerNavigationCheck = 'retained'; });
  await listLink(surface, '#/swimming-pools').click();
  await expect(page.getByRole('button', { name: '尋找游泳池', exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-explorer-navigation-check', 'retained');
});

test('closes Explorer when its destination is already the current route', async ({ page }) => {
  await page.goto('/#/');
  const surface = await openExplorer(page);
  await listLink(surface, '#/').click();
  await expect(surface).toBeHidden();
  await expect(page).toHaveURL(/#\/$/);
  await expect(map(page)).toBeVisible();
});

test('preserves native modified-click navigation in a separate tab', async ({ page, context }) => {
  await page.goto('/#/');
  const surface = await openExplorer(page);
  const newTab = context.waitForEvent('page');
  await listLink(surface, '#/swimming-pools').click({
    modifiers: [process.platform === 'darwin' ? 'Meta' : 'Control'],
  });
  const destination = await newTab;
  await expect(destination.getByRole('button', { name: '尋找游泳池', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/#\/$/);
  await expect(surface).toBeVisible();
  await destination.close();
});

test('opens with meaningful focus and restores the entry focus on Escape', async ({ page }) => {
  await page.goto('/#/');
  await tabTo(page, entry(page));
  await page.keyboard.press('Enter');
  const surface = dialog(page);
  await expect(surface.getByRole('heading', { name: '公共服務探索', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(surface).toBeHidden();
  await expect(entry(page)).toBeFocused();
});

test('reaches a module from the visual scene using only keyboard controls', async ({ page }) => {
  await page.goto('/#/');
  await tabTo(page, entry(page));
  await page.keyboard.press('Enter');
  const surface = dialog(page);
  await tabTo(page, surface.getByRole('button', { name: '主題圖', exact: true }));
  await page.keyboard.press('Enter');
  await tabTo(page, surface.locator('[data-explorer-group="facilities"]'));
  await page.keyboard.press('Enter');
  await tabTo(page, surface.getByRole('button', { name: /游泳池查詢/ }));
  await page.keyboard.press('Enter');
  await expect(surface.getByRole('heading', { name: '游泳池查詢', exact: true })).toBeFocused();
  await tabTo(page, surface.getByRole('link', { name: '開啟模組', exact: true }));
  await page.keyboard.press('Enter');
  await expect(surface).toBeHidden();
  await expect(page.locator('header h1')).toBeFocused();
  await expect(page.getByRole('button', { name: '尋找游泳池', exact: true })).toBeVisible();
  await page.goBack();
  await expect(map(page)).toBeVisible();
  await expect(entry(page)).toBeEnabled();
});

test('retains selected map filters after repeatedly closing Explorer', async ({ page }) => {
  await page.goto('/#/');
  const facility = page.getByRole('button', { name: '公廁', exact: true });
  const district = page.getByRole('combobox', { name: '行政區', exact: true });
  const query = page.getByPlaceholder('搜尋地址、路名、地點或設施名稱');
  await facility.click();
  await district.selectOption('大安區');
  await query.fill('公園');
  const surface = await openExplorer(page);
  await surface.getByRole('button', { name: '關閉探索', exact: true }).click();
  await openExplorer(page);
  await page.keyboard.press('Escape');
  await expect(facility).toHaveAttribute('aria-pressed', 'true');
  await expect(district).toHaveValue('大安區');
  await expect(query).toHaveValue('公園');
});

test('preserves the mounted map and its non-default view after closing Explorer', async ({ page }) => {
  await page.goto('/#/');
  const container = map(page);
  await expect(container).toBeVisible();
  const instance = await container.elementHandle();
  const pane = container.locator('.leaflet-map-pane');
  const paneTransform = () => pane.evaluate((element) => element.style.transform);
  const tileZoom = () => container.locator('img.leaflet-tile').evaluateAll((tiles) => Math.max(
    ...tiles.map((tile) => Number(new URL(tile.src).pathname.split('/')[1])),
  ));
  await expect.poll(tileZoom).toBe(13);
  await container.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect.poll(tileZoom).toBe(14);
  await expect(pane).not.toHaveClass(/leaflet-zoom-anim/);
  const defaultPosition = await paneTransform();
  await container.press('ArrowRight');
  await expect.poll(paneTransform).not.toBe(defaultPosition);
  await expect(pane).not.toHaveClass(/leaflet-pan-anim/);
  const pannedPosition = await paneTransform();

  const surface = await openExplorer(page);
  await surface.getByRole('button', { name: '關閉探索', exact: true }).click();
  expect(await container.evaluate((element, previous) => element === previous, instance)).toBe(true);
  expect(await paneTransform()).toBe(pannedPosition);
  expect(await tileZoom()).toBe(14);
});

test('does not request datasets when opening or closing Explorer', async ({ page }) => {
  const requests = [];
  page.on('request', (request) => {
    const { pathname } = new URL(request.url());
    if (pathname.startsWith('/data/')) requests.push(pathname);
  });
  await page.goto('/#/');
  await expect(map(page)).toBeVisible();
  expect(requests).toContain('/data/facilities.json');
  const initialRequests = [...requests];
  const surface = await openExplorer(page);
  await surface.getByRole('button', { name: '關閉探索', exact: true }).click();
  await expect(entry(page)).toBeFocused();
  expect(requests).toEqual(initialRequests);
});

test('updates the list and live result status when search has no matches', async ({ page }) => {
  await page.goto('/#/');
  const surface = await openExplorer(page);
  const search = surface.getByRole('searchbox');
  await search.fill('zzzz-no-matching-public-service');
  await expect(surface.getByRole('status')).toContainText(/0/);
  await expect(surface.locator('.civic-list').getByRole('link')).toHaveCount(0);
  await surface.getByRole('button', { name: '重設', exact: true }).click();
  await expect(search).toHaveValue('');
  await expect(surface.locator('.civic-list').getByRole('link')).toHaveCount(11);
});

test('limits the semantic list to the selected topic', async ({ page }) => {
  await page.goto('/#/');
  const surface = await openExplorer(page);
  await surface.getByRole('combobox', { name: '主題分類', exact: true })
    .selectOption({ label: '公共衛生與服務' });
  const links = surface.locator('.civic-list').getByRole('link');
  await expect(links).toHaveCount(2);
  await expect(links.nth(0)).toHaveAccessibleName(/廢藥回收站/);
  await expect(links.nth(1)).toHaveAccessibleName(/衛生認證浴室/);
});

test('switches from the topic scene back to the complete HTML list', async ({ page, isMobile }) => {
  await page.goto('/#/');
  const surface = await openExplorer(page);
  const scene = surface.getByRole('button', { name: '主題圖', exact: true });
  const list = surface.getByRole('button', { name: '清單', exact: true });
  if (isMobile) await scene.tap();
  else await scene.click();
  await expect(scene).toHaveAttribute('aria-pressed', 'true');
  await expect(surface.locator('.civic-scene').getByRole('button')).toHaveCount(4);
  if (isMobile) await list.tap();
  else await list.click();
  await expect(list).toHaveAttribute('aria-pressed', 'true');
  await expect(surface.locator('.civic-list').getByRole('link')).toHaveCount(11);
});

test('retains the English document language across Explorer navigation', async ({ page }) => {
  await page.goto('/#/');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  const surface = await openExplorer(page, true);
  const link = listLink(surface, '#/swimming-pools');
  await expect(link).toHaveAccessibleName(/Swimming/i);
  await link.click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(entry(page, true)).toBeVisible();
});

test('honors reduced motion for Explorer scene artwork', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/');
  const surface = await openExplorer(page);
  await surface.getByRole('button', { name: '主題圖', exact: true }).click();
  await expect(surface.locator('.island-lift').first()).toHaveCSS('transition-duration', '0s');
});

test('fits bilingual Explorer controls and destinations within the viewport', async ({ page, isMobile }, testInfo) => {
  for (const width of isMobile ? [320, 390] : [768, 1280]) {
    await page.setViewportSize({ width, height: isMobile ? 720 : 900 });
    await page.goto('/#/');
    for (const english of [false, true]) {
      if (english) await page.getByRole('button', { name: 'English', exact: true }).click();
      else await page.getByRole('button', { name: '中文', exact: true }).click();
      const surface = await openExplorer(page, english);
      await expect(listLink(surface, '#/industrial-waste-reuse-operators')).toBeVisible();
      const hasOverflow = await surface.locator('.amenities-explorer-body')
        .evaluate((element) => element.scrollWidth > element.clientWidth + 1);
      expect(hasOverflow, `${english ? 'English' : 'Traditional Chinese'} at ${width}px`).toBe(false);
      if (english) await page.screenshot({ path: testInfo.outputPath(`explorer-en-${width}px.png`) });
      await listLink(surface, '#/shade-equity').scrollIntoViewIfNeeded();
      const close = surface.getByRole('button', { name: english ? 'Close Explorer' : '關閉探索', exact: true });
      await expect(close).toBeInViewport({ ratio: 1 });
      await close.click();
    }
  }
});
