import { createHash } from 'node:crypto';
import Papa from 'papaparse';
import { convertTwd97ToWgs84 } from './convertGasLpgStations';
import { canonicalGeometry, polygonBounds, polygonLocation, validatePolygon, polygonsOverlap, buildSpatialIndex, spatialCandidates, type ProjectedPoint, type ProjectedPolygon, type SpatialUnit } from '../src/lib/shadeEquitySpatial';

export const SHADE_DISTRICTS=['松山區','信義區','大安區','中山區','中正區','大同區','萬華區','文山區','南港區','內湖區','士林區','北投區'];
export const SHADE_DISTRICT_CODES=Object.fromEntries(SHADE_DISTRICTS.map((name,i)=>[`63000${String(i+1).padStart(2,'0')}0`,name]));
export const SHADE_TREE_HEADERS=['TreeID','Dist','Region','RegionRemark','TreeType','Diameter','TreeHeight','SurveyDate','TWD97X','TWD97Y','UpdDate'];
export type ShadeRawRow=Record<string,unknown>;
export interface ShadeRawFeature {type:string;properties:ShadeRawRow;geometry:{type:string;coordinates:unknown}}
export interface ShadeSourceManifestEntry {id:string;datasetId:string;resourceId:string;name:string;provider:string;datasetUrl:string;downloadUrl:string;filename:string;sha256:string;bytes:number;httpStatus:number;fetchedAt:string;resourceUpdatedAt:string|null;metadataUpdatedAt:string|null;encoding:string;format:string;approvalStatus:string}
export interface ShadeSourceManifest {schemaVersion:number;snapshotId:string;generatedAt:string;sources:ShadeSourceManifestEntry[]}
export const sha256=(bytes:Buffer|string)=>createHash('sha256').update(bytes).digest('hex');
export function validateShadeSourceBytes(bytes:Buffer,expected:string){if(!/^[a-f0-9]{64}$/.test(expected)||sha256(bytes)!==expected)throw new Error('Shade source SHA256 hash mismatch; reviewed new snapshot required');}
export function decodeShadeTreeCsv(bytes:Buffer):ShadeRawRow[]{
  const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes).replace(/^\uFEFF/,'');
  const parsed=Papa.parse<ShadeRawRow>(text,{header:true,skipEmptyLines:true});
  if(parsed.errors.length||JSON.stringify(parsed.meta.fields)!==JSON.stringify(SHADE_TREE_HEADERS))throw new Error('Roadside tree source schema changed');
  return parsed.data;
}
export function normalizeShadeGeometry(input:unknown):ShadeRawFeature[]{
  const data=input as {type?:string;crs?:{properties?:{name?:string}};features?:ShadeRawFeature[]};
  if(data?.type!=='FeatureCollection'||data.crs?.properties?.name!=='urn:ogc:def:crs:EPSG::3826'||!Array.isArray(data.features))throw new Error('Expected declared EPSG:3826 GIS FeatureCollection CRS');
  return data.features;
}
export const validProjectedPoint=(point:ProjectedPoint)=>point.every(Number.isFinite)&&point[0]>=280000&&point[0]<=340000&&point[1]>=2740000&&point[1]<=2810000;
export function projectToWgs(point:ProjectedPoint){return convertTwd97ToWgs84(point[0],point[1]);}
const text=(value:unknown)=>typeof value==='string'?value.trim():typeof value==='number'?String(value):'';
const numeric=(value:unknown)=>value===null||value===undefined||text(value)===''?NaN:Number(value);
const date=(value:unknown)=>/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2})?$/.test(text(value))&&Number.isFinite(Date.parse(text(value)))?text(value):null;
export interface ShadeTree {id:string;district:string;point:ProjectedPoint;surveyDate:string|null;updatedAt:string|null;road:string;side:string;measurementFlags:string[]}
export function normalizeShadeTrees(rows:ShadeRawRow[],locate:(longitude:number,latitude:number)=>string|null){
  const quality={rawRows:rows.length,accepted:0,missingIdentifiers:0,repeatedIdentifiers:0,duplicateCoordinates:0,missingCoordinates:0,invalidCoordinates:0,districtMismatch:0,outsideOrBoundary:0,missingSurveyDates:0,invalidMeasurements:0};
  const ids=new Map<string,number>();for(const row of rows){const id=text(row.TreeID);ids.set(id,(ids.get(id)??0)+1);}
  const seen=new Set<string>(),trees:ShadeTree[]=[],excluded:{id:string;reason:string}[]=[];
  for(const row of [...rows].sort((a,b)=>text(a.TreeID).localeCompare(text(b.TreeID),'en'))){
    const id=text(row.TreeID),point:ProjectedPoint=[numeric(row.TWD97X),numeric(row.TWD97Y)];
    const reject=(reason:string)=>excluded.push({id,reason});
    if(!id){quality.missingIdentifiers++;reject('missing_tree_id');continue;}
    if(ids.get(id)!>1){quality.repeatedIdentifiers++;reject('repeated_tree_id');continue;}
    if(!point.every(Number.isFinite)){quality.missingCoordinates++;reject('missing_coordinate');continue;}
    if(!validProjectedPoint(point)){quality.invalidCoordinates++;reject('out_of_projected_bounds');continue;}
    const wgs=projectToWgs(point),located=locate(wgs.longitude,wgs.latitude),district=text(row.Dist);
    if(!located){quality.outsideOrBoundary++;reject('outside_or_ambiguous_taipei_boundary');continue;}
    if(!SHADE_DISTRICTS.includes(district)||located!==district){quality.districtMismatch++;reject('district_disagreement');continue;}
    const key=point.join(',');if(seen.has(key)){quality.duplicateCoordinates++;reject('repeated_exact_coordinate_not_additive');continue;}seen.add(key);
    const surveyDate=date(row.SurveyDate);if(!surveyDate)quality.missingSurveyDates++;
    const measurementFlags:string[]=[];for(const field of ['Diameter','TreeHeight']){const n=numeric(row[field]);if(!Number.isFinite(n)||n<=0)measurementFlags.push(`invalid_${field}`);}if(measurementFlags.length)quality.invalidMeasurements++;
    trees.push({id,district,point,surveyDate,updatedAt:date(row.UpdDate),road:text(row.Region),side:text(row.RegionRemark),measurementFlags});
  }
  quality.accepted=trees.length;return{trees,quality,excluded};
}
export function classifyShadePit(properties:ShadeRawRow):'tree_pit'|'planter'|'unknown'{return properties.Name==='樹穴'?'tree_pit':properties.Name==='花圃'?'planter':'unknown';}
export interface ShadeSidewalk extends SpatialUnit {sourceRecord:string;road:string;side:string;start:string;end:string;officialLengthRaw:unknown;widthRaw:unknown;clearWidthRaw:unknown;point:ProjectedPoint;duplicateId:boolean}
export function featurePolygons(feature:ShadeRawFeature):{polygons:ProjectedPolygon[];reason:string|null}{
  if(feature.geometry?.type!=='MultiPolygon')return{polygons:[],reason:'unexpected_geometry_type'};
  const polygons=feature.geometry.coordinates as ProjectedPolygon[];
  if(!Array.isArray(polygons)||!polygons.length)return{polygons:[],reason:'missing_geometry'};
  for(const polygon of polygons){const error=validatePolygon(polygon);if(error)return{polygons:[],reason:error};if(polygon.some(r=>r.some(p=>!validProjectedPoint(p))))return{polygons:[],reason:'out_of_projected_bounds'};}
  for(let i=0;i<polygons.length;i++)for(let j=0;j<i;j++)if(polygonsOverlap([polygons[i]],[polygons[j]]))return{polygons:[],reason:'overlapping_multipolygon_parts'};
  return{polygons,reason:null};
}
/** Pick an existing boundary vertex, not a fabricated centroid. Map-only representative. */
export const geometryRepresentative=(polygons:ProjectedPolygon[]):ProjectedPoint=>polygons[0][0][0];
export function normalizeShadeSidewalks(features:ShadeRawFeature[],locate:(longitude:number,latitude:number)=>string|null){
  const quality={rawFeatures:features.length,accepted:0,invalidGeometry:0,missingIdentifiers:0,repeatedIdentifiers:0,duplicateGeometry:0,districtMismatch:0,invalidLength:0,invalidWidth:0,overlappingSegments:0};
  const excluded:{id:string;reason:string}[]=[],units:ShadeSidewalk[]=[],seen=new Set<string>(),ids=new Map<string,number>();
  for(const f of features){const id=text(f.properties?.ID);ids.set(id,(ids.get(id)??0)+1);}
  for(const f of features){const p=f.properties??{},id=text(p.ID),geometry=featurePolygons(f);const reject=(reason:string)=>excluded.push({id,reason});
    if(!id){quality.missingIdentifiers++;reject('missing_official_id');continue;}if(geometry.reason){quality.invalidGeometry++;reject(geometry.reason);continue;}
    const key=canonicalGeometry(geometry.polygons);if(seen.has(key)){quality.duplicateGeometry++;reject('duplicate_geometry');continue;}seen.add(key);
    const district=SHADE_DISTRICT_CODES[text(p.Town_N)],point=geometryRepresentative(geometry.polygons),wgs=projectToWgs(point),located=locate(wgs.longitude,wgs.latitude);
    // Every vertex is checked: a feature crossing a district boundary is not silently reassigned.
    const districtConsistent=Boolean(district)&&located===district&&geometry.polygons.every(poly=>poly.every(ring=>ring.every(v=>{const pos=projectToWgs(v);return locate(pos.longitude,pos.latitude)===district;})));
    if(!districtConsistent){quality.districtMismatch++;reject('source_geometry_district_disagreement_or_boundary');continue;}
    const duplicateId=ids.get(id)!>1;if(duplicateId)quality.repeatedIdentifiers++;
    if(!(numeric(p.SW_LENG_ItemValue)>0))quality.invalidLength++;if(!(numeric(p.SW_WTH_ItemValue)>0))quality.invalidWidth++;
    units.push({id:`sidewalk:${id}:${sha256(key).slice(0,12)}`,sourceRecord:id,district,polygons:geometry.polygons,point,road:text(p.NAME_Road),side:text(p.SW_DIRECT),start:text(p.PSTART),end:text(p.PEND),officialLengthRaw:p.SW_LENG_ItemValue,widthRaw:p.SW_WTH_ItemValue,clearWidthRaw:p.SWW_WTH,duplicateId});
  }
  const index=buildSpatialIndex(units),overlapIds=new Set<string>();let overlapPairs=0;
  for(const unit of units)for(const other of spatialCandidates(polygonBounds(unit.polygons),index))if(unit.id<other.id&&polygonsOverlap(unit.polygons,other.polygons)){overlapPairs++;overlapIds.add(unit.id);overlapIds.add(other.id);}
  quality.accepted=units.length;quality.overlappingSegments=overlapIds.size;return{units,quality,excluded,overlapIds,overlapPairs,index};
}
export interface ShadePit {id:string;district:string;point:ProjectedPoint;polygons:ProjectedPolygon[]}
export function normalizeShadePits(features:ShadeRawFeature[],locate:(longitude:number,latitude:number)=>string|null){
  const quality={rawFeatures:features.length,treePitRows:0,planterRows:0,unknownClass:0,accepted:0,invalidGeometry:0,duplicateGeometry:0,repeatedIdentifiers:0,missingCoordinates:0,districtMismatch:0,coordinateOutsideGeometry:0};
  const pits:ShadePit[]=[],excluded:{id:string;reason:string}[]=[],seen=new Set<string>(),ids=new Map<string,number>();for(const f of features){const id=text(f.properties?.OBJECTID);ids.set(id,(ids.get(id)??0)+1);}
  for(const f of features){const p=f.properties??{},id=text(p.OBJECTID),kind=classifyShadePit(p);if(kind==='planter'){quality.planterRows++;continue;}if(kind==='unknown'){quality.unknownClass++;excluded.push({id,reason:'unknown_name_classification'});continue;}quality.treePitRows++;
    if(!id||ids.get(id)!>1){quality.repeatedIdentifiers++;excluded.push({id,reason:'missing_or_repeated_objectid'});continue;}
    const geometry=featurePolygons(f);if(geometry.reason){quality.invalidGeometry++;excluded.push({id,reason:geometry.reason});continue;}
    const key=canonicalGeometry(geometry.polygons);if(seen.has(key)){quality.duplicateGeometry++;excluded.push({id,reason:'duplicate_geometry'});continue;}seen.add(key);
    const point:ProjectedPoint=[numeric(p.X_3826),numeric(p.Y_3826)];if(!validProjectedPoint(point)){quality.missingCoordinates++;excluded.push({id,reason:'missing_or_invalid_official_coordinate'});continue;}
    if(!geometry.polygons.some(poly=>polygonLocation(point,poly)!=='outside')){quality.coordinateOutsideGeometry++;excluded.push({id,reason:'official_coordinate_outside_source_geometry'});continue;}
    const district=text(p.Town_N),wgs=projectToWgs(point);if(!SHADE_DISTRICTS.includes(district)||locate(wgs.longitude,wgs.latitude)!==district){quality.districtMismatch++;excluded.push({id,reason:'source_geometry_district_disagreement_or_boundary'});continue;}
    pits.push({id:`pit:${id}`,district,point,polygons:geometry.polygons});
  }
  quality.accepted=pits.length;return{pits,quality,excluded};
}
