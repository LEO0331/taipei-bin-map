import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
const snapshot=JSON.parse(readFileSync(new URL('../../public/data/bin-policy/analysis.json',import.meta.url),'utf8'));

test('ordinary discovery does not request the policy GIS snapshot',async({page})=>{
  const policyRequests=[];page.on('request',r=>{if(r.url().includes('/data/bin-policy/'))policyRequests.push(r.url())});
  await page.goto('/');await expect(page.locator('.facility-type-layer')).toBeVisible();
  expect(policyRequests).toEqual([]);
});
test('policy route loads source-backed coverage and returns to facility discovery',async({page},testInfo)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/#/bin-policy');await expect(page.getByRole('heading',{name:'清潔箱配置決策支援',exact:true})).toBeVisible();
  await expect(page.locator('#policy-problem')).toContainText(String(snapshot.references.length));
  await expect(page.locator('.policy-leaflet-map')).toBeVisible();
  await page.locator('#policy-scenarios').screenshot({path:testInfo.outputPath('policy-scenarios.png')});
  await page.locator('#policy-distribution').screenshot({path:testInfo.outputPath('policy-map.png')});
  await page.getByRole('link',{name:'返回設施地圖',exact:true}).click();await expect(page.locator('.facility-type-layer')).toBeVisible();expect(errors).toEqual([]);
});
test('zero additions keeps scenario B equal to the baseline',async({page})=>{
  await page.goto('/#/bin-policy');await page.getByLabel('新增箱數上限').fill('0');await page.getByRole('button',{name:'套用情境',exact:true}).click();
  await expect(page.getByTestId('policy-gain')).toContainText('B 新增覆蓋（無重複計數）：0');
  await expect(page.locator('.policy-candidate-list li')).toHaveCount(0);
});
test('budget with a user-provided unit cost limits the candidate count',async({page})=>{
  await page.goto('/#/bin-policy');await page.getByLabel('每箱假設成本').fill('100');await page.getByLabel('可用假設預算').fill('100');await page.getByRole('button',{name:'套用情境',exact:true}).click();
  await expect(page.locator('.policy-candidate-list li')).toHaveCount(1);
});
test('briefing JSON export retains scenario evidence and source provenance',async({page})=>{
  await page.goto('/#/bin-policy');const event=page.waitForEvent('download');await page.getByRole('button',{name:'匯出決策摘要 JSON'}).click();const file=await event;
  const exported=JSON.parse(readFileSync(await file.path(),'utf8'));
  expect(exported.snapshotId).toBe(snapshot.snapshotId);expect(exported.sources).toHaveLength(3);expect(exported.scenarioB.methodology).toBe('greedy-equal-reference-coverage-v1');expect(exported.scenarioB.selected[0].newlyCoveredIds.length).toBeGreaterThan(0);
});
test('CSV export includes methodology and individual candidate source identity',async({page})=>{
  await page.goto('/#/bin-policy');const event=page.waitForEvent('download');await page.getByRole('button',{name:'匯出候選點 CSV'}).click();const file=await event;const exported=readFileSync(await file.path(),'utf8');
  expect(exported).toContain('source_resource_id');expect(exported).toContain('greedy-equal-reference-coverage-v1');expect(exported).toContain(snapshot.snapshotId);
});
test('policy controls and evidence labels follow the English UI preference',async({page})=>{
  await page.goto('/#/bin-policy');await page.getByRole('button',{name:'English',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Public Bin Allocation Decision Support',exact:true})).toBeVisible();await expect(page.getByLabel('Target district')).toBeVisible();
  await expect(page.locator('#policy-candidates')).toContainText('Field Review Candidate');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
test('invalid policy snapshot displays a retry state without candidate suggestions',async({page})=>{
  await page.route('**/data/bin-policy/analysis.json',route=>route.fulfill({json:{schemaVersion:99}}));await page.goto('/#/bin-policy');
  await expect(page.getByRole('alert')).toContainText('政策資料無法載入');await expect(page.getByRole('button',{name:'重試',exact:true})).toBeVisible();await expect(page.locator('.policy-candidate-list')).toHaveCount(0);
});
