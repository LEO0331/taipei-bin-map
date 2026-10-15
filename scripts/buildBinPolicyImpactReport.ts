import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { allocateBins, distance, METHOD, type PolicyPoint, type PolicyParameters } from '../src/lib/binPolicyDecision';
import { compareBusStops } from './compareBusStopSources';

export function buildDecisionImpact(bins:PolicyPoint[],old:PolicyPoint[],proposed:PolicyPoint[],parameters:PolicyParameters){
  const a=allocateBins(bins,old,parameters),b=allocateBins(bins,proposed,parameters);
  const summary=(value:typeof a)=>({referenceCount:value.referenceCount,baselineCovered:value.baselineCovered,baselineCoveragePercent:value.referenceCount?100*value.baselineCovered/value.referenceCount:null,postCovered:value.postCovered,incrementalCoverage:value.incrementalCoverage});
  const rankingChanges=a.selected.map((candidate,index)=>{
    const nearest=[...b.selected].sort((x,y)=>distance(candidate.point,x.point)-distance(candidate.point,y.point)||x.point.id.localeCompare(y.point.id,'en'))[0];
    return {oldRank:index+1,oldId:candidate.point.id,nearestProposedId:nearest?.point.id??null,nearestProposedRank:nearest?b.selected.indexOf(nearest)+1:null,geographicShiftMeters:nearest?distance(candidate.point,nearest.point):null,relationship:'nearest_candidate_not_verified_same_stop'};
  });
  return {methodology:METHOD,interpretation:'data_version_sensitivity_not_policy_effect',parameters,statistics:{old:summary(a),proposed:summary(b)},old:a,proposed:b,rankingChanges,limitations:['Reference populations differ. Percentage differences are not policy improvement/deterioration.','Nearest candidate is a geographic comparison, not a verified record identity or confirmed relocation.']};
}
export function generateBusReports(policyPath:string,proposedPath:string){
  const snapshot=JSON.parse(readFileSync(policyPath,'utf8'));const proposed=JSON.parse(readFileSync(proposedPath,'utf8'));
  const shared={schemaVersion:1,policySnapshotId:snapshot.snapshotId,generatedAt:new Date().toISOString(),sourceVersions:{old:{versionId:snapshot.snapshotId,source:snapshot.sources.find((s:{id:string})=>s.id==='bus'),quality:{sourceRows:snapshot.quality.referenceSourceRows,duplicateCoordinates:snapshot.quality.duplicateReferences,excluded:snapshot.quality.excluded.filter((r:{source:string})=>r.source==='bus')}},proposed:{versionId:proposed.versionId,source:proposed.source,quality:proposed.quality}},adoption:'review_required',defaultSource:'audited_2021'};
  const comparison={...shared,...compareBusStops(snapshot.references,proposed.references)};
  const parameters:PolicyParameters={district:'中正區',radius:300,count:5,separation:50,unitCost:null,budget:null};
  const impact={...shared,...buildDecisionImpact(snapshot.bins,snapshot.references,proposed.references,parameters)};
  writeFileSync('public/data/bin-policy/bus-source-comparison.json',JSON.stringify(comparison));
  writeFileSync('public/data/bin-policy/bus-decision-impact.json',JSON.stringify(impact));
  return {comparison,impact};
}
if(import.meta.url===pathToFileURL(process.argv[1]??'').href){const result=generateBusReports(process.argv[2]??'public/data/bin-policy/analysis.json',process.argv[3]??'public/data/bin-policy/bus-proposed.json');console.log(JSON.stringify({comparison:result.comparison.statistics,impact:result.impact.statistics},null,2));}
