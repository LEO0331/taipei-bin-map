import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { unzip, parseDbf, parseShp, inPolygon } from './binPolicyGis';
import { associatePoint, polygonsStrictlyContained } from '../src/lib/shadeEquitySpatial';
import { SHADE_CONFIGURATION_VERSION, SHADE_METHODOLOGY_VERSION, type ShadeEquitySnapshot, type ShadeEquitySegment, type ShadeEquitySource } from '../src/types/shadeEquity';
import { decodeShadeTreeCsv, normalizeShadeGeometry, normalizeShadeTrees, normalizeShadeSidewalks, normalizeShadePits, projectToWgs, sha256, SHADE_DISTRICTS, validateShadeSourceBytes, type ShadeSourceManifest } from './convertShadeEquitySources';

const DEFAULT_RAW=resolve('data/raw/shade-equity');
const DEFAULT_OUTPUT=resolve('public/data/shade-equity');
const BOUNDARY_DIR=resolve('data/raw/bin-policy/v1-14c24bcdbade');
const DISTRICT_SHA256='77bcc347b503b8ff8a43f7e1afaaedb18877a6222282587b145adaba69afd2d9';
export function shadeSourceDate(value:string|null|undefined):string|null{
  if(!value)return null;
  const candidate=/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)?value.replace(' ','T')+'+08:00':value;
  if(!Number.isFinite(Date.parse(candidate)))throw new Error('Invalid source update date');return candidate;
}
/** Reuse audited ZIP/SHP decoding, never bin populations; bounding boxes only prune provably outside districts. */
export function indexedShadeDistrictLocator(path:string){
  const files=unzip(readFileSync(path)),dbf=Object.entries(files).find(([name])=>name.endsWith('.dbf'))?.[1],shp=Object.entries(files).find(([name])=>name.endsWith('.shp'))?.[1];
  if(!dbf||!shp)throw new Error('Missing official district geometry');
  const rows=parseDbf(dbf,'utf8'),shapes=parseShp(shp);
  const districts=shapes.map((shape,index)=>{const name=Object.values(rows[index].row).find(value=>SHADE_DISTRICTS.includes(value));let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const ring of shape.rings)for(const [x,y]of ring){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}return{name,rings:shape.rings,minX,minY,maxX,maxY};});
  if(districts.length!==12||districts.some(d=>!d.name))throw new Error('District boundary schema mismatch');
  return(longitude:number,latitude:number)=>{const hits=districts.filter(d=>longitude>=d.minX&&longitude<=d.maxX&&latitude>=d.minY&&latitude<=d.maxY&&inPolygon(longitude,latitude,d.rings));return hits.length===1?hits[0].name!:null;};
}
const LIMITATIONS=[
  'Registered roadside trees are not measured canopy, shade coverage, heat exposure or verified physical absence.',
  'Tree-pit geometry and proximity do not establish vacancy, occupancy or planting feasibility.',
  'Published sidewalk length definition and units have not been independently verified: all density denominators and segment priorities are unavailable.',
  'Partial historical sidewalk geometry and different source periods do not establish comparable citywide or district coverage.',
  'Canopy, pedestrian thermal exposure, survival, underground utilities and planting approvals are unavailable; no environmental risk score is produced.',
];
export interface ShadeInventory {rawTreeRows:number;acceptedTrees:number;rawSidewalkFeatures:number;acceptedSidewalks:number;rawPitFeatures:number;acceptedPits:number;matchedTrees:number;unmatchedTrees:number;ambiguousTrees:number;matchedPits:number;unmatchedPits:number;ambiguousPits:number;eligibleDensityLengthM:null}
export interface ShadeDistrictSummary {district:string;sidewalkSegments:number;treeObservations:number;pitObservations:number;matchedTrees:number;matchedPits:number;ambiguousTrees:number;ambiguousPits:number;eligibleLengthM:null;comparable:false}
export interface ShadeBuiltSnapshot extends ShadeEquitySnapshot {inventory:ShadeInventory;districtSummary:ShadeDistrictSummary[];spatialQuality:Record<string,unknown>;districtChunks?:Record<string,string>;segmentCoverage?:'district_chunks_not_loaded'}
export function validateShadeManifest(input:unknown):ShadeSourceManifest {
  const m=input as ShadeSourceManifest;
  if(m?.schemaVersion!==1||!/^shade-source-v1-[a-f0-9]{16}$/.test(m.snapshotId)||!Number.isFinite(Date.parse(m.generatedAt))||!Array.isArray(m.sources))throw new Error('Shade source manifest version mismatch');
  if(m.snapshotId!==`shade-source-v1-${sha256(JSON.stringify(m.sources.map(source=>[source.id,source.resourceId,source.sha256]))).slice(0,16)}`)throw new Error('Source snapshot version does not match retained resource hashes');
  const expected:Record<string,[string,string]>={roadside_trees:['7a49d00c-a5ff-4a6b-be9e-aaa6dc1ff7e8','0e96f4b5-8f8c-4935-ae0b-b97b3d031c94'],sidewalks:['715d3a83-8445-4496-b6bf-b0900538b7e7','b11d6142-1d71-41d5-a843-7b7cfcea61ef'],tree_pits:['693705fa-4604-4207-bd50-8a9ce9fcfbc6','3e2b359b-8dae-46e4-a747-5912d8743d0e']};
  const ids=new Set<string>();for(const s of m.sources){if(ids.has(s.id)||basename(s.filename)!==s.filename||!s.filename||!/^https:\/\//.test(s.downloadUrl)||!/^https:\/\//.test(s.datasetUrl)||s.httpStatus!==200||s.approvalStatus!=='review_required'||s.encoding!=='UTF-8'||!Number.isFinite(Date.parse(s.fetchedAt))||!Number.isSafeInteger(s.bytes)||s.bytes<=0)throw new Error('Invalid source identity or approval state');ids.add(s.id);const e=expected[s.id];if(e&&(s.datasetId!==e[0]||s.resourceId!==e[1]))throw new Error('Official source resource identity changed; explicit review required');}
  if(Object.keys(expected).some(id=>!ids.has(id)))throw new Error('Missing core shade source');return m;
}
function verifiedBoundary(){
  const records=JSON.parse(readFileSync(join(BOUNDARY_DIR,'sources.json'),'utf8')) as {id:string;sha256:string;datasetId:string;resourceId:string;downloadUrl:string;datasetUrl:string;provider:string;name:string;fetchedAt:string;resourceUpdatedAt:string}[];
  const entry=records.find(s=>s.id==='districts');if(!entry||entry.datasetId!=='1601ef3a-c253-4988-b047-943d9e786143'||entry.resourceId!=='d8b7eb29-136f-49fc-b14b-3489d3656122'||entry.sha256!==DISTRICT_SHA256)throw new Error('Frozen district boundary identity mismatch');const file=join(BOUNDARY_DIR,'districts.zip'),bytes=readFileSync(file);validateShadeSourceBytes(bytes,DISTRICT_SHA256);
  const projection=Object.entries(unzip(bytes)).find(([name])=>name.endsWith('.prj'))?.[1].toString('utf8');
  if(!projection?.includes('PROJCS["TWD_1997_TM_Taiwan"')||!projection.includes('PROJECTION["Transverse_Mercator"]')||!projection.includes('PARAMETER["Central_Meridian",121.0]')||!projection.includes('PARAMETER["False_Easting",250000.0]')||!projection.includes('PARAMETER["Scale_Factor",0.9999]')||!projection.includes('UNIT["Meter",1.0]'))throw new Error('District archive projected CRS declaration changed');
  return {locate:indexedShadeDistrictLocator(file),source:{id:'shade_district_boundaries',name:entry.name,provider:entry.provider,datasetId:entry.datasetId,resourceId:entry.resourceId,url:entry.datasetUrl,sha256:entry.sha256,suitability:'context_only' as const,sourceUpdatedAt:entry.resourceUpdatedAt,retrievedAt:entry.fetchedAt,crs:'EPSG:3826 (TWD97 / TM2 zone 121), projected metres; district.prj declares TWD_1997_TM_Taiwan',transformation:'Audited SHP parser applies existing inverse TWD97-TM2 conversion to WGS84-compatible longitude/latitude before exact district containment; the source shapefile is not raw WGS84.',limitations:['Shared official administrative boundary geometry only; no bin-policy observations or algorithms reused.']}};
}
export function prepareShadeEquityInputs(directory=DEFAULT_RAW){
  const manifest=validateShadeManifest(JSON.parse(readFileSync(join(directory,'sources.json'),'utf8')));
  const input=new Map<string,Buffer>();for(const s of manifest.sources){const bytes=readFileSync(join(directory,s.filename));validateShadeSourceBytes(bytes,s.sha256);if(bytes.byteLength!==s.bytes)throw new Error('Source byte length mismatch');input.set(s.id,bytes);}
  const boundary=verifiedBoundary();
  const trees=normalizeShadeTrees(decodeShadeTreeCsv(input.get('roadside_trees')!),boundary.locate);
  console.log('Validated roadside trees',trees.quality);
  const sidewalks=normalizeShadeSidewalks(normalizeShadeGeometry(JSON.parse(input.get('sidewalks')!.toString('utf8'))),boundary.locate);
  console.log('Validated sidewalks',sidewalks.quality);
  const pits=normalizeShadePits(normalizeShadeGeometry(JSON.parse(input.get('tree_pits')!.toString('utf8'))),boundary.locate);
  console.log('Validated tree pits',pits.quality);
  return {manifest,boundary,trees,sidewalks,pits};
}
export function buildShadeEquitySnapshot(directory=DEFAULT_RAW,toleranceM=2,prepared?:ReturnType<typeof prepareShadeEquityInputs>) {
  if(!Number.isFinite(toleranceM)||toleranceM<0||toleranceM>5)throw new Error('Association tolerance must be within 0–5 m');
  const inputs=prepared??prepareShadeEquityInputs(directory);
  const {manifest,boundary,trees,sidewalks,pits}=inputs;
  const counts=new Map(sidewalks.units.map(unit=>[unit.id,{trees:0,pits:0,ambiguousTrees:0,ambiguousPits:0,surveyDates:[] as string[]} ]));
  const associations={matchedTrees:0,unmatchedTrees:0,ambiguousTrees:0,districtMismatchTrees:0,nearTrees:0,matchedPits:0,unmatchedPits:0,ambiguousPits:0,districtMismatchPits:0,nearPits:0};
  const unresolved:{kind:string;id:string;status:string;candidateIds:string[]}[]=[];
  for(const tree of trees.trees){const match=associatePoint(tree.point,sidewalks.index,toleranceM,tree.district);if(match.status==='matched'){const count=counts.get(match.segmentId!)!;count.trees++;if(tree.surveyDate)count.surveyDates.push(tree.surveyDate);associations.matchedTrees++;if(match.method==='proximity')associations.nearTrees++;}else{if(match.status==='ambiguous'){associations.ambiguousTrees++;for(const id of match.candidateIds)counts.get(id)!.ambiguousTrees++;}else if(match.status==='district_mismatch')associations.districtMismatchTrees++;else associations.unmatchedTrees++;unresolved.push({kind:'tree',id:tree.id,status:match.status,candidateIds:match.candidateIds});}}
  for(const pit of pits.pits){const match=associatePoint(pit.point,sidewalks.index,toleranceM,pit.district);
    // A representative point is insufficient: any polygon vertex outside the chosen sidewalk makes the pit association unresolved.
    if(match.status==='matched'&&!polygonsStrictlyContained(pit.polygons,sidewalks.index.units.get(match.segmentId!)!.polygons)){match.status='ambiguous';delete match.segmentId;}
    if(match.status==='matched'){counts.get(match.segmentId!)!.pits++;associations.matchedPits++;if(match.method==='proximity')associations.nearPits++;}else{if(match.status==='ambiguous'){associations.ambiguousPits++;for(const id of match.candidateIds)counts.get(id)!.ambiguousPits++;}else if(match.status==='district_mismatch')associations.districtMismatchPits++;else associations.unmatchedPits++;unresolved.push({kind:'pit',id:pit.id,status:match.status,candidateIds:match.candidateIds});}}
  const segments:ShadeEquitySegment[]=sidewalks.units.map((unit):ShadeEquitySegment=>{const n=counts.get(unit.id)!,unresolvedAssociation=Boolean(n.ambiguousTrees||n.ambiguousPits||sidewalks.overlapIds.has(unit.id)),position=projectToWgs(unit.point);return{id:unit.id,district:unit.district,road:[unit.road,unit.side,unit.start&&unit.end?`${unit.start}—${unit.end}`:''].filter(Boolean).join(' · '),lengthM:null,widthM:null,...position,geometryValid:true,sourceVerified:true,measurementVerified:false,treeCount:n.trees,pitCount:n.pits,ambiguousTreeCount:n.ambiguousTrees,ambiguousPitCount:n.ambiguousPits,unresolvedAssociation,confidence:unresolvedAssociation?'low':'medium',surveyDate:n.surveyDates.sort()[0]??null,treeSourceId:'roadside_trees',pitSourceId:'tree_pits',sidewalkSourceId:'sidewalks',questions:[{dimension:'sidewalk_geometry',causeId:'unverified_length_definition',material:false,scope:'global',reason:'Published length measurement definition and units require authoritative confirmation; density and prioritization disabled.'},...(unresolvedAssociation?[{dimension:'spatial_association',causeId:'ambiguous_spatial_relationship',material:true,scope:'segment' as const,reason:'Overlapping or multiple possible sidewalk associations require investigation.'}]:[]),...(n.pits?[{dimension:'tree_pit_occupancy',causeId:'pit_occupancy_requires_field_check',material:false,scope:'global' as const,reason:'Tree-pit geometry does not establish vacancy or occupation.'}]:[])]};}).sort((a,b)=>a.id.localeCompare(b.id,'en'));
  const sources:ShadeEquitySource[]=manifest.sources.map(s=>{
    const core=['roadside_trees','sidewalks','tree_pits'].includes(s.id);
    const population=s.id==='parks_context'?'park_context':s.id==='greening_context'?'historical_context':s.id;
    return {id:s.id,name:s.name,provider:s.provider,datasetId:s.datasetId,resourceId:s.resourceId,url:s.datasetUrl,sha256:s.sha256,suitability:core?'limited':'context_only',population:population as ShadeEquitySource['population'],sourceUpdatedAt:shadeSourceDate(s.resourceUpdatedAt),retrievedAt:s.fetchedAt,processedAt:manifest.generatedAt,
      rawCount:s.id==='roadside_trees'?trees.quality.rawRows:s.id==='sidewalks'?sidewalks.quality.rawFeatures:s.id==='tree_pits'?pits.quality.rawFeatures:null,
      acceptedCount:s.id==='roadside_trees'?trees.trees.length:s.id==='sidewalks'?sidewalks.units.length:s.id==='tree_pits'?pits.pits.length:null,
      duplicateCount:s.id==='roadside_trees'?trees.quality.repeatedIdentifiers+trees.quality.duplicateCoordinates:s.id==='sidewalks'?sidewalks.quality.duplicateGeometry:s.id==='tree_pits'?pits.quality.duplicateGeometry:null,
      invalidGeometryCount:s.id==='sidewalks'?sidewalks.quality.invalidGeometry:s.id==='tree_pits'?pits.quality.invalidGeometry:null,
      missingCoordinateCount:s.id==='roadside_trees'?trees.quality.missingCoordinates:s.id==='tree_pits'?pits.quality.missingCoordinates:null,
      crs:core?'EPSG:3826 (TWD97 / TM2 zone 121), metres':null,transformation:core?'Existing convertTwd97ToWgs84; projected coordinates retained for exact offline joins':null,
      geographicCoverage:'Source-published coverage only; exclusions and missing sidewalk extent prevent citywide comparability',limitations:core?LIMITATIONS:['Context only; no sidewalk shade or tree-removal inference.']};
  });sources.push({...boundary.source,processedAt:manifest.generatedAt});
  const inventory:ShadeInventory={rawTreeRows:trees.quality.rawRows,acceptedTrees:trees.trees.length,rawSidewalkFeatures:sidewalks.quality.rawFeatures,acceptedSidewalks:sidewalks.units.length,rawPitFeatures:pits.quality.rawFeatures,acceptedPits:pits.pits.length,matchedTrees:associations.matchedTrees,unmatchedTrees:associations.unmatchedTrees+associations.districtMismatchTrees,ambiguousTrees:associations.ambiguousTrees,matchedPits:associations.matchedPits,unmatchedPits:associations.unmatchedPits+associations.districtMismatchPits,ambiguousPits:associations.ambiguousPits,eligibleDensityLengthM:null};
  const districtSummary:ShadeDistrictSummary[]=SHADE_DISTRICTS.map(district=>{const units=segments.filter(s=>s.district===district);return{district,sidewalkSegments:units.length,treeObservations:trees.trees.filter(t=>t.district===district).length,pitObservations:pits.pits.filter(p=>p.district===district).length,matchedTrees:units.reduce((n,s)=>n+s.treeCount,0),matchedPits:units.reduce((n,s)=>n+s.pitCount,0),ambiguousTrees:units.reduce((n,s)=>n+s.ambiguousTreeCount,0),ambiguousPits:units.reduce((n,s)=>n+s.ambiguousPitCount,0),eligibleLengthM:null,comparable:false};});
  const spatialQuality={trees:trees.quality,sidewalks:sidewalks.quality,pits:pits.quality,associations,overlapPairs:sidewalks.overlapPairs,overlapDefinition:'Conservative polygon intersection includes touching boundaries, not only positive-area overlap.',toleranceM,proximityMaximumM:5,boundaryEpsilonM:1e-7,indexCellSizeM:100,geometrySimplification:'none',ambiguousSegmentCountsNonAdditive:true,measurementGate:'Official length field and units not verified; all eligible density denominators are null.'};
  const snapshot:ShadeBuiltSnapshot={schemaVersion:1,methodologyVersion:SHADE_METHODOLOGY_VERSION,configurationVersion:SHADE_CONFIGURATION_VERSION,snapshotId:`shade-equity-v1-${sha256(JSON.stringify({source:manifest.snapshotId,hashes:sources.map(s=>s.sha256),toleranceM,method:SHADE_METHODOLOGY_VERSION,config:SHADE_CONFIGURATION_VERSION})).slice(0,16)}`,generatedAt:manifest.generatedAt,associationToleranceM:toleranceM,eligiblePopulation:'Audited official sidewalk geometry inventory only; prioritized candidates and length-normalized comparisons disabled pending measurement review.',sources,segments,limitations:LIMITATIONS,comparability:{eligible:false,reasons:['Unverified sidewalk length measurement definition and units','Incomplete and temporally different official inventory extents','No segment-scale canopy or heat evidence']},inventory,districtSummary,spatialQuality};
  // Bind the derived population and assumptions, not just source hashes: a corrected join cannot retain a misleading old identity.
  snapshot.snapshotId=`shade-equity-v1-${sha256(JSON.stringify({...snapshot,snapshotId:undefined})).slice(0,16)}`;
  const report={schemaVersion:1,snapshotId:snapshot.snapshotId,generatedAt:manifest.generatedAt,methodologyVersion:SHADE_METHODOLOGY_VERSION,configurationVersion:SHADE_CONFIGURATION_VERSION,sourceHashes:sources.map(s=>({id:s.id,sha256:s.sha256})),spatialQuality,excluded:{trees:trees.excluded,sidewalks:sidewalks.excluded,pits:pits.excluded},unresolvedAssociations:unresolved,officialMeasurements:sidewalks.units.map(unit=>({id:unit.id,sourceRecord:unit.sourceRecord,side:unit.side,officialLengthRaw:unit.officialLengthRaw,widthRaw:unit.widthRaw,clearWidthRaw:unit.clearWidthRaw,measurementDefinitionVerified:false})),eligibleCandidates:0,limitations:LIMITATIONS};
  return{snapshot,report,prepared:inputs};
}
export function verifyShadeSnapshotReplay(output:string,files:Record<string,unknown>){
  // Validate every existing output before any write, including district chunk contents.
  for(const [name,data]of Object.entries(files)){
    const file=join(output,name);if(existsSync(file)&&sha256(readFileSync(file))!==sha256(JSON.stringify(data)+'\n'))throw new Error(`Frozen shade output differs (${name}); reviewed regeneration requires a new versioned output directory`);
  }
}
export function publishShadeEquitySnapshot(directory=DEFAULT_RAW,output=DEFAULT_OUTPUT,toleranceM=2){
  if(!existsSync(resolve('docs/shade-equity-source-audit.md')))throw new Error('Source audit must exist before snapshot publication');
  const result=buildShadeEquitySnapshot(directory,toleranceM);
  const districtChunks=Object.fromEntries(Object.entries(SHADE_DISTRICTS.reduce<Record<string,string>>((acc,district,index)=>{acc[district]=`district-63000${String(index+1).padStart(2,'0')}0.json`;return acc;},{})));
  const metadata={...result.snapshot,segments:[],districtChunks,segmentCoverage:'district_chunks_not_loaded'};
  const files:Record<string,unknown>={'snapshot.json':metadata,'source-health.json':result.snapshot.sources,'district-summary.json':result.snapshot.districtSummary,'spatial-quality.json':result.snapshot.spatialQuality,'review-candidates.json':{snapshotId:result.snapshot.snapshotId,candidates:[],reason:'Measurement definition is unverified; no ranked environmental claims.'},'conversion-report.json':{...result.report,excluded:undefined,unresolvedAssociations:undefined,officialMeasurements:undefined}};
  for(const [district,filename]of Object.entries(districtChunks))files[filename]={schemaVersion:1,snapshotId:result.snapshot.snapshotId,district,segments:result.snapshot.segments.filter(segment=>segment.district===district).map(segment=>({...segment,questions:segment.questions.filter(question=>question.scope==='segment')}))};
  const existing=join(output,'snapshot.json');if(existsSync(existing)&&JSON.parse(readFileSync(existing,'utf8')).snapshotId!==result.snapshot.snapshotId)throw new Error('Existing snapshot differs; publish reviewed changes into a new versioned output directory');
  verifyShadeSnapshotReplay(output,files);
  mkdirSync(output,{recursive:true});for(const [name,data]of Object.entries(files))writeFileSync(join(output,name),JSON.stringify(data)+'\n');
  const reportDir=resolve('reports/shade-equity');mkdirSync(reportDir,{recursive:true});writeFileSync(join(reportDir,'conversion-report.json'),JSON.stringify(result.report)+'\n');
  console.log(JSON.stringify({snapshotId:result.snapshot.snapshotId,inventory:result.snapshot.inventory,eligibleCandidates:0}));return result;
}
if(import.meta.url===pathToFileURL(process.argv[1]??'').href)publishShadeEquitySnapshot(resolve(process.argv[2]??DEFAULT_RAW),resolve(process.argv[3]??DEFAULT_OUTPUT),Number(process.argv[4]??2));
