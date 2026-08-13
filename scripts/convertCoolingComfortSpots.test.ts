import { describe, expect, it } from 'vitest';
import { convertCoolingComfortSpotRows, normalizeAmenity, parseOpeningHours } from './convertCoolingComfortSpots';

describe('cooling comfort spot conversion', () => {
  it('normalizes only understood amenity values and preserves original source fields', () => {
    expect(normalizeAmenity('Y')).toBe('yes'); expect(normalizeAmenity('N')).toBe('no'); expect(normalizeAmenity('部分開放')).toBe('conditional'); expect(normalizeAmenity('')).toBe('unknown');
    const result = convertCoolingComfortSpotRows([{ 編號: '001', '設施地點（戶外或室內）': '室內', 名稱: '測試涼適點', 行政區: '大安區', 地址: '臺北市大安區測試路 1 號', 經度: '121.5432', 緯度: '25.0268', 市話: '(02)2700-0000', 分機: '012', 開放時間: '24小時', 電風扇: 'N', 冷氣: 'Y', 廁所: 'Y', 座位: 'Y', '飲水設施（例如：飲水機；直飲台；奉茶點等）': 'Y', 無障礙座位: '部分開放', 其他特色及亮點: '室內休息區', 備註: '請依公告' }]);
    expect(result.records[0]).toMatchObject({ id: '001', environment: 'indoor', hasValidCoordinates: true, extension: '012', airConditioningAvailability: 'yes', accessibleSeatingAvailability: 'conditional', openingHoursRaw: '24小時' });
    expect(result.records[0].parsedOpeningHours.parseConfidence).toBe('high');
  });
  it('keeps bad coordinates in the directory rather than inventing a map point', () => {
    const result = convertCoolingComfortSpotRows([{ 編號: '2', '設施地點（戶外或室內）': '戶外', 名稱: '座標測試', 行政區: '中正區', 地址: '臺北市中正區測試路', 經度: '25.01', 緯度: '121.51', 電風扇: 'N', 冷氣: 'N', 廁所: 'N', 座位: 'N', '飲水設施（例如：飲水機；直飲台；奉茶點等）': 'N', 無障礙座位: 'N' }]);
    expect(result.records[0]).toMatchObject({ hasValidCoordinates: false, longitude: null, latitude: null }); expect(result.summary.dataQuality.reversedCoordinateCandidates).toEqual([2]);
  });
  it('parses always-open source text without claiming exception handling', () => expect(parseOpeningHours('24小時').schedules[0]).toMatchObject({ start: '00:00', end: '24:00' }));
});
