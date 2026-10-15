import { distance, type PolicyPoint } from '../src/lib/binPolicyDecision';

export function compareBusStops(old:PolicyPoint[], proposed:PolicyPoint[], toleranceMeters=30, verifiedSharedIdNamespace=false) {
  if(!Number.isFinite(toleranceMeters)||toleranceMeters<0)throw new Error('Invalid comparison tolerance');
  const ordered=(rows:PolicyPoint[])=>[...rows].sort((a,b)=>a.id.localeCompare(b.id,'en'));
  const before=ordered(old),after=ordered(proposed);const usedOld=new Set<string>(),usedNew=new Set<string>();
  const matches:{oldId:string;newId:string;meters:number;classification:string;evidence:string}[]=[];
  // Old SHP BSM_BUSSTO namespace is not proven equivalent to StopLocation.id.
  if(verifiedSharedIdNamespace)for(const a of before){const b=after.filter(p=>p.sourceRecord===a.sourceRecord);if(b.length===1&&!usedNew.has(b[0].id)){const meters=distance(a,b[0]);matches.push({oldId:a.id,newId:b[0].id,meters,classification:meters>toleranceMeters?'potentially_moved_shared_id':'verified_shared_identifier',evidence:'shared_namespace_explicitly_verified_by_caller'});usedOld.add(a.id);usedNew.add(b[0].id);}}
  const edges=before.filter(a=>!usedOld.has(a.id)).map(a=>({a,possible:after.filter(b=>!usedNew.has(b.id)&&Math.abs(a.latitude-b.latitude)<.001&&Math.abs(a.longitude-b.longitude)<.001).map(b=>({b,meters:distance(a,b)})).filter(b=>b.meters<=toleranceMeters)}));
  const degrees=new Map<string,number>();edges.forEach(e=>e.possible.forEach(p=>degrees.set(p.b.id,(degrees.get(p.b.id)??0)+1)));
  const ambiguous:{oldId:string;newIds:string[]}[]=[];
  for(const {a,possible}of edges){if(possible.length===1&&degrees.get(possible[0].b.id)===1){const {b,meters}=possible[0];matches.push({oldId:a.id,newId:b.id,meters,classification:'possible_spatial_match',evidence:'mutually_unique_proximity_only_not_identity'});usedOld.add(a.id);usedNew.add(b.id);}else if(possible.length)ambiguous.push({oldId:a.id,newIds:possible.map(p=>p.b.id)});}
  const districts=(rows:PolicyPoint[])=>Object.fromEntries([...new Set(rows.map(p=>p.district))].sort().map(d=>[d,rows.filter(p=>p.district===d).length]));
  return { toleranceMeters,verifiedSharedIdNamespace,statistics:{old:{referenceCount:old.length,uniqueCoordinates:new Set(old.map(p=>`${p.longitude.toFixed(7)},${p.latitude.toFixed(7)}`)).size,districts:districts(old)},proposed:{referenceCount:proposed.length,uniqueCoordinates:new Set(proposed.map(p=>`${p.longitude.toFixed(7)},${p.latitude.toFixed(7)}`)).size,districts:districts(proposed)},possibleMatched:matches.length,ambiguous:ambiguous.length,matchingRate:old.length?matches.length/old.length:null},matches,ambiguous,oldUnmatched:before.filter(p=>!usedOld.has(p.id)).map(p=>p.id),newUnmatched:after.filter(p=>!usedNew.has(p.id)).map(p=>p.id),limitations:['Spatial matches are review candidates, not established identity. Names alone are never matched.','Unmatched old references are not confirmed closures. Cross-source ID namespaces are unverified unless explicitly documented.'] };
}
