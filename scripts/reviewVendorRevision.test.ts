import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { compareVendorRows, readVendorCsv } from './reviewVendorRevision';

const reviewDirectory = 'reports/issues-27-28-2026-11/vendor';
const frozenDirectory = 'data/raw/bin-policy-priority/markets/markets-dda160fd187e17b6';
const frozen = readFileSync(`${frozenDirectory}/vendor_concentrations.csv`);
const revised = gunzipSync(readFileSync(`${reviewDirectory}/vendor_concentrations.csv.gz`));

describe('Issue #27 vendor audit', () => {
  it('replays the exact vendor bytes seen in the November 9 monitor', () => {
    expect(createHash('sha256').update(revised).digest('hex')).toBe('0e6da1861b242dbf1e4a6e6888d0b862b70c469a49e15ae4b298beb7ca87090c');
  });

  it('keeps the frozen vendor baseline bytes unchanged', () => {
    expect(createHash('sha256').update(frozen).digest('hex')).toBe('d45216082540afcbb5e059af51ea00aa85d028478dd3f81aaafb18d309545e45');
  });

  it('rejects a vendor CSV missing the official address field', () => {
    const invalid = Buffer.from('seqno,stitle,xbody,xcreatedDate,xstartTime,xendTime,GTag_longitude,GTag_latitude\n1,one,name,day,10:00,20:00,121.5,25\n');
    expect(() => readVendorCsv(invalid, 'UTF-8')).toThrow(/schema mismatch.*xAddress/);
  });

  it('does not use a reused source sequence to pair two different places', () => {
    const before = readVendorCsv(frozen, 'CP950').rows;
    const after = readVendorCsv(revised, 'CP950').rows;
    const pairs = compareVendorRows(before, after).supportedPairs;
    expect(pairs.find(pair => pair.after.id === '1')?.before.id).toBe('2');
  });

  it('leaves two-to-one operating schedule records unresolved at row level', () => {
    const before = readVendorCsv(frozen, 'CP950').rows;
    const after = readVendorCsv(revised, 'CP950').rows;
    const groups = compareVendorRows(before, after).ambiguousGroups;
    expect(groups.find(group => group.revised[0].id === '29')?.old.map(row => row.id)).toEqual(['28', '29']);
  });
});
