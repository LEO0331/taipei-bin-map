import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
const snapshot = JSON.parse(readFileSync(new URL('../../public/data/bin-policy/priority-references.json', import.meta.url), 'utf8'));
async function openPriority(page) {
  await page.goto('/#/bin-policy');
  await page.getByLabel('分析模式', { exact: true }).selectOption('priority');
  await expect(page.getByRole('heading', { name: '政策優先配置研究', exact: true })).toBeVisible();
}
test.beforeEach(async ({ page }) => {
  await page.route('https://tile.openstreetmap.org/**', route => route.abort());
});

test('does not load priority sources until Mode B is explicitly selected', async ({ page }) => {
  const requests = [];
  page.on('request', request => { if (request.url().includes('priority-references.json')) requests.push(request.url()); });
  await page.goto('/#/bin-policy');
  await expect(page.getByTestId('policy-gain')).toBeVisible();
  expect(requests).toEqual([]);
  await page.getByLabel('分析模式', { exact: true }).selectOption('priority');
  await expect(page.locator('#priority-coverage')).toBeVisible();
  // React StrictMode may start and abort the first development-only effect.
  expect(requests.length).toBeGreaterThan(0);
});
test('shows all documented weights and marks missing categories without redistributing them', async ({ page }, testInfo) => {
  await openPriority(page);
  await expect(page.getByLabel('權重: 觀光景點', { exact: true })).toHaveValue('4');
  await expect(page.getByLabel('權重: 夜市／官方攤販集中場', { exact: true })).toHaveValue('4');
  await expect(page.locator('.priority-weight-grid')).toContainText('不是零需求');
  await page.locator('#priority-controls').screenshot({ path: testInfo.outputPath('priority-controls.png') });
});
test('resets edited weights to their documented versioned defaults', async ({ page }) => {
  await openPriority(page);
  const bus = page.getByLabel('權重: 公車站位參考位置', { exact: true });
  await bus.fill('5');
  await page.getByRole('button', { name: '重設文件預設權重', exact: true }).click();
  await expect(bus).toHaveValue('1');
});
test('applies budget limits to policy candidates', async ({ page }) => {
  await openPriority(page);
  await page.getByLabel('每箱假設成本（NT$）', { exact: true }).fill('100');
  await page.getByLabel('假設預算（NT$）', { exact: true }).fill('100');
  await page.getByRole('button', { name: '執行政策情境', exact: true }).click();
  await expect(page.locator('#priority-candidates .policy-candidate-list > li')).toHaveCount(1);
});
test('exports independently versioned method, weights, bus population and category evidence', async ({ page }) => {
  await openPriority(page);
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: '匯出政策摘要 JSON', exact: true }).click();
  const file = await event;
  const report = JSON.parse(readFileSync(await file.path(), 'utf8'));
  expect(report.methodology).toBe('policy-balanced-coverage-v1');
  expect(report.weightConfiguration).toBe('policy-priority-weights-v1');
  expect(report.busSourceVersion).toBe(snapshot.busSourceVersion);
  expect(report.snapshotId).toBe(snapshot.snapshotId);
  expect(report.approvalStatus).toBe('review_required');
  expect(report.activeScenario.selected[0].contributions).toHaveProperty('bus');
  expect(report.scoreUnit).toContain('not persons, waste volume or policy effectiveness');
});
test('exports CSV with raw coverage separate from weighted contribution', async ({ page }) => {
  await openPriority(page);
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: '匯出政策分析 CSV', exact: true }).click();
  const content = readFileSync(await (await event).path(), 'utf8');
  expect(content).toContain('raw_incremental_coverage');
  expect(content).toContain('weighted_incremental_score');
  expect(content).toContain(snapshot.busSourceVersion);
  expect(content).toContain('scenario_summary');
});
test('keeps candidate explanation and sensitivity available without external tiles', async ({ page }) => {
  await openPriority(page);
  await expect(page.getByTestId('policy-tile-status')).toBeVisible();
  await expect(page.locator('#priority-candidates .policy-candidate-list > li').first()).toContainText('須現勘');
  await page.locator('#priority-sensitivity > details > summary').click();
  await expect(page.locator('#priority-sensitivity')).toContainText('未入選次數');
});
test('returns to the unchanged Mode A after a policy source-version failure', async ({ page }) => {
  await page.route('**/priority-references.json', route => route.fulfill({ json: { ...snapshot, baseSnapshotId: 'unrelated' } }));
  await page.goto('/#/bin-policy');
  await page.getByLabel('分析模式', { exact: true }).selectOption('priority');
  await expect(page.getByRole('alert')).toContainText('政策優先資料無法載入');
  await page.getByLabel('分析模式', { exact: true }).selectOption('transport');
  await expect(page.getByTestId('policy-gain')).toContainText('52');
});
test('keeps English controls and the report usable on narrow viewports', async ({ page }) => {
  await openPriority(page);
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Policy Priority Allocation Study', exact: true })).toBeVisible();
  await expect(page.getByLabel('Weight: Bus reference locations', { exact: true })).toHaveValue('1');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('runs citywide sensitivity on a four-times throttled browser without repeated render work', async ({ page }, testInfo) => {
  await openPriority(page);
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.getByLabel('分析行政區', { exact: true }).selectOption('');
  await page.getByLabel('新增箱數上限', { exact: true }).fill('10');
  const started = Date.now();
  await page.getByRole('button', { name: '執行政策情境', exact: true }).click();
  await expect(page.locator('#priority-candidates .policy-candidate-list > li')).toHaveCount(10, { timeout: 15000 });
  const elapsedMs = Date.now() - started;
  await testInfo.attach('citywide-throttled-interaction', { body: JSON.stringify({ elapsedMs, cpuThrottle: 4, snapshotId: snapshot.snapshotId, viewport: page.viewportSize(), interpretation: 'Browser simulation, not physical mobile hardware' }), contentType: 'application/json' });
  expect(elapsedMs).toBeLessThan(15000);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
});
