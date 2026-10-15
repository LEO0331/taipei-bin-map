import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { translations } from '../i18n';
import { MapLegend } from './MapLegend';

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('MapLegend', () => {
  it('renders nothing when neither a facility nor a location is active', () => {
    const { container } = render(<MapLegend t={translations.zh} language="zh" selectedTypes={[]} hasUserLocation={false} />);
    expect(container).toBeEmptyDOMElement();
  });
  it('renders the location legend only when a location exists', () => {
    render(<MapLegend t={translations.zh} language="zh" selectedTypes={[]} hasUserLocation />);
    expect(screen.getByText(translations.zh.userLocation)).toHaveTextContent('📍');
  });
  it('does not advertise a user location before geolocation succeeds', () => {
    render(<MapLegend t={translations.zh} language="zh" selectedTypes={['public_toilet']} hasUserLocation={false} />);
    expect(screen.queryByText(translations.zh.userLocation)).not.toBeInTheDocument();
  });
  it('updates the legend when the language changes', () => {
    const { rerender } = render(<MapLegend t={translations.zh} language="zh" selectedTypes={['public_toilet']} hasUserLocation={false} />);
    rerender(<MapLegend t={translations.en} language="en" selectedTypes={['public_toilet']} hasUserLocation={false} />);
    expect(screen.getByText('Public Toilet')).toBeInTheDocument();
  });
  it('disappears when the selected facility is deselected', () => {
    const { rerender, container } = render(<MapLegend t={translations.zh} language="zh" selectedTypes={['public_toilet']} hasUserLocation={false} />);
    rerender(<MapLegend t={translations.zh} language="zh" selectedTypes={[]} hasUserLocation={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
