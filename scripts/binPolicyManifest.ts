/** Re-downloading identical bytes is not approval to rewrite semantic source provenance. */
export function assertArchiveMetadata(previous: Array<Record<string, unknown>>, proposed: Array<Record<string, unknown>>) {
  const keys = ['id', 'filename', 'resourceId', 'sha256', 'resourceUpdatedAt', 'metadataUpdatedAt', 'encoding', 'crs', 'license', 'datasetId', 'datasetUrl', 'downloadUrl', 'provider', 'name', 'caveat'];
  if (previous.length !== proposed.length) throw new Error('Archive manifest conflict');
  for (const source of proposed) {
    const old = previous.find(item => item.id === source.id);
    if (!old || keys.some(key => (old[key] ?? null) !== (source[key] ?? null))) throw new Error('Metadata revision requires a separately versioned provenance migration; existing archive retained');
  }
}
