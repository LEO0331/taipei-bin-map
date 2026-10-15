/** Read only the official Nuxt JSON reference graph; never evaluate page JavaScript. */
export function parsePortalMetadata(html: string, datasetId: string, resourceId: string) {
  const json = html.match(/<script\b[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  if (!json) throw new Error('Official portal metadata structure unavailable');
  const graph = JSON.parse(json) as unknown[];
  if (!Array.isArray(graph)) throw new Error('Unexpected portal metadata graph');
  const at = (index: unknown): unknown => typeof index === 'number' && index >= 0 ? graph[index] : null;
  const object = (value: unknown): Record<string,unknown> | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string,unknown> : null;
  const dataset = graph.map(object).find(value => value && at(value.pid) === datasetId);
  if (!dataset) throw new Error('Dataset identity absent from official metadata');
  const references = at(dataset.resources);
  if (!Array.isArray(references)) throw new Error('Official resource list unavailable');
  const resources = references.map(at).map(object).filter((value): value is Record<string,unknown>=>!!value);
  const resource = resources.find(value => at(value.rid) === resourceId);
  const date = (value: unknown) => {
    if (typeof value !== 'string' || !value.trim()) return null;
    const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? value.replace(' ','T')+'+08:00' : value;
    return Number.isFinite(Date.parse(iso)) ? iso : null;
  };
  return { dataset_id: datasetId, resource_id: resourceId, resource_present: !!resource,
    available_resource_ids: resources.map(value=>String(at(value.rid))),
    source_updated_at: resource ? date(at(resource.last_modified)) : null,
    metadata_updated_at: date(at(dataset.metadata_changed)),
    download_url: resource ? at(resource.url) : null,
    declared_encoding: resource ? at(resource.encoding) : null,
    declared_format: resource ? at(resource.file_format) : null,
  };
}
