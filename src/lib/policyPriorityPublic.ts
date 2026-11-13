import type { PolicyReference, PrioritySnapshot } from './policyPriorityTypes';

/** Keep normalized analytical evidence, not copies of source rows. */
export function publicPriorityPoint(point: PolicyReference): PolicyReference {
  const { id, name, district, latitude, longitude, sourceId, sourceRecord, precision, category, canonicalId, sourceVersion, limitations,
    geometryType, resourceId, sourcePublishedAt, retrievedAt, validatedAt, contentHash, originalRecordId, status } = point;
  return { id, name, district, latitude, longitude, sourceId, sourceRecord, precision, category, canonicalId, sourceVersion, limitations,
    geometryType, resourceId, sourcePublishedAt, retrievedAt, validatedAt, contentHash, originalRecordId, status };
}

const record = (value: unknown) => value && typeof value === 'object' ? value as Record<string, unknown> : {};
const count = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const contextSources = ['commercial_introduction', 'commercial_associations'] as const;

export function publicPriorityQuality(quality: PrioritySnapshot['quality']): PrioritySnapshot['quality'] {
  const rows = Array.isArray(quality.contextualRecords) ? quality.contextualRecords : undefined;
  const savedCounts = record(quality.contextualCounts);
  const contextualCounts = Object.fromEntries(contextSources.flatMap(sourceId => {
    if (rows) return [[sourceId, rows.filter(row => record(row).sourceId === sourceId).length]];
    return count(savedCounts[sourceId]) ? [[sourceId, savedCounts[sourceId]]] : [];
  }));
  const numericFields = (value: unknown) => Object.fromEntries(
    Object.entries(record(value)).filter(([, number]) => count(number) || number === null),
  );
  return {
    exclusions: quality.exclusions.map(value => {
      const row = record(value);
      return Object.fromEntries(['source', 'sourceId', 'id', 'originalRecordId', 'canonicalId', 'reason']
        .filter(key => typeof row[key] === 'string' || typeof row[key] === 'number').map(key => [key, row[key]]));
    }),
    originalCounts: numericFields(quality.originalCounts),
    includedByCategory: numericFields(quality.includedByCategory),
    contextualCounts,
    ...(typeof quality.canonicalPolicy === 'string' ? { canonicalPolicy: quality.canonicalPolicy } : {}),
  };
}

/** Publication boundary; frozen acquisition and offline review evidence remain untouched. */
export function publicPrioritySnapshot(snapshot: PrioritySnapshot): PrioritySnapshot {
  return { ...snapshot, references: snapshot.references.map(publicPriorityPoint), quality: publicPriorityQuality(snapshot.quality) };
}
