import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AmenitiesExplorerContent from './AmenitiesExplorerContent';

describe('Civic Explorer content', () => {
  it('offers a native link for every service in the default list', () => {
    render(<AmenitiesExplorerContent language="en" />);
    expect(within(screen.getByRole('region', { name: 'Service list' })).getAllByRole('link')).toHaveLength(11);
  });

  it('finds a service by its Chinese name in the English interface', () => {
    render(<AmenitiesExplorerContent language="en" />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '臺北涼適點' } });
    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(['#/cooling-comfort-spots']);
  });

  it('announces an empty search result', () => {
    render(<AmenitiesExplorerContent language="en" />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'not-a-service' } });
    expect(screen.getByRole('status')).toHaveTextContent('Showing 0 of 11 services');
  });

  it('resets the filtered list to all destinations', () => {
    render(<AmenitiesExplorerContent language="en" />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Topic' }), { target: { value: 'policy' } });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'shade' } });
    fireEvent.click(screen.getByRole('button', { name: /^Reset/ }));
    expect(screen.getAllByRole('link')).toHaveLength(11);
  });

  it('presents the selected service detail without navigating', () => {
    render(<AmenitiesExplorerContent language="en" />);
    fireEvent.click(screen.getByRole('button', { name: 'Swimming Pool Finder' }));
    const detail = screen.getByRole('complementary', { name: 'Swimming Pool Finder' });
    expect(within(detail).getByRole('link', { name: 'Open module' })).toHaveAttribute('href', '#/swimming-pools');
  });

  it('renders the existing selection in the newly selected language', () => {
    const { rerender } = render(<AmenitiesExplorerContent language="en" />);
    fireEvent.click(screen.getByRole('button', { name: 'Swimming Pool Finder' }));
    rerender(<AmenitiesExplorerContent language="zh" />);
    expect(screen.getByRole('complementary', { name: '游泳池查詢' })).toBeVisible();
  });
});
