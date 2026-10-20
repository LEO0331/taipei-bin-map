/** Offline projected-metre GIS. No geometry simplification or invented network links. */
export type ProjectedPoint = [number, number];
export type ProjectedPolygon = ProjectedPoint[][];
export interface SpatialUnit { id: string; district: string; polygons: ProjectedPolygon[] }
type Bounds = [number, number, number, number];
const EPSILON = 1e-7;
const cross = (a: ProjectedPoint, b: ProjectedPoint, c: ProjectedPoint) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const equal = (a: ProjectedPoint, b: ProjectedPoint) => a[0] === b[0] && a[1] === b[1];
export function pointEdgeDistance(p: ProjectedPoint, a: ProjectedPoint, b: ProjectedPoint) {
  const dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy;
  const t=den ? Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/den)) : 0;
  return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);
}
function edgesIntersect(a: ProjectedPoint,b: ProjectedPoint,c: ProjectedPoint,d: ProjectedPoint) {
  if (Math.max(a[0],b[0])+EPSILON<Math.min(c[0],d[0]) || Math.max(c[0],d[0])+EPSILON<Math.min(a[0],b[0]) || Math.max(a[1],b[1])+EPSILON<Math.min(c[1],d[1]) || Math.max(c[1],d[1])+EPSILON<Math.min(a[1],b[1])) return false;
  const abC=cross(a,b,c),abD=cross(a,b,d),cdA=cross(c,d,a),cdB=cross(c,d,b);
  if ((abC>0&&abD<0 || abC<0&&abD>0) && (cdA>0&&cdB<0 || cdA<0&&cdB>0)) return true;
  return pointEdgeDistance(a,c,d)<=EPSILON || pointEdgeDistance(b,c,d)<=EPSILON || pointEdgeDistance(c,a,b)<=EPSILON || pointEdgeDistance(d,a,b)<=EPSILON;
}
export function ringLocation(point: ProjectedPoint, ring: ProjectedPoint[]): 'inside'|'outside'|'boundary' {
  let inside=false;
  for(let i=0;i<ring.length-1;i++) {
    const a=ring[i],b=ring[i+1];
    if(pointEdgeDistance(point,a,b)<=EPSILON) return 'boundary';
    if((a[1]>point[1])!==(b[1]>point[1]) && point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
  }
  return inside?'inside':'outside';
}
export function polygonLocation(point: ProjectedPoint, polygon: ProjectedPolygon): 'inside'|'outside'|'boundary' {
  const shell=ringLocation(point,polygon[0]); if(shell!=='inside')return shell;
  for(const hole of polygon.slice(1)){const hit=ringLocation(point,hole);if(hit==='boundary')return hit;if(hit==='inside')return 'outside';}
  return 'inside';
}
const ringArea = (ring: ProjectedPoint[]) => Math.abs(ring.slice(0,-1).reduce((sum,a,i)=>sum+a[0]*ring[i+1][1]-ring[i+1][0]*a[1],0))/2;
function ringsIntersect(a: ProjectedPoint[],b: ProjectedPoint[]){for(let i=0;i<a.length-1;i++)for(let j=0;j<b.length-1;j++)if(edgesIntersect(a[i],a[i+1],b[j],b[j+1]))return true;return false;}
export function validatePolygon(polygon: ProjectedPolygon): string|null {
  if(!Array.isArray(polygon)||!polygon.length)return 'missing_polygon';
  for(const ring of polygon){
    if(!Array.isArray(ring)||ring.length<4||ring.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)))return 'invalid_ring';
    if(!equal(ring[0],ring.at(-1)!))return 'unclosed_ring';
    if(ringArea(ring)<=EPSILON)return 'zero_area';
    for(let i=0;i<ring.length-1;i++){
      if(equal(ring[i],ring[i+1]))return 'repeated_vertex';
      for(let j=i+1;j<ring.length-1;j++)if(j!==i+1 && !(i===0&&j===ring.length-2) && edgesIntersect(ring[i],ring[i+1],ring[j],ring[j+1]))return 'self_intersection';
    }
  }
  for(let i=1;i<polygon.length;i++){
    if(ringLocation(polygon[i][0],polygon[0])!=='inside'||ringsIntersect(polygon[0],polygon[i]))return 'invalid_hole';
    for(let j=1;j<i;j++)if(ringsIntersect(polygon[i],polygon[j])||ringLocation(polygon[i][0],polygon[j])==='inside'||ringLocation(polygon[j][0],polygon[i])==='inside')return 'overlapping_holes';
  }
  if(ringArea(polygon[0])-polygon.slice(1).reduce((n,r)=>n+ringArea(r),0)<=EPSILON)return 'zero_area';
  return null;
}
export function polygonBounds(polygons: ProjectedPolygon[]): Bounds {
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const polygon of polygons)for(const ring of polygon)for(const [x,y]of ring){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
  return[minX,minY,maxX,maxY];
}
export interface SpatialIndex { units: Map<string,SpatialUnit>; cells: Map<string,Set<string>>; cellSize: number }
export function buildSpatialIndex(units: SpatialUnit[], cellSize=100): SpatialIndex {
  if(!Number.isFinite(cellSize)||cellSize<=0)throw new Error('Invalid cell size');
  const index:SpatialIndex={units:new Map(),cells:new Map(),cellSize};
  for(const unit of units){
    if(index.units.has(unit.id))throw new Error('Duplicate segment identifier');
    index.units.set(unit.id,unit);const box=polygonBounds(unit.polygons);
    for(let x=Math.floor(box[0]/cellSize);x<=Math.floor(box[2]/cellSize);x++)for(let y=Math.floor(box[1]/cellSize);y<=Math.floor(box[3]/cellSize);y++){
      const key=`${x}:${y}`,set=index.cells.get(key)??new Set();set.add(unit.id);index.cells.set(key,set);
    }
  }
  return index;
}
export function spatialCandidates(bounds:Bounds,index:SpatialIndex):SpatialUnit[]{
  const ids=new Set<string>();for(let x=Math.floor(bounds[0]/index.cellSize);x<=Math.floor(bounds[2]/index.cellSize);x++)for(let y=Math.floor(bounds[1]/index.cellSize);y<=Math.floor(bounds[3]/index.cellSize);y++)for(const id of index.cells.get(`${x}:${y}`)??[])ids.add(id);
  return [...ids].sort().map(id=>index.units.get(id)!);
}
export function polygonDistance(point:ProjectedPoint,polygons:ProjectedPolygon[]){
  let minimum=Infinity;for(const polygon of polygons){if(polygonLocation(point,polygon)!=='outside')return 0;for(const ring of polygon)for(let i=0;i<ring.length-1;i++)minimum=Math.min(minimum,pointEdgeDistance(point,ring[i],ring[i+1]));}return minimum;
}
export interface SpatialAssociation {status:'matched'|'unmatched'|'ambiguous'|'district_mismatch';segmentId?:string;candidateIds:string[];method?:'containment'|'proximity';distanceM?:number}
export function associatePoint(point:ProjectedPoint,index:SpatialIndex,toleranceM:number,district?:string):SpatialAssociation {
  if(!point.every(Number.isFinite)||!Number.isFinite(toleranceM)||toleranceM<0||toleranceM>5)throw new Error('Invalid projected point or tolerance (0–5 m)');
  const candidates=spatialCandidates([point[0]-toleranceM,point[1]-toleranceM,point[0]+toleranceM,point[1]+toleranceM],index);
  const contained:SpatialUnit[]=[],boundary:SpatialUnit[]=[],near:{unit:SpatialUnit;distance:number}[]=[];
  for(const unit of candidates){const locations=unit.polygons.map(p=>polygonLocation(point,p));if(locations.includes('boundary'))boundary.push(unit);else if(locations.includes('inside'))contained.push(unit);else{const distance=polygonDistance(point,unit.polygons);if(distance<=toleranceM+EPSILON)near.push({unit,distance});}}
  // Any boundary or multiple potential sides remains unresolved, never nearest-road guessing.
  const hits=boundary.length?[...contained,...boundary]:contained.length?contained:near.map(n=>n.unit);
  const ids=hits.map(u=>u.id).sort();if(boundary.length||hits.length>1)return{status:'ambiguous',candidateIds:ids};
  if(!hits.length)return{status:'unmatched',candidateIds:[]};
  if(district&&district!==hits[0].district)return{status:'district_mismatch',candidateIds:ids};
  return{status:'matched',segmentId:hits[0].id,candidateIds:ids,method:contained.length?'containment':'proximity',distanceM:contained.length?0:near[0].distance};
}
/** Exact geometry duplicates independent of ring direction/start; preserves hole and side topology. */
export function canonicalGeometry(polygons:ProjectedPolygon[]) {
  const ringKey=(ring:ProjectedPoint[])=>{const body=ring.slice(0,-1).map(p=>`${p[0]},${p[1]}`);let smallest=0;for(let i=1;i<body.length;i++)if(body[i]<body[smallest])smallest=i;const rotate=(list:string[])=>[...list.slice(smallest),...list.slice(0,smallest)].join(';');const forward=rotate(body);const reversed=[...body].reverse();smallest=reversed.indexOf(body[smallest]);return[forward,rotate(reversed)].sort()[0];};
  return polygons.map(p=>`${ringKey(p[0])}|${p.slice(1).map(ringKey).sort().join('|')}`).sort().join('||');
}
export function polygonsOverlap(a:ProjectedPolygon[],b:ProjectedPolygon[]) {
  const x=polygonBounds(a),y=polygonBounds(b);if(x[2]<y[0]||y[2]<x[0]||x[3]<y[1]||y[3]<x[1])return false;
  for(const p of a)for(const q of b){if(p[0].some(v=>polygonLocation(v,q)==='inside')||q[0].some(v=>polygonLocation(v,p)==='inside'))return true;for(const r of p)for(const s of q)if(ringsIntersect(r,s))return true;}return false;
}
/** Every polygon edge must remain inside the same sidewalk; vertex-only containment misses holes. */
export function polygonsStrictlyContained(subject:ProjectedPolygon[],container:ProjectedPolygon[]){
  return subject.every(p=>container.some(q=>p.every(r=>r.every(v=>polygonLocation(v,q)==='inside'))&&!p.some(r=>q.some(s=>ringsIntersect(r,s)))&&!q.slice(1).some(hole=>polygonLocation(hole[0],p)==='inside')));
}
