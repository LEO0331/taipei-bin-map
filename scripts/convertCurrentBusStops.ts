import { readFileSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validPoint, type PolicyPoint } from '../src/lib/binPolicyDecision';
import { unzip, parseDbf, parseShp, inPolygon } from './binPolicyGis';
import { decodeTaipeiBusPayload } from './fetchCurrentBusStops';

export function normalizeBusIdentifier(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const normalized = String(value).trim(); return /^\d+$/.test(normalized) ? normalized : null;
}
export function normalizeCurrentBusStops(input: unknown, locate: (longitude: number, latitude: number) => string | null) {
  const payload = input as { BusInfo?: Record<string,unknown>[]; EssentialInfo?: { CoordinateSystem?: string; UpdateTime?: string } };
  if (!payload || !Array.isArray(payload.BusInfo) || payload.EssentialInfo?.CoordinateSystem !== 'WGS84') throw new Error('Expected Taipei StopLocation WGS84 envelope');
  const evidence = payload.BusInfo.map(raw => ({ raw, id: normalizeBusIdentifier(raw.id) }));
  const counts = new Map<string, number>(); evidence.forEach(row => { if(row.id) counts.set(row.id,(counts.get(row.id) ?? 0)+1); });
  const quality = { sourceRows:evidence.length, acceptedReferences:0, missingIdentifiers:0, conflictingIdentifiers:0, invalidCoordinates:0, missingCoordinates:0, outOfBoundsCoordinates:0, outsideOrAmbiguousDistrict:0, duplicateCoordinates:0, missingNames:0 };
  const excluded: { id:string|null;reason:string;raw:unknown }[] = []; const references:PolicyPoint[]=[]; const coordinates = new Set<string>();
  const sorted = [...evidence].sort((a,b)=>(a.id ?? '').localeCompare(b.id ?? '', 'en') || JSON.stringify(a.raw).localeCompare(JSON.stringify(b.raw),'en'));
  for (const {raw,id} of sorted) {
    const reject = (reason:string) => excluded.push({id,reason,raw});
    if(!id) {quality.missingIdentifiers++;reject('missing_or_malformed_identifier');continue;}
    if(counts.get(id)!>1) {quality.conflictingIdentifiers++;reject('repeated_identifier_requires_review');continue;}
    const longitude = raw.lon === '' || raw.lon === null || raw.lon === undefined ? NaN : Number(raw.lon);
    const latitude = raw.lat === '' || raw.lat === null || raw.lat === undefined ? NaN : Number(raw.lat);
    if(!validPoint({longitude,latitude})) {quality.invalidCoordinates++;if(!Number.isFinite(longitude)||!Number.isFinite(latitude))quality.missingCoordinates++;else quality.outOfBoundsCoordinates++;reject('missing_invalid_or_out_of_bounds_coordinate');continue;}
    const district = locate(longitude,latitude); if(!district) {quality.outsideOrAmbiguousDistrict++;reject('outside_or_ambiguous_taipei_district');continue;}
    const key=`${longitude.toFixed(7)},${latitude.toFixed(7)}`;
    if(coordinates.has(key)) {quality.duplicateCoordinates++;reject('duplicate_coordinate_evidence_retained');continue;}
    coordinates.add(key);const name=typeof raw.name==='string'?raw.name.trim():'';if(!name)quality.missingNames++;
    references.push({id:`current-bus-${id}`,sourceRecord:id,sourceId:'taipei-stop-location',name,district,longitude,latitude,precision:'WGS84 declared; no projection; rounded 7 decimal coordinate dedup only'});
  }
  quality.acceptedReferences=references.length;
  return {references,quality,evidence,excluded,sourceUpdatedAt:payload.EssentialInfo.UpdateTime ?? null,coordinateTransformation:'none; source declares WGS84'};
}
export function districtLocator(archivePath:string) {
  const archive=unzip(readFileSync(archivePath));const dbf=Object.entries(archive).find(([name])=>name.endsWith('.dbf'))?.[1];const shp=Object.entries(archive).find(([name])=>name.endsWith('.shp'))?.[1];
  if(!dbf||!shp)throw new Error('Missing district geometry');const rows=parseDbf(dbf,'utf8'),polygons=parseShp(shp);
  const names=['中正區','大同區','中山區','松山區','大安區','萬華區','信義區','士林區','北投區','內湖區','南港區','文山區'];
  const districts=polygons.map((polygon,index)=>({name:Object.values(rows[index].row).find(value=>names.includes(value)),rings:polygon.rings}));
  if(districts.length!==12||districts.some(d=>!d.name))throw new Error('District schema changed');
  return (longitude:number,latitude:number) => {const hits=districts.filter(d=>inPolygon(longitude,latitude,d.rings));return hits.length===1?hits[0].name!:null;};
}
export function convertCurrentBusStops(directory:string, districtArchive:string) {
  const source=JSON.parse(readFileSync(join(directory,'source.json'),'utf8'));const bytes=readFileSync(join(directory,'GetStopLocation.gz'));
  if(createHash('sha256').update(bytes).digest('hex')!==source.sha256)throw new Error('Bus raw content hash mismatch');
  const normalized=normalizeCurrentBusStops(decodeTaipeiBusPayload(bytes),districtLocator(districtArchive));
  if(normalized.references.length<100)throw new Error('Current bus conversion unexpectedly incomplete');
  return {schemaVersion:1,versionId:source.versionId,source:{...source,validated_at:new Date().toISOString(),published_at:null},...normalized};
}
if(import.meta.url===pathToFileURL(process.argv[1]??'').href){
  if(!process.argv[2]||!process.argv[3])throw new Error('Supply frozen bus directory and district ZIP');
  const result=convertCurrentBusStops(resolve(process.argv[2]),resolve(process.argv[3]));mkdirSync('public/data/bin-policy',{recursive:true});
  writeFileSync('public/data/bin-policy/bus-proposed.json.tmp',JSON.stringify(result));renameSync('public/data/bin-policy/bus-proposed.json.tmp','public/data/bin-policy/bus-proposed.json');console.log(result.versionId,result.quality);
}
