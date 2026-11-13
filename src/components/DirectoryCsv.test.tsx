import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import Papa from 'papaparse';
import { afterEach, expect, it, vi } from 'vitest';
import { CertifiedBathhousesDashboard } from './CertifiedBathhousesDashboard';
import { SwimmingPoolsDashboard } from './SwimmingPoolsDashboard';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsText(blob);
  });
}

function mockDownload() {
  const capture = vi.fn((_blob: Blob) => 'blob:test-csv');
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL = capture;
    static revokeObjectURL = vi.fn();
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  return capture;
}

it('downloads filtered swimming pools with quoted names and literal text fields', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => [
    { id: '001', venueName: '泳池 "A"', operatorTypeRaw: '公營', operatorType: 'public', districtName: '大安區', address: '路段, 42', phone: '+886123', extension: '' },
    { id: '002', venueName: '泳池 B', operatorTypeRaw: '公營', operatorType: 'public', districtName: '中山區', address: '路段 43', phone: '', extension: '' },
  ] })));
  const capture = mockDownload();
  render(<SwimmingPoolsDashboard language="en" />);
  await screen.findByText('泳池 "A"');
  fireEvent.change(screen.getByLabelText('District'), { target: { value: '大安區' } });
  fireEvent.click(screen.getByRole('button', { name: 'Download filtered CSV' }));
  expect(capture).toHaveBeenCalledTimes(1);
  const parsed = Papa.parse<string[]>(await readBlob(capture.mock.calls[0][0]));
  expect(parsed.errors).toEqual([]);
  expect(parsed.data).toEqual([
    ['ID', 'Venue', 'Operator', 'District', 'Address', 'Phone'],
    ['001', '泳池 "A"', '公營', '大安區', '路段, 42', "'+886123"],
  ]);
});

it('downloads a bathhouse name containing double quotes in one CSV cell', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => [
    { id: '001', category: '浴室', name: '浴室 "A"', address: '臺北路 42', certificationResult: '優', certificationValidUntilRaw: '2027/12/31', certificationValidUntil: null, districtName: '大安區', certificationStatus: 'valid' },
  ] })));
  const capture = mockDownload();
  render(<CertifiedBathhousesDashboard language="en" />);
  await screen.findByText('浴室 "A"');
  fireEvent.click(screen.getByRole('button', { name: 'Download filtered CSV' }));
  expect(capture).toHaveBeenCalledTimes(1);
  const parsed = Papa.parse<string[]>(await readBlob(capture.mock.calls[0][0]));
  expect(parsed.errors).toEqual([]);
  expect(parsed.data[1]).toEqual(['浴室', '浴室 "A"', '臺北路 42', '優', '2027/12/31']);
});
