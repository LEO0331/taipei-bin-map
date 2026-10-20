import type { ShadeEquitySnapshot } from '../types/shadeEquity';
import { validateShadeEquitySnapshot as validateEngineSnapshot } from './shadeEquityDecision';

/** One shared schema contract; record-level exclusions are retained by the decision engine. */
export function validateShadeEquitySnapshot(input: unknown): ShadeEquitySnapshot {
  validateEngineSnapshot(input);
  if (input.comparability.eligible && (!input.segments.length || !input.sources.some(source => source.suitability === 'verified_analysis'))) {
    throw new Error('Comparable coverage requires validated source evidence');
  }
  return input;
}

export function shadeDataUrl(filename: string, base = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/'): string {
  if (!/^[a-zA-Z0-9_-]+\.json$/.test(filename)) throw new Error('Invalid static dataset filename');
  return `${base.endsWith('/') ? base : base + '/'}data/shade-equity/${filename}`;
}

export async function loadShadeEquitySnapshot(signal?: AbortSignal, district = ''): Promise<ShadeEquitySnapshot> {
  const response = await fetch(shadeDataUrl('snapshot.json'), { signal });
  if (!response.ok) throw new Error(`Shade Equity data unavailable (${response.status})`);
  const snapshot = validateShadeEquitySnapshot(await response.json());
  const index = snapshot as ShadeEquitySnapshot & { districtChunks?: Record<string, string>; segmentCoverage?: string };
  if (!district || !index.districtChunks) return snapshot;
  const filename = index.districtChunks[district];
  if (!filename) throw new Error('District is outside the audited source coverage');
  const chunkResponse = await fetch(shadeDataUrl(filename), { signal });
  if (!chunkResponse.ok) throw new Error(`Shade district unavailable (${chunkResponse.status})`);
  const chunk = await chunkResponse.json() as Record<string, unknown> | null;
  if (!chunk || typeof chunk !== 'object' || chunk.schemaVersion !== 1 || chunk.snapshotId !== snapshot.snapshotId || chunk.district !== district || !Array.isArray(chunk.segments) || chunk.segments.some((segment: unknown) => !segment || typeof segment !== 'object' || (segment as { district?: unknown }).district !== district)) throw new Error('District chunk identity or geographic scope mismatch');
  return validateShadeEquitySnapshot({ ...snapshot, segments: chunk.segments, segmentCoverage: `loaded_district:${district}` });
}
