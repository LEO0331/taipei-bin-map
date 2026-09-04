import { describe, expect, it } from 'vitest';
import { convertIndustrialWasteReuseOperatorRows } from './convertIndustrialWasteReuseOperators';

describe('convertIndustrialWasteReuseOperatorRows', () => {
  it('excludes rows with neither an operator name nor a control number', () => {
    const { records } = convertIndustrialWasteReuseOperatorRows([
      {
        項次: '1',
        管制編號: '',
        機構名稱: '',
        '最大月再利用量（公噸/月）': '12.5',
      },
      {
        項次: '2',
        管制編號: 'A-001',
        機構名稱: '可識別機構',
        '最大月再利用量（公噸/月）': '12.5',
      },
    ]);

    expect(records).toHaveLength(1);
    expect(records[0].operatorName).toBe('可識別機構');
  });
});
