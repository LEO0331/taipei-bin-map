import { describe, expect, it } from 'vitest';
import { convertPublicSchoolSportsVenueRows, detectSports, parseOpeningSchedules } from './convertPublicSchoolSportsVenues';

describe('public school sports venue conversion', () => {
  it('only detects explicit sport phrases and never infers pickleball', () => {
    expect(detectSports('羽球場、籃球場與匹克球場開放')).toMatchObject({ detectedSports: ['badminton', 'basketball', 'pickleball'], detectedFacilityLabels: ['羽球', '籃球', '匹克球'] });
    expect(detectSports('籃球場及羽球場開放')).toMatchObject({ detectedSports: ['badminton', 'basketball'] });
  });

  it('preserves source codes and opening text while assigning non-booking status conservatively', () => {
    const converted = convertPublicSchoolSportsVenueRows([{ 序號: '001', 校名: '測試國小', 行政區: '大安區', 郵遞區號: '106', 機關代碼: '001234567Y', 縣市別代碼: '63000', 校園場地開放時間: '週一至週五 17:30-21:30；六日 08:00-18:00 羽球場' }]);
    expect(converted.records[0]).toMatchObject({ id: '001234567Y', sourceSequenceNumber: '001', postalCode: '106', agencyCode: '001234567Y', cityCode: '63000', bookingStatus: 'contact_school', detectedSports: ['badminton'] });
    expect(converted.records[0].parsedSchedules).toHaveLength(2);
  });

  it('does not parse construction or closed notices as an opening schedule', () => {
    expect(parseOpeningSchedules('因施工未開放')).toEqual([]);
  });
});
