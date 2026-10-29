import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShadeEquitySourceHealth } from './ShadeEquitySourceHealth';
import type { ShadeEquitySource } from '../types/shadeEquity';

const sources: ShadeEquitySource[] = ['a', 'b'].map(id => ({ id, name: `來源${id}`, provider: '主管機關', datasetId: `dataset-${id}`, resourceId: `resource-${id}`, url: 'https://data.taipei/', sha256: id.repeat(64), suitability: 'limited', sourceUpdatedAt: '2026-10-21T15:41:01+08:00', rawCount: 10, acceptedCount: 9 }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const open = (name = '來源a') => fireEvent.click(screen.getByText(name));

describe('source evidence accordion', () => {
  it('shows the source update day without expanding provenance', () => {
    render(<ShadeEquitySourceHealth language="zh" sources={sources}/>);
    expect(screen.getAllByText('2026-10-21')).toHaveLength(2);
  });
  it('keeps all source rows collapsed initially', () => {
    const { container } = render(<ShadeEquitySourceHealth language="zh" sources={sources}/>);
    expect(container.querySelectorAll('.shade-source-accordion[open]')).toHaveLength(0);
  });
  it('keeps each disclosure control linked to an existing panel while collapsed', () => {
    const { container } = render(<ShadeEquitySourceHealth language="zh" sources={sources}/>);
    for (const header of container.querySelectorAll('.shade-source-header')) {
      expect(document.getElementById(header.getAttribute('aria-controls')!)).toHaveAttribute('hidden');
    }
  });
  it('closes the previous source when another source opens', () => {
    const { container } = render(<ShadeEquitySourceHealth language="zh" sources={sources}/>);
    open(); open('來源b');
    const rows = container.querySelectorAll<HTMLDetailsElement>('.shade-source-accordion');
    expect([...rows].map(row => row.open)).toEqual([false, true]);
  });
  it('allows the active source to close again', () => {
    const { container } = render(<ShadeEquitySourceHealth language="zh" sources={sources}/>);
    open(); open();
    expect(container.querySelectorAll('.shade-source-accordion[open]')).toHaveLength(0);
  });
  it('keeps technical identifiers behind a second disclosure', () => {
    render(<ShadeEquitySourceHealth language="zh" sources={sources}/>); open();
    expect(screen.queryByText('dataset-a')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('技術資訊'));
    expect(screen.getByText('dataset-a')).toBeVisible();
  });
  it('resets the technical disclosure when a different source is selected', () => {
    render(<ShadeEquitySourceHealth language="zh" sources={sources}/>); open();
    fireEvent.click(screen.getByText('技術資訊')); open('來源b'); open();
    expect(screen.queryByText('dataset-a')).not.toBeInTheDocument();
  });
  it('copies the exact dataset identifier', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined); vi.stubGlobal('navigator', { clipboard: { writeText } });
    render(<ShadeEquitySourceHealth language="zh" sources={sources}/>); open(); fireEvent.click(screen.getByText('技術資訊'));
    fireEvent.click(screen.getByRole('button', { name: '複製資料集 ID' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('dataset-a'));
  });
  it('copies the complete hash rather than its displayed prefix', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined); vi.stubGlobal('navigator', { clipboard: { writeText } });
    render(<ShadeEquitySourceHealth language="en" sources={sources}/>); open(); fireEvent.click(screen.getByText('Technical information'));
    fireEvent.click(screen.getByRole('button', { name: 'Copy SHA256' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('a'.repeat(64)));
  });
  it('copies the resource identifier rather than the dataset identifier', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined); vi.stubGlobal('navigator', { clipboard: { writeText } });
    render(<ShadeEquitySourceHealth language="en" sources={sources}/>); open(); fireEvent.click(screen.getByText('Technical information'));
    fireEvent.click(screen.getByRole('button', { name: 'Copy Resource ID' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('resource-a'));
  });
  it('reports manual-copy guidance when clipboard access is denied', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    render(<ShadeEquitySourceHealth language="en" sources={sources}/>); open(); fireEvent.click(screen.getByText('Technical information'));
    fireEvent.click(screen.getByRole('button', { name: 'Copy Dataset ID' }));
    expect(await screen.findByRole('status')).toHaveTextContent('select the text and copy it manually');
  });
  it('does not offer to copy an unknown hash', () => {
    render(<ShadeEquitySourceHealth language="en" sources={[{ ...sources[0], sha256: null }]}/>); open(); fireEvent.click(screen.getByText('Technical information'));
    expect(screen.queryByRole('button', { name: 'Copy SHA256' })).not.toBeInTheDocument();
  });
  it('keeps identifiers readable when the Clipboard API is unavailable', async () => {
    vi.stubGlobal('navigator', {});
    render(<ShadeEquitySourceHealth language="en" sources={sources}/>); open(); fireEvent.click(screen.getByText('Technical information'));
    fireEvent.click(screen.getByRole('button', { name: 'Copy Dataset ID' }));
    expect(await screen.findByRole('status')).toHaveTextContent('copy it manually');
    expect(screen.getByText('dataset-a')).toBeVisible();
  });
});
