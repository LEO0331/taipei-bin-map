// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { auditShadeGeometry, auditShadeTrees, parseShadeTreeCsv } from './auditShadeEquitySources';
import { fetchShadeEquitySources, parseShadeCatalogue, restoreShadeEquitySources, shadeDatasets, shadeHash } from './fetchShadeEquitySources';

const directories: string[]=[];
afterEach(async()=>{await Promise.all(directories.splice(0).map(directory=>rm(directory,{recursive:true,force:true})));});
const tree = { TreeID:'t1',Dist:'中正區',Region:'路',RegionRemark:'側',TreeType:'榕樹',Diameter:'10',TreeHeight:'5',SurveyDate:'2020-01-01',TWD97X:'302000',TWD97Y:'2770000',UpdDate:'2026-10-19' };
const geometry = {type:'MultiPolygon',coordinates:[[[[302000,2770000],[302002,2770000],[302002,2770002],[302000,2770000]]]]};
const payload = (features: unknown[])=>({type:'FeatureCollection',crs:{properties:{name:'urn:ogc:def:crs:EPSG::3826'}},features});
const catalogue = (datasetId: string=shadeDatasets[0][1],resourceId: string=shadeDatasets[0][2])=>`<script id="__NUXT_DATA__">${JSON.stringify([{pid:1,resources:2,publish_date:7},datasetId,[3],{rid:4,url:5,file_format:6},resourceId,'https://tppkl.blob.core.windows.net/blobfs/TaipeiTree.csv','CSV','2020-01-01'])}</script>`;
async function frozenDirectory() {
  const directory=await mkdtemp(join(tmpdir(),'shade-source-test-'));directories.push(directory);
  const bytes=Buffer.from('approved original');
  await writeFile(join(directory,'roadside-trees.csv'),bytes);
  await writeFile(join(directory,'sources.json'),JSON.stringify({generatedAt:'2026-10-20T00:00:00Z',sources:[{id:'roadside_trees',resourceId:shadeDatasets[0][2],sha256:shadeHash(bytes),bytes:bytes.length}]}));
  return {directory,bytes};
}

describe('Shade Equity original source validation',()=>{
  it('rejects a roadside CSV without the actual update-date header',()=>{
    expect(()=>parseShadeTreeCsv('TreeID,Update\nt1,2020-01-01')).toThrow('required headers');
  });
  it('counts duplicate tree identities independently of exact-row duplication',()=>{
    expect(auditShadeTrees([tree,{...tree,Region:'另一段'}]).duplicateIds).toBe(1);
  });
  it('does not collapse different tree IDs with coincident coordinates',()=>{
    expect(auditShadeTrees([tree,{...tree,TreeID:'t2'}]).uniqueIds).toBe(2);
  });
  it('reports missing survey dates rather than substituting retrieval dates',()=>{
    expect(auditShadeTrees([{...tree,SurveyDate:''}]).surveyDates.missingOrMalformed).toBe(1);
  });
  it('rejects an undeclared coordinate reference system',()=>{
    expect(()=>auditShadeGeometry({type:'FeatureCollection',features:[]},false)).toThrow('CRS');
  });
  it('keeps tree-pit and flowerbed classifications separate',()=>{
    const features=['樹穴','花圃'].map((Name,index)=>({properties:{OBJECTID:index,Name,Town_N:'中正區',X_3826:302000,Y_3826:2770000},geometry}));
    expect(auditShadeGeometry(payload(features),true).classifications).toEqual({'樹穴':1,'花圃':1});
  });
  it('reports repeated sidewalk source IDs instead of silently merging road sides',()=>{
    const features=['東側','西側'].map(SW_DIRECT=>({properties:{ID:'s1',Town_N:'63000050',SW_DIRECT},geometry}));
    expect(auditShadeGeometry(payload(features),false).duplicateIds).toBe(1);
  });
  it('reports a zero-area ring without admitting it as validated geometry',()=>{
    const zero={type:'MultiPolygon',coordinates:[[[[302000,2770000],[302001,2770000],[302002,2770000],[302000,2770000]]]]};
    expect(auditShadeGeometry(payload([{properties:{ID:'s1'},geometry:zero}]),false).zeroAreaGeometry).toBe(1);
  });
  it('rejects catalogue HTML that lacks structured dataset metadata',()=>{
    expect(()=>parseShadeCatalogue('<html>not a catalogue</html>')).toThrow('no Nuxt data');
  });
  it('preserves the known-good source when a live request returns a server error',async()=>{
    const {directory,bytes}=await frozenDirectory();
    const fetcher=(async(input: string | URL | Request)=>new Response(String(input).includes('dataset/detail')?catalogue():'upstream unavailable',{status:String(input).includes('dataset/detail')?200:503})) as typeof fetch;
    await expect(fetchShadeEquitySources(directory,fetcher)).rejects.toThrow('HTTP 503');
    expect(await readFile(join(directory,'roadside-trees.csv'))).toEqual(bytes);
  });
  it('preserves the known-good source when live bytes differ from the frozen hash',async()=>{
    const {directory,bytes}=await frozenDirectory();
    const fetcher=(async(input: string | URL | Request)=>new Response(String(input).includes('dataset/detail')?catalogue():'new export',{status:200})) as typeof fetch;
    await expect(fetchShadeEquitySources(directory,fetcher)).rejects.toThrow('source changed');
    expect(await readFile(join(directory,'roadside-trees.csv'))).toEqual(bytes);
  });
  it('rejects a catalogue that no longer contains the reviewed resource identity',async()=>{
    const {directory}=await frozenDirectory();
    const fetcher=(async()=>new Response(catalogue(shadeDatasets[0][1],'changed-resource-id'),{status:200})) as typeof fetch;
    await expect(fetchShadeEquitySources(directory,fetcher)).rejects.toThrow('reviewed resource unavailable');
  });
  it('rejects a catalogue with a different dataset identity',async()=>{
    const {directory}=await frozenDirectory();
    const fetcher=(async()=>new Response(catalogue('changed-dataset-id',shadeDatasets[0][2]),{status:200})) as typeof fetch;
    await expect(fetchShadeEquitySources(directory,fetcher)).rejects.toThrow('dataset identity changed');
  });
  it('rejects unsupported catalogue formats before constructing output paths',async()=>{
    const {directory}=await frozenDirectory();
    const fetcher=(async(input:string|URL|Request)=>new Response(String(input).includes('dataset/detail')?catalogue().replace('"CSV"','"json/../../outside"'):'official original bytes',{status:200})) as typeof fetch;
    await expect(fetchShadeEquitySources(directory,fetcher)).rejects.toThrow('Unsupported source format');
  });
  it('does not substitute the dataset publication date for an unknown resource publication date',async()=>{
    const directory=await mkdtemp(join(tmpdir(),'shade-source-test-'));directories.push(directory);
    const fetcher=(async(input: string | URL | Request)=>{
      const definition=shadeDatasets.find(item=>String(input).endsWith(item[1]));
      return new Response(definition?catalogue(definition[1],definition[2]):'original bytes',{status:200});
    }) as typeof fetch;
    const manifest=await fetchShadeEquitySources(directory,fetcher);
    expect(manifest.sources.map(source=>source.resourcePublicationDate)).toEqual([null,null,null,null,null]);
  });
  it('restores original bytes from a verified frozen compressed archive without network access',async()=>{
    const directory=await mkdtemp(join(tmpdir(),'shade-source-test-'));directories.push(directory);
    const bytes=Buffer.from('official original bytes\r\n');
    await writeFile(join(directory,'source.csv.gz'),gzipSync(bytes));
    await writeFile(join(directory,'sources.json'),JSON.stringify({sources:[{filename:'source.csv',sha256:shadeHash(bytes),bytes:bytes.length}]}));
    await restoreShadeEquitySources(directory);
    expect(await readFile(join(directory,'source.csv'))).toEqual(bytes);
  });
  it('rejects a frozen archive whose expanded bytes differ from the approved source hash',async()=>{
    const directory=await mkdtemp(join(tmpdir(),'shade-source-test-'));directories.push(directory);
    await writeFile(join(directory,'source.csv.gz'),gzipSync(Buffer.from('changed')));
    await writeFile(join(directory,'sources.json'),JSON.stringify({sources:[{filename:'source.csv',sha256:shadeHash('approved'),bytes:7}]}));
    await expect(restoreShadeEquitySources(directory)).rejects.toThrow('hash');
  });
  it('rejects a frozen manifest path that escapes its archive directory',async()=>{
    const directory=await mkdtemp(join(tmpdir(),'shade-source-test-'));directories.push(directory);
    await writeFile(join(directory,'sources.json'),JSON.stringify({sources:[{filename:'../outside.csv',sha256:shadeHash(''),bytes:0}]}));
    await expect(restoreShadeEquitySources(directory)).rejects.toThrow('path');
  });
});
