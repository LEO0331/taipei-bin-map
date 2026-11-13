import Papa from 'papaparse';
import { describe, expect, it } from 'vitest';
import { serializeCsv } from './serializeCsv';

describe('serializeCsv', () => {
  it('round trips quoted, multiline, and non-ASCII cells without changing columns', () => {
    const result = serializeCsv([['名稱', '地址'], ['站點 "A"', '路段, 42\n二樓']]);
    expect(result.startsWith('\uFEFF')).toBe(true);
    expect(result).toContain('\r\n');
    const parsed = Papa.parse<string[]>(result);
    expect(parsed.errors).toEqual([]);
    expect(parsed.data).toEqual([['名稱', '地址'], ['站點 "A"', '路段, 42\n二樓']]);
  });

  it.each(['=1', '+2', '-3', '@name', '  =1', '\t文字', '\r文字', '\n文字', '＝1', '\u200b=1'])(
    'preserves spreadsheet-sensitive text as literal data: %j', value => {
      expect(Papa.parse<string[]>(serializeCsv([['label'], [value]])).data[1]).toEqual([`'${value}`]);
    },
  );

  it('keeps finite numbers numeric-looking and missing values empty', () => {
    expect(serializeCsv([[-1.5, 0, null, undefined, '001']])).toBe('\uFEFF"-1.5","0","","","001"');
  });
});
