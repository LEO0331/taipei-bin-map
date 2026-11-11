import { describe, expect, it } from 'vitest';
import { directoryRoutes } from '../../directoryRoutes';
import { createAmenitiesExplorerModel } from './amenitiesExplorerModel';

const expectedGroups = [
  ['facilities', ['amenities-map', 'school-sports', 'cooling-spots', 'swimming-pools']],
  ['environment', ['bulky-waste', 'industrial-reuse', 'recycling-analytics']],
  ['health', ['medicine-collection', 'certified-bathhouses']],
  ['policy', ['bin-policy', 'shade-equity']],
];

const expectedTargets = [
  '#/', '#/public-school-sports-venues', '#/cooling-comfort-spots', '#/swimming-pools',
  '#/bulky-waste-collection-booking', '#/industrial-waste-reuse-operators', '#/recycling-analytics',
  '#/unused-medicine-collection-stations', '#/certified-bathhouses', '#/bin-policy', '#/shade-equity',
];

describe('Civic Explorer navigation model', () => {
  it('assigns all destinations to the four ordered themes', () => {
    const { groups } = createAmenitiesExplorerModel('zh');
    expect(groups.map(({ id, nodeIds }) => [id, nodeIds])).toEqual(expectedGroups);
  });

  it('maps every destination to its exact existing hash', () => {
    expect(createAmenitiesExplorerModel('en').nodes.map(({ target }) => target.href)).toEqual(expectedTargets);
  });

  it('represents each existing route exactly once', () => {
    const { nodes } = createAmenitiesExplorerModel('en');
    expect(nodes.map(({ target }) => target.href).sort()).toEqual(['', ...directoryRoutes].map((route) => `#/${route}`).sort());
  });

  it.each(['zh', 'en'] as const)('passes generic model validation for %s', (language) => {
    expect(createAmenitiesExplorerModel(language).validation).toEqual([]);
  });

  it('localizes the eleven destination labels without changing their identities', () => {
    const zh = createAmenitiesExplorerModel('zh');
    const en = createAmenitiesExplorerModel('en');
    expect(zh.nodes.map(({ id }) => id)).toEqual(en.nodes.map(({ id }) => id));
    expect(zh.nodes.map(({ label }) => label)).toEqual([
      '公共設施主地圖', '公立學校運動場地', '臺北涼適點', '游泳池查詢', '大型廢棄物清運',
      '工業廢棄物再利用', '資源回收統計', '廢藥回收站', '衛生認證浴室', '清潔箱配置決策支援', '樹蔭公平研究',
    ]);
    expect(en.nodes.every(({ label }) => /^[A-Z]/.test(label))).toBe(true);
  });

  it('does not share mutable navigation objects between model instances', () => {
    const first = createAmenitiesExplorerModel('en');
    first.nodes[0].target.href = '#/wrong';
    expect(createAmenitiesExplorerModel('en').nodes[0].target.href).toBe('#/');
  });
});
