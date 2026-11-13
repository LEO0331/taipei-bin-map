import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { translations } from '../i18n';
import type { FacilityWithDistance } from '../types';
import { FacilityList } from './FacilityList';
import { FacilityPopup } from './FacilityPopup';

const t = translations.zh;
const base: FacilityWithDistance = {
  id: 'test', type: 'direct_drinking_station', district: '大安區', address: '測試地址',
  longitude: 121.54, latitude: 25.02, note: '', source: '測試來源',
};

afterEach(cleanup);

describe('facility link display', () => {
  it('renders the usable photo but hides a non-web maintenance link in a popup', () => {
    render(<FacilityPopup language="zh" t={t} facility={{
      ...base, maintenanceUrl: 'mailto:station@example.test', photoUrl: 'https://example.test/photo.png',
    }} />);
    expect(screen.queryByRole('link', { name: t.waterQualityMaintenanceInfo })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: t.photo })).toHaveAttribute('href', 'https://example.test/photo.png');
  });

  it('does not render an invalid smoking area photo link in a facility list', () => {
    render(<FacilityList heading="測試" language="zh" t={t} facilities={[{
      ...base, type: 'designated_smoking_area', photoUrl: '/unexpected-relative-url',
    }]} />);
    expect(screen.queryByRole('link', { name: t.photo })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: t.openGoogleMaps })).toBeInTheDocument();
  });
});
