import { afterEach, describe, expect, it } from 'vitest';
import { readFile, mkdtemp, rm, writeFile, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import iconv from 'iconv-lite';
import { monitorSources } from './monitorBinPolicySources';
import { alertKey, countAnomaly, hash, validateApproval, type Snapshot, type SourceApproval } from './binPolicyGovernance';
import { policySources } from './binPolicySources';
import { preparePublication } from './prepareBinPolicyPublication';
import { buildPolicySnapshot, writePolicySnapshot } from './convertBinPolicySources';
import { buildDataHealth } from './buildBinPolicyHealth';
import { parsePortalMetadata } from './binPolicyPortalMetadata';

const snapshot = JSON.parse(await readFile('public/data/bin-policy/analysis.json', 'utf8')) as Snapshot;
const rawDirectory = `data/raw/bin-policy/${snapshot.snapshotId}`;
const now = '2026-10-15T12:00:00.000Z';
const originalDates = policySources.map(source=>source.resourceUpdatedAt);
const temporary: string[] = [];
afterEach(async()=>{policySources.forEach((source,index)=>{source.resourceUpdatedAt=originalDates[index];});await Promise.all(temporary.splice(0).map(path=>rm(path,{recursive:true,force:true})));});
async function directory() { const dir=await mkdtemp(join(tmpdir(),'policy-governance-test-'));temporary.push(dir);return dir; }
function approval(): SourceApproval {
  return { schemaVersion:1,reviewed_by:'test-only-reviewer',reviewed_at:now,review_url:'https://github.com/LEO0331/taipei-bin-map/pull/11',metadata_reviewed:true,schema_reviewed:true,spatial_reviewed:true,completeness_reviewed:true,decision_impact_reviewed:true,previous_snapshot_id:snapshot.snapshotId,approved_snapshot_id:snapshot.snapshotId,sources:snapshot.sources.map(source=>({source_id:source.id,resource_id:String(source.resourceId),sha256:source.sha256,source_updated_at:source.resourceUpdatedAt as string})) };
}
function fetcher(transform?: (id: string, bytes: Buffer)=>Buffer): typeof fetch {
  return (async(input)=>{
    const source=policySources.find(source=>String(input)===source.downloadUrl)!;
    const prior=snapshot.sources.find(item=>item.id===source.id)!;
    const bytes=await readFile(join(rawDirectory,source.filename));
    const headers: Record<string,string>={};if(prior.httpLastModified)headers['last-modified']=String(prior.httpLastModified);
    return new Response(new Uint8Array(transform?.(source.id,bytes)??bytes),{status:200,headers});
  }) as typeof fetch;
}
function portalHtml(datasetId: string, resourceId: string, sourceDate: string, metadataDate: string) {
  return `<script id="__NUXT_DATA__" type="application/json">${JSON.stringify([{pid:1,resources:2,metadata_changed:8},datasetId,[3],{rid:4,last_modified:5,url:6,encoding:7},resourceId,sourceDate,'/download','Big5',metadataDate])}</script>`;
}
function metadataFetcher(changedDate?: string): typeof fetch {
  return (async(input)=>{const source=policySources.find(source=>source.datasetUrl===String(input))!;return new Response(portalHtml(source.datasetId,source.resourceId,changedDate??source.resourceUpdatedAt,source.metadataUpdatedAt));}) as typeof fetch;
}
describe('read-only policy source monitoring',()=>{
  it('keeps identical hashes unchanged without inventing a publication date',async()=>{
    const report=await monitorSources(snapshot,{fetcher:fetcher(),metadataFetcher:metadataFetcher(),now});
    expect(report.state).toBe('unchanged');expect(report.sources[0].source_updated_at).toBe(snapshot.sources[0].resourceUpdatedAt);
  });
  it('detects changed source bytes while preserving the published snapshot',async()=>{
    const before=await readFile('public/data/bin-policy/analysis.json');
    const report=await monitorSources(snapshot,{fetcher:fetcher((id,bytes)=>id==='bins'?Buffer.concat([bytes,Buffer.from('\r\n')]):bytes),now});
    expect(report.state).toBe('change_detected');expect(await readFile('public/data/bin-policy/analysis.json')).toEqual(before);
  });
  it('reports HTTP failure without claiming source validation succeeded',async()=>{
    const report=await monitorSources(snapshot,{fetcher:(async()=>new Response('unavailable',{status:503})) as typeof fetch,now});
    expect(report.sources[0].anomalies).toContain('http_failure');
  });
  it('passes abort timeouts to requests and reports their cancellation',async()=>{
    const report=await monitorSources(snapshot,{fetcher:(async(_input,init)=>new Promise((_resolve,reject)=>{init?.signal?.addEventListener('abort',()=>reject(new DOMException('timeout','TimeoutError')),{once:true});})) as typeof fetch,timeoutMs:2,now});
    expect(report.sources[0].anomalies).toContain('timeout');
  });
  it('rejects unexpected source schemas',async()=>{
    const report=await monitorSources(snapshot,{fetcher:fetcher((id,bytes)=>id==='bins'?Buffer.from('unexpected,header\n'+('a,b\n'.repeat(100))):bytes),now});
    expect(report.state).toBe('failure');
  });
  it('rejects truncated archive contents',async()=>{
    const report=await monitorSources(snapshot,{fetcher:fetcher((id,bytes)=>id==='bus'?bytes.subarray(0,200):bytes),now});
    expect(report.sources[1].anomalies).toContain('schema_spatial_or_completeness_validation_failed');
  });
  it('flags unexpectedly low raw row counts even when enough valid rows remain',async()=>{
    const report=await monitorSources(snapshot,{fetcher:fetcher((id,bytes)=>id==='bins'?iconv.encode(iconv.decode(bytes,'cp950').split(/\r?\n/).slice(0,151).join('\r\n'),'cp950'):bytes),now});
    expect(report.sources[0].anomalies).toContain('unexpected_record_count');
  });
  it('records missing source timestamps as unknown rather than retrieval time',async()=>{
    policySources[0].resourceUpdatedAt='';
    const report=await monitorSources(snapshot,{fetcher:fetcher(),now});
    expect(report.sources[0].source_updated_at).toBeNull();expect(report.sources[0].anomalies).toContain('missing_source_timestamp');
  });
  it('deduplicates repeated failures independently of execution time',async()=>{
    const first=await monitorSources(snapshot,{fetcher:(async()=>new Response('',{status:503})) as typeof fetch,now});
    const second={...first,sources:first.sources.map(source=>({...source,checked_at:'2026-10-22T12:00:00Z'}))};
    expect(alertKey(second.sources)).toBe(first.alert_key);
  });
  it('detects count anomaly boundaries consistently',()=>{expect(countAnomaly(100,80)).toBe(false);expect(countAnomaly(100,79)).toBe(true);});
  it('separates provider metadata-only changes from unchanged content',async()=>{
    const report=await monitorSources(snapshot,{fetcher:fetcher(),metadataFetcher:metadataFetcher('2026-10-16T10:00:00+08:00'),now});
    expect(report.state).toBe('change_detected');expect(report.sources[0].content_changed).toBe(false);expect(report.sources[0].metadata_changes).toContain('provider_source_timestamp_changed');
  });
  it('reports unavailable portal metadata without inventing a verification timestamp',async()=>{
    const report=await monitorSources(snapshot,{fetcher:fetcher(),metadataFetcher:(async()=>new Response('unsupported markup')) as typeof fetch,now});
    expect(report.sources[0].metadata_status).toBe('unavailable');expect(report.sources[0].source_updated_at).toBeNull();
  });
  it('detects missing resource identity from the official resource list',()=>{
    expect(parsePortalMetadata(portalHtml('dataset','different-resource','2026-10-15 12:00:00','2026-10-15 12:00:00'),'dataset','expected-resource').resource_present).toBe(false);
  });
});
describe('review-controlled publication',()=>{
  it('requires declared metadata review in addition to exact approved hashes',()=>{
    const input=approval();input.metadata_reviewed=false;expect(()=>validateApproval(input,snapshot,snapshot)).toThrow(/review required/);
  });
  it('rejects approved source IDs whose content hash does not match',()=>{
    const input=approval();input.sources[0].sha256='0'.repeat(64);expect(()=>validateApproval(input,snapshot,snapshot)).toThrow(/Unapproved source/);
  });
  it('prepares a validated review bundle without changing production files',async()=>{
    const before=hash(await readFile('public/data/bin-policy/analysis.json'));
    const output=join(await directory(),'review');
    const result=await preparePublication(approval(),output,{rawDirectory});
    expect(result.before).toEqual(result.after);expect(hash(await readFile('public/data/bin-policy/analysis.json'))).toBe(before);expect(existsSync(join(output,'analysis.json'))).toBe(true);
  });
  it('leaves previous production intact when review approval is invalid',async()=>{
    const before=hash(await readFile('public/data/bin-policy/analysis.json'));
    const output=join(await directory(),'invalid');const input=approval();input.spatial_reviewed=false;
    await expect(preparePublication(input,output,{rawDirectory})).rejects.toThrow();expect(existsSync(output)).toBe(false);expect(hash(await readFile('public/data/bin-policy/analysis.json'))).toBe(before);
  });
  it('does not allow a review bundle to target production data',async()=>{
    await expect(preparePublication(approval(),'public/data/bin-policy',{rawDirectory})).rejects.toThrow(/outside production/);
  });
  it('rejects unapproved new revisions through the legacy converter',async()=>{
    const raw=join(await directory(),'raw');await cp(rawDirectory,raw,{recursive:true});
    const manifest=JSON.parse(await readFile(join(raw,'sources.json'),'utf8'));const bytes=Buffer.concat([await readFile(join(raw,'bins-current.csv')),Buffer.from('\r\n')]);await writeFile(join(raw,'bins-current.csv'),bytes);manifest[0].sha256=hash(bytes);await writeFile(join(raw,'sources.json'),JSON.stringify(manifest));
    const before=hash(await readFile('public/data/bin-policy/analysis.json'));expect(()=>writePolicySnapshot(raw)).toThrow(/approved publication/);expect(hash(await readFile('public/data/bin-policy/analysis.json'))).toBe(before);
  });
  it('blocks severe row loss even when the proposed hash has a review declaration',async()=>{
    const root=await directory();const raw=join(root,'raw');await cp(rawDirectory,raw,{recursive:true});
    const manifest=JSON.parse(await readFile(join(raw,'sources.json'),'utf8'));const bytes=iconv.encode(iconv.decode(await readFile(join(raw,'bins-current.csv')),'cp950').split(/\r?\n/).slice(0,151).join('\r\n'),'cp950');await writeFile(join(raw,'bins-current.csv'),bytes);manifest[0].sha256=hash(bytes);await writeFile(join(raw,'sources.json'),JSON.stringify(manifest));
    const proposed=buildPolicySnapshot(raw);const input=approval();input.approved_snapshot_id=proposed.snapshotId;input.sources[0].sha256=manifest[0].sha256;
    await expect(preparePublication(input,join(root,'review'),{rawDirectory:raw})).rejects.toThrow(/Unexpected count change/);
  });
  it('reproduces the currently approved snapshot into a non-production audit output',async()=>{
    const output=join(await directory(),'reproduction.json');expect(writePolicySnapshot(rawDirectory,output).snapshotId).toBe(snapshot.snapshotId);
  });
});
describe('data-health timestamp semantics',()=>{
  it('advances retrieval evidence for identical bytes without rewriting the publication date',async()=>{
    const report=await monitorSources(snapshot,{fetcher:fetcher(),now});
    const health=buildDataHealth(snapshot,now,report);
    expect(health.sources[0].retrieved_at).toBe(now);
    expect(health.sources[0].source_updated_at).toBe(snapshot.sources[0].resourceUpdatedAt);
  });
  it('keeps publication and last-check dates unknown when no event record exists',()=>{
    const health=buildDataHealth(snapshot,now);expect(health.published_at).toBeNull();expect(health.last_checked_at).toBeNull();expect(health.sources[0].validated_at).toBe(now);
  });
  it('flags old source dates without relabeling them as retrieval dates',()=>{
    const health=buildDataHealth(snapshot,now);const bus=health.sources.find(source=>source.source_id==='bus')!;expect(bus.stale).toBe(true);expect(bus.source_updated_at).not.toBe(bus.retrieved_at);
  });
});
