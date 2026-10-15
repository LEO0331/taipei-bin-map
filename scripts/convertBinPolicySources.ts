import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import Papa from 'papaparse';
import iconv from 'iconv-lite';
import { policySources } from './binPolicySources';
import { assertArchiveMetadata } from './binPolicyManifest';
import { unzip, parseDbf, parseShp, normalizeXY, inPolygon, archiveFileTimestamps } from './binPolicyGis';
import { distance, validPoint, type PolicyPoint } from '../src/lib/binPolicyDecision';

export function buildPolicySnapshot(directory: string) {
  type SourceInput = { id: string; filename: string; sha256: string; resourceId: string; resourceUpdatedAt: string | null; fetchedAt: string; httpLastModified?: string | null; [key: string]: unknown };
  const manifest = JSON.parse(readFileSync(join(directory, 'sources.json'), 'utf8')) as SourceInput[];
  if (!Array.isArray(manifest) || manifest.length !== policySources.length || new Set(manifest.map(source => source?.id)).size !== policySources.length) throw new Error('Unexpected policy source manifest');
  for (const expected of policySources) {
    const source = manifest.find(item => item?.id === expected.id);
    if (!source || source.filename !== expected.filename || source.resourceId !== expected.resourceId || !/^[a-f0-9]{64}$/.test(source.sha256)) throw new Error(`Source manifest identity or filename mismatch: ${expected.id}`);
  }
  const sources = manifest.map(source => ({...source,archiveFileTimestamps:source.filename.endsWith('.zip')?archiveFileTimestamps(readFileSync(join(directory, source.filename))):null}));
  for (const source of sources) if (createHash('sha256').update(readFileSync(join(directory, source.filename))).digest('hex') !== source.sha256) throw new Error(`Source hash mismatch: ${source.id}`);
  const districts = unzip(readFileSync(join(directory, 'districts.zip')));
  const dbf = Object.entries(districts).find(([key]) => key.endsWith('.dbf'))?.[1];
  const shp = Object.entries(districts).find(([key]) => key.endsWith('.shp'))?.[1];
  if (!dbf || !shp) throw new Error('Missing district SHP/DBF');
  const districtRows = parseDbf(dbf, 'utf8'); const polygons = parseShp(shp);
  if (polygons.length !== 12 || districtRows.length !== 12) throw new Error('Expected 12 official districts');
  const boundaries = polygons.map((shape, index) => ({ fields: districtRows[index].row, rings: shape.rings }));
  const districtNames = ['中正區','大同區','中山區','松山區','大安區','萬華區','信義區','士林區','北投區','內湖區','南港區','文山區'];
  const nameFor = (fields: Record<string, string>) => Object.values(fields).find(value => districtNames.includes(value));
  if (boundaries.some(boundary => !nameFor(boundary.fields))) throw new Error('District-name schema drift');
  const locate = (longitude: number, latitude: number) => {
    const matches = boundaries.filter(boundary => inPolygon(longitude, latitude, boundary.rings));
    return matches.length === 1 ? nameFor(matches[0].fields)! : null;
  };
  const binCsv = Papa.parse<Record<string, string>>(iconv.decode(readFileSync(join(directory, 'bins-current.csv')), 'cp950'), { header: true, skipEmptyLines: true, transformHeader: value => value.replace(/^\uFEFF/, '').trim(), transform: value => value.trim() });
  if (!['行政區','地址','經度','緯度','備註'].every(key => binCsv.meta.fields?.includes(key)) || binCsv.errors.length) throw new Error('Bin CSV schema drift or malformed rows');
  const excluded: Array<{ source: string; row: number; reason: string; raw: unknown }> = [];
  const binEvidence: unknown[] = []; const bins: PolicyPoint[] = []; const binCoordinates = new Set<string>();
  let duplicateBins = 0;
  binCsv.data.forEach((row, index) => {
    const point = { longitude: row['經度'] ? Number(row['經度']) : NaN, latitude: row['緯度'] ? Number(row['緯度']) : NaN };
    binEvidence.push({ row: index + 2, raw: row });
    if (!validPoint(point)) { excluded.push({ source: 'bins', row: index + 2, reason: 'invalid_coordinate', raw: row }); return; }
    const district = locate(point.longitude, point.latitude);
    if (!district) { excluded.push({ source: 'bins', row: index + 2, reason: 'outside_or_ambiguous_district', raw: row }); return; }
    const key = `${point.longitude},${point.latitude}`;
    if (binCoordinates.has(key)) { duplicateBins++; return; }
    binCoordinates.add(key);
    bins.push({ id: `bin-${createHash('sha256').update(JSON.stringify(row)).digest('hex').slice(0,16)}`, name: row['地址'], district, ...point, sourceId: 'bins', sourceRecord: String(index + 2), precision: 'source-geographic-coordinate' });
  });
  const bus = unzip(readFileSync(join(directory, 'bus-stops.zip')));
  const busDbf = Object.entries(bus).find(([key]) => key.endsWith('.dbf'))?.[1];
  const busShp = Object.entries(bus).find(([key]) => key.endsWith('.shp'))?.[1];
  if (!busDbf || !busShp) throw new Error('Missing bus SHP/DBF');
  const busRows = parseDbf(busDbf, 'utf8'), busShapes = parseShp(busShp);
  if (busRows.length !== busShapes.length || !busRows.length) throw new Error('Bus attribute/geometry mismatch');
  const referenceEvidence: unknown[] = []; const references: PolicyPoint[] = [];
  const busKeys = new Set<string>(); let duplicateReferences = 0; const transformations = new Set<string>();
  busRows.forEach(({ row, deleted }, index) => {
    const xy = busShapes[index].xy;
    if (!('BSM_BUSSTO' in row) || !('BSM_CHINES' in row)) throw new Error('Bus DBF schema drift');
    referenceEvidence.push({ row: index + 1, raw: row, xy });
    if (deleted || !xy) { excluded.push({ source: 'bus', row: index + 1, reason: 'deleted_or_null_geometry', raw: row }); return; }
    try {
      const point = normalizeXY(xy[0], xy[1]); transformations.add(point.transformation);
      const district = locate(point.longitude, point.latitude);
      if (!district) throw new Error('outside_or_ambiguous_district');
      const key = `${point.longitude.toFixed(7)},${point.latitude.toFixed(7)}`;
      if (busKeys.has(key)) { duplicateReferences++; return; }
      busKeys.add(key);
      references.push({ id: `bus-${row.BSM_BUSSTO}`, sourceRecord: row.BSM_BUSSTO, name: row.BSM_CHINES, district, latitude: point.latitude, longitude: point.longitude, sourceId: 'bus', precision: point.transformation });
    } catch (error) { excluded.push({ source: 'bus', row: index + 1, reason: String(error), raw: { ...row, xy } }); }
  });
  if (new Set(references.map(p => p.id)).size !== references.length) throw new Error('Conflicting bus IDs');
  if (bins.length < 100 || references.length < 100) throw new Error('Unexpectedly empty/truncated policy dataset');
  const nearDuplicateReferences: Array<{ ids: string[]; meters: number }> = [];
  for (let i=0;i<references.length;i++) for(let j=i+1;j<references.length;j++) {
    const a=references[i],b=references[j];
    if (Math.abs(a.latitude-b.latitude)>.00005 || Math.abs(a.longitude-b.longitude)>.00006) continue;
    const meters=distance(a,b);
    if(meters<=5) nearDuplicateReferences.push({ids:[a.id,b.id],meters});
  }
  const previous = JSON.parse(readFileSync(resolve('public/data/pedestrian-bins.json'), 'utf8')) as PolicyPoint[];
  const snapshotId = `v1-${createHash('sha256').update(sources.map(s => s.sha256).join('')).digest('hex').slice(0,12)}`;
  return { schemaVersion: 1, snapshotId, generatedAt: new Date().toISOString(), sources, bins, references, quality: { binSourceRows: binCsv.data.length, validBins: bins.length, referenceSourceRows: busRows.length, validReferences: references.length, duplicateBins, duplicateReferences, nearDuplicateReferences, excluded, binEvidence, referenceEvidence, transformations: [...transformations], boundaryPrj: Object.entries(districts).find(([key]) => key.endsWith('.prj'))?.[1].toString('utf8') ?? null, busPrjPresent: Object.keys(bus).some(key => key.endsWith('.prj')), previousBinSnapshot: { records: previous.length, metadata: JSON.parse(readFileSync(resolve('public/data/bins.metadata.json'), 'utf8')), sourceRowDifference: binCsv.data.length - previous.length } } };
}

export function writePolicySnapshot(directory: string, output?: string) {
  const snapshot = buildPolicySnapshot(resolve(directory));
  const publishedPath = resolve('public/data/bin-policy/analysis.json');
  const previous = JSON.parse(readFileSync(publishedPath, 'utf8'));
  if (!output && snapshot.snapshotId !== previous.snapshotId) throw new Error('New source revisions require an approved publication review bundle; production snapshot retained');
  if (!output) assertArchiveMetadata(previous.sources, snapshot.sources);
  const target = output ? resolve(output) : publishedPath;
  const publicRoot = resolve('public');
  if (output && (target.toLowerCase() === publicRoot.toLowerCase() || target.toLowerCase().startsWith(`${publicRoot.toLowerCase()}/`) || target.toLowerCase().startsWith(`${publicRoot.toLowerCase()}\\`))) throw new Error('Explicit converter output must not target production public data');
  const parent = resolve(target, '..');
  mkdirSync(parent, { recursive: true });
  const temporary = `${target}.${process.pid}-${createHash('sha256').update(String(Math.random())).digest('hex').slice(0,8)}.tmp`;
  writeFileSync(temporary, JSON.stringify(snapshot));
  renameSync(temporary, target);
  return snapshot;
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const directory = process.argv[2];
  if (!directory) throw new Error('Supply a versioned raw snapshot directory');
  const outputAt = process.argv.indexOf('--output');
  if (outputAt >= 0 && !process.argv[outputAt + 1]) throw new Error('Supply --output <review-file.json>');
  const snapshot = writePolicySnapshot(directory, outputAt >= 0 ? process.argv[outputAt + 1] : undefined);
  console.log(snapshot.snapshotId, snapshot.bins.length, snapshot.references.length);
}
