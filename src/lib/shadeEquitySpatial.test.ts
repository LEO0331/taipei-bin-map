import { describe, expect, it } from 'vitest';
import { associatePoint, buildSpatialIndex, validatePolygon, canonicalGeometry, polygonsStrictlyContained, type ProjectedPolygon } from './shadeEquitySpatial';

const box = (x: number, y: number, size = 10): ProjectedPolygon => [[[x,y],[x+size,y],[x+size,y+size],[x,y+size],[x,y]]];
const unit = (id: string, x = 0) => ({ id, polygons: [box(x,0)], district: '中正區' });
describe('projected sidewalk association', () => {
  it('assigns a point strictly inside a single sidewalk', () => expect(associatePoint([5,5], buildSpatialIndex([unit('a')]), 2).segmentId).toBe('a'));
  it('assigns a unique near-sidewalk point within the documented tolerance', () => expect(associatePoint([11,5], buildSpatialIndex([unit('a')]), 2).method).toBe('proximity'));
  it('leaves points outside tolerance unmatched', () => expect(associatePoint([13,5], buildSpatialIndex([unit('a')]), 2).status).toBe('unmatched'));
  it('does not assign a point in a polygon hole', () => {
    const polygon = [...box(0,0,20), ...box(5,5,10)];
    expect(associatePoint([10,10], buildSpatialIndex([{id:'a',district:'中正區',polygons:[polygon]}]), 2).status).toBe('unmatched');
  });
  it('retains ambiguity when overlapping sidewalks contain the same tree', () => expect(associatePoint([7,5], buildSpatialIndex([unit('a'),unit('b',5)]), 2).status).toBe('ambiguous'));
  it('does not guess the side of a road from equal near matches', () => expect(associatePoint([11,5], buildSpatialIndex([unit('a'),unit('b',12)]), 2).status).toBe('ambiguous'));
  it('leaves a polygon boundary observation ambiguous', () => expect(associatePoint([0,5], buildSpatialIndex([unit('a')]), 2).status).toBe('ambiguous'));
  it('does not assign a tree across a source district disagreement', () => expect(associatePoint([5,5], buildSpatialIndex([unit('a')]), 2, '大安區').status).toBe('district_mismatch'));
  it('rejects zero-area polygons', () => expect(validatePolygon([[[0,0],[1,0],[2,0],[0,0]]])).toBe('zero_area'));
  it('rejects self-crossing polygons', () => expect(validatePolygon([[[0,0],[10,10],[0,10],[10,0],[0,0]]])).not.toBeNull());
  it('rejects holes outside their shell', () => expect(validatePolygon([...box(0,0),...box(20,20)])).toBe('invalid_hole'));
  it('rejects unclosed rings instead of silently repairing source geometry', () => expect(validatePolygon([[[0,0],[10,0],[10,10],[0,10]]])).toBe('unclosed_ring'));
  it('recognizes reversed ring direction as identical geometry',()=>expect(canonicalGeometry([box(0,0)])).toBe(canonicalGeometry([box(0,0).map(ring=>[...ring].reverse())])));
  it('preserves opposite sidewalk sides as separate geometry identities',()=>expect(canonicalGeometry([box(0,0)])).not.toBe(canonicalGeometry([box(12,0)])));
  it('does not associate a pit edge passing across a sidewalk hole',()=>{
    const sidewalk=[...box(0,0,30),...box(10,10,10)];
    const crossing:ProjectedPolygon=[[[5,12],[25,12],[25,18],[5,18],[5,12]]];
    expect(polygonsStrictlyContained([crossing],[sidewalk])).toBe(false);
  });
  it('accepts an entire pit polygon strictly contained inside a sidewalk',()=>expect(polygonsStrictlyContained([box(2,2,2)],[box(0,0)])).toBe(true));
  it('rejects a pit polygon enclosing a sidewalk hole without touching its edges',()=>expect(polygonsStrictlyContained([box(2,2,6)],[[...box(0,0),...box(4,4,2)]])).toBe(false));
  it('rejects tolerance outside the frozen supported range',()=>expect(()=>associatePoint([5,5],buildSpatialIndex([unit('a')]),6)).toThrow());
  it('rejects duplicate segment IDs before constructing additive associations',()=>expect(()=>buildSpatialIndex([unit('a'),unit('a',12)])).toThrow(/Duplicate/));
});
