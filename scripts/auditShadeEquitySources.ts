import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve, relative, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import Papa from 'papaparse';
import { shadeHash, shadeDatasets } from './fetchShadeEquitySources';

const districtNames = new Set(['中正區','大同區','中山區','松山區','大安區','萬華區','信義區','士林區','北投區','內湖區','南港區','文山區']);
const districtCodes = new Set(['63000010','63000020','63000030','63000040','63000050','63000060','63000070','63000080','63000090','63000100','63000110','63000120']);
const validProjected = (x: unknown, y: unknown) => Number.isFinite(Number(x)) && Number.isFinite(Number(y)) && Number(x) >= 280000 && Number(x) <= 330000 && Number(y) >= 2745000 && Number(y) <= 2805000;

export function parseShadeTreeCsv(text: string) {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ''), { header: true, skipEmptyLines: true });
  const required = ['TreeID','Dist','Region','RegionRemark','TreeType','Diameter','TreeHeight','SurveyDate','TWD97X','TWD97Y','UpdDate'];
  if (parsed.errors.length || required.some(key => !parsed.meta.fields?.includes(key))) throw new Error('Roadside CSV required headers/encoding mismatch');
  return parsed.data;
}

const range = (values: string[]) => { const valid = values.filter(value => /^\d{4}-\d{2}-\d{2}/.test(value)).sort(); return { minimum: valid[0] ?? null, maximum: valid.at(-1) ?? null, missingOrMalformed: values.length - valid.length }; };
export function auditShadeTrees(rows: Record<string,string>[]) {
  const ids = new Set<string>(), coordinates = new Set<string>(), exactRows = new Set<string>();
  let duplicateIds = 0, missingIds = 0, repeatedCoordinates = 0, invalidCoordinates = 0, missingCoordinates = 0, invalidDistricts = 0, duplicateRows = 0, nonpositiveDiameter = 0, nonpositiveHeight = 0;
  const districts: Record<string,number> = {};
  for (const row of rows) {
    const id = row.TreeID?.trim(); if (!id) missingIds++; else if (ids.has(id)) duplicateIds++; else ids.add(id);
    const coordinate = `${row.TWD97X},${row.TWD97Y}`;
    if (!row.TWD97X?.trim() || !row.TWD97Y?.trim()) missingCoordinates++;
    else if (!validProjected(row.TWD97X,row.TWD97Y)) invalidCoordinates++;
    else if (coordinates.has(coordinate)) repeatedCoordinates++; else coordinates.add(coordinate);
    if (!districtNames.has(row.Dist)) invalidDistricts++;
    districts[row.Dist || '(missing)'] = (districts[row.Dist || '(missing)'] ?? 0) + 1;
    if (!(Number(row.Diameter) > 0)) nonpositiveDiameter++;
    if (!(Number(row.TreeHeight) > 0)) nonpositiveHeight++;
    const exact = JSON.stringify(row); if (exactRows.has(exact)) duplicateRows++; else exactRows.add(exact);
  }
  return { rawCount: rows.length, uniqueIds: ids.size, duplicateIds, missingIds, duplicateRows, repeatedCoordinates, missingCoordinates, invalidCoordinates, invalidDistricts, nonpositiveDiameter, nonpositiveHeight, districts,
    surveyDates: range(rows.map(row=>row.SurveyDate)), recordUpdateDates: range(rows.map(row=>row.UpdDate)),
    measurementUnits: { diameter: 'not specified in downloaded CSV or reviewed catalogue', height: 'not specified in downloaded CSV or reviewed catalogue' },
    boundsCheck: 'Conservative projected-coordinate envelope only; actual Taipei boundary disagreements require converter GIS audit',
    suitability: 'limited', acceptedFeatureCount: null, reason: 'Raw schema/provenance verified; analytical admission and district-boundary checks are separate converter gates.' };
}

type Shape = { type?: string; coordinates?: any[] };
export function auditShadeGeometry(payload: any, pits: boolean) {
  if (payload?.type !== 'FeatureCollection' || payload.crs?.properties?.name !== 'urn:ogc:def:crs:EPSG::3826' || !Array.isArray(payload.features)) throw new Error('Official GIS schema/CRS mismatch');
  const ids = new Set<string>(), exact = new Set<string>(), classifications: Record<string,number> = {}, geometryTypes: Record<string,number> = {};
  let duplicateIds=0, missingIds=0, duplicateGeometry=0, invalidGeometry=0, zeroAreaGeometry=0, missingCoordinates=0, invalidDistricts=0, invalidLengths=0, invalidWidths=0, invalidClearWidths=0;
  const fields = new Set<string>();
  for (const feature of payload.features) {
    const p = feature.properties ?? {}; Object.keys(p).forEach(key=>fields.add(key));
    const id = String(p[pits ? 'OBJECTID' : 'ID'] ?? '').trim(); if (!id) missingIds++; else if (ids.has(id)) duplicateIds++; else ids.add(id);
    const label = String(p[pits?'Name':'code']??'(missing)'); classifications[label] = (classifications[label]??0)+1;
    const geometry = feature.geometry as Shape | null; geometryTypes[geometry?.type??'(missing)']=(geometryTypes[geometry?.type??'(missing)']??0)+1;
    const serialized = JSON.stringify(geometry); if(exact.has(serialized))duplicateGeometry++; else exact.add(serialized);
    if (!(pits ? districtNames.has(String(p.Town_N)) : districtCodes.has(String(p.Town_N)))) invalidDistricts++;
    if (pits && (!Number.isFinite(p.X_3826)||!Number.isFinite(p.Y_3826))) missingCoordinates++;
    if (!pits) { if (!(Number(p.SW_LENG_ItemValue)>0)) invalidLengths++; if (!(Number(p.SW_WTH_ItemValue)>0))invalidWidths++; if (!(Number(p.SWW_WTH)>0))invalidClearWidths++; }
    const polygons = geometry?.type==='MultiPolygon' ? geometry.coordinates : geometry?.type==='Polygon' ? [geometry.coordinates] : null;
    if (!polygons?.length) { invalidGeometry++; continue; }
    let valid=true, totalArea=0;
    for (const polygon of polygons) {
      if (!Array.isArray(polygon)||!polygon.length){valid=false;continue;}
      for(let r=0;r<polygon.length;r++){
        const ring=polygon[r]; if(!Array.isArray(ring)||ring.length<4){valid=false;continue;}
        if (ring[0]?.[0]!==ring.at(-1)?.[0]||ring[0]?.[1]!==ring.at(-1)?.[1])valid=false;
        let twiceArea=0;
        for(let i=0;i<ring.length;i++){
          const a=ring[i], b=ring[(i+1)%ring.length];
          if(!Array.isArray(a)||a.length<2||!validProjected(a[0],a[1])||!Array.isArray(b)){valid=false;continue;}
          twiceArea += (a[0]-ring[0][0])*(b[1]-ring[0][1])-(b[0]-ring[0][0])*(a[1]-ring[0][1]);
        }
        totalArea += (r===0?1:-1)*Math.abs(twiceArea/2);
      }
    }
    if (!valid)invalidGeometry++; else if (!(totalArea>1e-8)) zeroAreaGeometry++;
  }
  return { rawCount: payload.features.length, fields:[...fields], crs:payload.crs.properties.name, geometryTypes, classifications,
    uniqueIds:ids.size,duplicateIds,missingIds,duplicateGeometry,invalidGeometry,zeroAreaGeometry,missingCoordinates,invalidDistricts,invalidLengths,invalidWidths,invalidClearWidths,
    geometryAuditScope:'Closed finite rings, projected envelope, area and exact coordinate-serialization duplicates. Self-intersection, overlaps, city boundary and spatial associations require the separate converter audit.',
    acceptedFeatureCount:null,suitability:'limited',reason:'Raw structure verified; no automatic analytical approval.', measurementDefinition: pits ? 'Tree-pit/planter geometry; occupancy not measured.' : 'Catalogue calls SW_LENG_ItemValue length, SW_WTH_ItemValue width, SWW_WTH clear width; source does not define survey method or explicit units. Shape_Leng is polygon perimeter, not a pedestrian route.' };
}

export async function auditShadeEquitySources(root='data/raw/shade-equity') {
  const directory=resolve(root),manifest=JSON.parse(await readFile(join(directory,'sources.json'),'utf8'));
  const audits: Record<string,any>[]=[];
  for(const source of manifest.sources){
    const definition=shadeDatasets.find(item=>item[0]===source.id);
    if (!definition||source.datasetId!==definition[1]||(definition[2]&&source.resourceId!==definition[2]))throw new Error('Unreviewed source identity');
    const path=resolve(directory,source.filename),rel=relative(directory,path);
    if(!rel||rel.startsWith('..')||isAbsolute(rel))throw new Error('Raw source path escapes archive');
    const bytes=await readFile(path);if(shadeHash(bytes)!==source.sha256||bytes.length!==source.bytes||source.httpStatus!==200)throw new Error(`${source.id} hash/size/status mismatch`);
    const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes).replace(/^\uFEFF/,'');
    let result:any;
    if(source.id==='roadside_trees')result=auditShadeTrees(parseShadeTreeCsv(text));
    else if(source.id==='sidewalks'||source.id==='tree_pits')result=auditShadeGeometry(JSON.parse(text),source.id==='tree_pits');
    else if(source.id==='greening_context'){
      const parsed=Papa.parse<Record<string,string>>(text,{header:true,skipEmptyLines:true});if(parsed.errors.length)throw new Error('Greening CSV schema mismatch');
      result={suitability:'context_only',rawCount:parsed.data.length,fields:parsed.meta.fields,periods:parsed.data.map(row=>row['統計期']),acceptedFeatureCount:0,duplicateCount:null,invalidGeometryCount:null,missingCoordinates:null,crs:null,reason:'Citywide annual aggregate; no tree identity, removal history or street-level measurement. Missing/zero historical values require definition review before charting.'};
    }else {
      const parsed=JSON.parse(text);result={suitability:'context_only',rawCount:Array.isArray(parsed)?parsed.length:null,topLevelKeys:Array.isArray(parsed)?null:Object.keys(parsed),fields:Array.isArray(parsed)&&parsed.length?Object.keys(parsed[0]):null,acceptedFeatureCount:0,duplicateCount:null,invalidGeometryCount:null,missingCoordinates:null,crs:null,reason:'Park administrative descriptions are not sidewalk tree stock, measured canopy, or pedestrian route shade. No spatial use in v1.'};
    }
    audits.push({id:source.id,sha256:source.sha256,resourceId:source.resourceId,...result});
  }
  const report={schemaVersion:1,snapshotId:manifest.snapshotId,processedAt:manifest.generatedAt,sources:audits};
  await writeFile(join(directory,'raw-audit.json'),JSON.stringify(report,null,2)+'\n');return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)auditShadeEquitySources(process.argv[2]).then(report=>console.log(JSON.stringify(report,null,2))).catch(error=>{console.error(error);process.exitCode=1;});
