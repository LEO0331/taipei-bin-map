import { useEffect, useState } from 'react';

export function isReportObject(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

export function reportMatchesSnapshot(input: unknown, snapshotId: string) {
  return isReportObject(input) && input.schemaVersion === 1 &&
    (input.policySnapshotId === snapshotId || input.snapshotId === snapshotId);
}

// A screening warning, not a publisher's guaranteed update schedule.
export function sourceIsStale(sourceDate: string | null, now = new Date()): boolean | null {
  if (!sourceDate || !Number.isFinite(Date.parse(sourceDate))) return null;
  return now.getTime() - Date.parse(sourceDate) > 365 * 86400000;
}

export function usePolicyReport(path: string, snapshotId: string, enabled = true) {
  const [state, setState] = useState<{ data: Record<string, unknown> | null; status: 'loading' | 'ready' | 'unavailable' }>({ data: null, status: 'loading' });
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setState({ data: null, status: 'loading' });
    fetch(`${import.meta.env.BASE_URL}data/bin-policy/${path}`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Report unavailable'); return response.json() as Promise<unknown>; })
      .then(data => {
        if (!reportMatchesSnapshot(data, snapshotId) || !isReportObject(data)) throw new Error('Evidence belongs to another snapshot or schema');
        setState({ data, status: 'ready' });
      })
      .catch(() => { if (!controller.signal.aborted) setState({ data: null, status: 'unavailable' }); });
    return () => controller.abort();
  }, [path, snapshotId, enabled]);
  return state;
}
