// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildShadeEquitySnapshot, shadeSourceDate, validateShadeManifest, verifyShadeSnapshotReplay, indexedShadeDistrictLocator } from './buildShadeEquitySnapshot';
import { districtLocator } from './convertCurrentBusStops';
import { sha256, type ShadeSourceManifest } from './convertShadeEquitySources';
import { validateShadeEquitySnapshot } from '../src/lib/shadeEquityDecision';
const directories:string[]=[];
afterEach(()=>{for(const directory of directories.splice(0))rmSync(directory,{recursive:true,force:true});vi.restoreAllMocks();});
function fixture(){
  const directory=mkdtempSync(join(tmpdir(),'shade-spatial-'));directories.push(directory);
  const manifest=JSON.parse(readFileSync('data/raw/shade-equity/sources.json','utf8')) as ShadeSourceManifest;
  manifest.sources=manifest.sources.slice(0,3);
  const square=(x:number,y:number,size:number)=>({type:'MultiPolygon',coordinates:[[[[x,y],[x+size,y],[x+size,y+size],[x,y+size],[x,y]]]]});
  const collection=(features:unknown[])=>JSON.stringify({type:'FeatureCollection',crs:{properties:{name:'urn:ogc:def:crs:EPSG::3826'}},features});
  const payloads=[
    'TreeID,Dist,Region,RegionRemark,TreeType,Diameter,TreeHeight,SurveyDate,TWD97X,TWD97Y,UpdDate\nt1,中正區,北平東路,北側,榕樹,20,5,2022-01-01,303131,2770951,2026-10-19',
    collection([{type:'Feature',properties:{ID:'s1',Town_N:'63000050',NAME_Road:'北平東路',SW_DIRECT:'北側',SW_LENG_ItemValue:10,SW_WTH_ItemValue:10},geometry:square(303130,2770950,10)}]),
    collection([{type:'Feature',properties:{OBJECTID:1,Name:'樹穴',Town_N:'中正區',X_3826:303133,Y_3826:2770953},geometry:square(303132,2770952,2)}]),
  ];
  manifest.sources.forEach((source,index)=>{const bytes=Buffer.from(payloads[index]);source.sha256=sha256(bytes);source.bytes=bytes.length;writeFileSync(join(directory,source.filename),bytes);});
  manifest.snapshotId=`shade-source-v1-${sha256(JSON.stringify(manifest.sources.map(source=>[source.id,source.resourceId,source.sha256]))).slice(0,16)}`;
  writeFileSync(join(directory,'sources.json'),JSON.stringify(manifest));vi.spyOn(console,'log').mockImplementation(()=>{});
  return {directory,manifest};
}
describe('shade snapshot publication contract',()=>{
  it('keeps an unavailable source update date unknown',()=>expect(shadeSourceDate(null)).toBeNull());
  it('does not append a second timezone to ISO dates',()=>expect(shadeSourceDate('2026-10-19T00:00:00Z')).toBe('2026-10-19T00:00:00Z'));
  it('interprets catalogue local timestamps explicitly as Taipei time',()=>expect(shadeSourceDate('2026-10-19 08:00:00')).toBe('2026-10-19T08:00:00+08:00'));
  it('rejects changed source resource identity',()=>{const {manifest}=fixture();manifest.sources[0].resourceId='changed';expect(()=>validateShadeManifest(manifest)).toThrow();});
  it('rejects source hashes inconsistent with the frozen version',()=>{const {manifest}=fixture();manifest.sources[0].sha256='0'.repeat(64);expect(()=>validateShadeManifest(manifest)).toThrow(/version/i);});
  it('rejects source paths escaping the archive',()=>{const {manifest}=fixture();manifest.sources[0].filename='../trees.csv';expect(()=>validateShadeManifest(manifest)).toThrow(/identity/i);});
  it('rejects changed static output before replacing known-good files',()=>{const {directory}=fixture();writeFileSync(join(directory,'snapshot.json'),'original');expect(()=>verifyShadeSnapshotReplay(directory,{'snapshot.json':{changed:true}})).toThrow(/Frozen/);expect(readFileSync(join(directory,'snapshot.json'),'utf8')).toBe('original');});
  it('accepts an exact-byte static output replay',()=>{const {directory}=fixture(),data={stable:true};writeFileSync(join(directory,'snapshot.json'),JSON.stringify(data)+'\n');expect(()=>verifyShadeSnapshotReplay(directory,{'snapshot.json':data})).not.toThrow();});
  it('preserves exact official district containment while filtering impossible bounding boxes',()=>{const path='data/raw/bin-policy/v1-14c24bcdbade/districts.zip',original=districtLocator(path),indexed=indexedShadeDistrictLocator(path);for(const point of [[121.5,25.03],[121.55,25.03],[121.6,25.06],[121.48,25.15],[121.1,25.1]])expect(indexed(point[0],point[1])).toBe(original(point[0],point[1]));});
  it('reproduces an identical snapshot from identical original bytes',()=>{const {directory}=fixture();expect(buildShadeEquitySnapshot(directory).snapshot).toEqual(buildShadeEquitySnapshot(directory).snapshot);});
  it('retains identical associations when reusing exactly validated normalized inputs',()=>{const {directory}=fixture(),first=buildShadeEquitySnapshot(directory);expect(buildShadeEquitySnapshot(directory,2,first.prepared).snapshot).toEqual(first.snapshot);});
  it('does not promote raw official lengths into validated density metres',()=>{const {directory}=fixture();expect(buildShadeEquitySnapshot(directory).snapshot.segments[0].lengthM).toBeNull();});
  it('keeps the measurement gate closed despite positive official length values',()=>{const {directory}=fixture();expect(buildShadeEquitySnapshot(directory).snapshot.segments[0].measurementVerified).toBe(false);});
  it('counts a tree exactly once in additive inventory totals',()=>{const {directory}=fixture();const {snapshot}=buildShadeEquitySnapshot(directory);expect(snapshot.segments.reduce((n,s)=>n+s.treeCount,0)).toBe(1);});
  it('retains tree-pit observations without assigning vacancy',()=>{const {directory}=fixture();expect(buildShadeEquitySnapshot(directory).snapshot.inventory.matchedPits).toBe(1);});
  it('generates a snapshot accepted by the shared browser and engine contract',()=>{const {directory}=fixture();const {snapshot}=buildShadeEquitySnapshot(directory);expect(()=>validateShadeEquitySnapshot(snapshot)).not.toThrow();});
  it('preserves projected EPSG:3826 district source CRS instead of describing normalized rings as raw WGS84',()=>{const {directory}=fixture();expect(buildShadeEquitySnapshot(directory).snapshot.sources.find(source=>source.id==='shade_district_boundaries')?.crs).toContain('EPSG:3826');});
});
