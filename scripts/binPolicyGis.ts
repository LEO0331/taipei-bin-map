import { inflateRawSync } from 'node:zlib';
import iconv from 'iconv-lite';
import { convertTwd97ToWgs84 } from './convertGasLpgStations';
import { validPoint } from '../src/lib/binPolicyDecision';

// Narrow ZIP reader for the audited official SHP snapshots. No filesystem extraction.
export function unzip(buffer: Buffer) {
  let end = buffer.length - 22;
  for (; end >= Math.max(0, buffer.length - 65557); end--) if (buffer.readUInt32LE(end) === 0x06054b50) break;
  if (end < Math.max(0, buffer.length - 65557)) throw new Error('Invalid ZIP directory');
  let offset = buffer.readUInt32LE(end + 16);
  const files: Record<string, Buffer> = {};
  for (let i = 0; i < buffer.readUInt16LE(end + 10); i++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error('Invalid ZIP entry');
    const method = buffer.readUInt16LE(offset + 10), size = buffer.readUInt32LE(offset + 20), unpacked = buffer.readUInt32LE(offset + 24);
    const length = buffer.readUInt16LE(offset + 28), extra = buffer.readUInt16LE(offset + 30), comment = buffer.readUInt16LE(offset + 32), local = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + length);
    if (unpacked > 20_000_000) throw new Error('Oversize GIS entry');
    const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    const compressed = buffer.subarray(start, start + size);
    if (!name.endsWith('/')) {
      if (![0, 8].includes(method)) throw new Error('Unsupported ZIP method');
      const data = method === 8 ? inflateRawSync(compressed, { maxOutputLength: 20_000_000 }) : compressed;
      if (data.length !== unpacked) throw new Error('Truncated ZIP entry');
      files[name.split('/').pop()!.toLowerCase()] = data;
    }
    offset += 46 + length + extra + comment;
  }
  return files;
}
export function archiveFileTimestamps(buffer: Buffer) {
  let offset=buffer.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));
  const result: Record<string,string>={};
  while(offset>=0&&offset+46<=buffer.length&&buffer.readUInt32LE(offset)===0x02014b50) {
    const time=buffer.readUInt16LE(offset+12),date=buffer.readUInt16LE(offset+14),length=buffer.readUInt16LE(offset+28);
    const name=buffer.toString('utf8',offset+46,offset+46+length);
    const parts=[1980+(date>>9),(date>>5)&15,date&31,time>>11,(time>>5)&63,(time&31)*2];
    if(!name.endsWith('/'))result[name]=`${parts[0]}-${String(parts[1]).padStart(2,'0')}-${String(parts[2]).padStart(2,'0')}T${String(parts[3]).padStart(2,'0')}:${String(parts[4]).padStart(2,'0')}:${String(parts[5]).padStart(2,'0')} (archive local time; timezone unknown)`;
    offset+=46+length+buffer.readUInt16LE(offset+30)+buffer.readUInt16LE(offset+32);
  }
  return result;
}
export function parseDbf(buffer: Buffer, encoding: string) {
  const count = buffer.readUInt32LE(4), header = buffer.readUInt16LE(8), size = buffer.readUInt16LE(10);
  if (header + count * size > buffer.length) throw new Error('Truncated DBF');
  const fields: Array<{ name: string; length: number }> = [];
  for (let offset = 32; offset < header - 1; offset += 32) fields.push({ name: buffer.toString('ascii', offset, offset + 11).replace(/\0/g, ''), length: buffer[offset + 16] });
  return Array.from({ length: count }, (_, index) => {
    let offset = header + index * size + 1;
    const row: Record<string, string> = {};
    for (const field of fields) { row[field.name] = iconv.decode(buffer.subarray(offset, offset + field.length), encoding).trim(); offset += field.length; }
    return { row, deleted: buffer[header + index * size] === 42 };
  });
}
export function normalizeXY(x: number, y: number) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('Invalid coordinate');
  if (x >= 121.3 && x <= 121.8 && y >= 24.85 && y <= 25.3) return { longitude: x, latitude: y, transformation: 'already-geographic-TWD97/WGS84-compatible' };
  if (x >= 250000 && x <= 340000 && y >= 2700000 && y <= 2820000) {
    const point = convertTwd97ToWgs84(x, y);
    if (validPoint(point)) return { ...point, transformation: 'TWD97-TM2-zone121-to-WGS84' };
  }
  throw new Error('Coordinate outside accepted Taipei bounds or CRS');
}
export function parseShp(buffer: Buffer) {
  if (buffer.length < 100 || buffer.readInt32BE(0) !== 9994 || buffer.readInt32BE(24) * 2 !== buffer.length) throw new Error('Invalid or truncated SHP');
  const result: Array<{ type: number; rings: number[][][]; xy: number[] | null }> = [];
  for (let offset = 100; offset < buffer.length;) {
    const length = buffer.readInt32BE(offset + 4) * 2, start = offset + 8;
    if (length < 4 || start + length > buffer.length) throw new Error('Truncated SHP record');
    const type = buffer.readInt32LE(start);
    if (type === 1) result.push({ type, xy: [buffer.readDoubleLE(start + 4), buffer.readDoubleLE(start + 12)], rings: [] });
    else if (type === 5) {
      const parts = buffer.readInt32LE(start + 36), points = buffer.readInt32LE(start + 40);
      if (44 + parts * 4 + points * 16 > length) throw new Error('Truncated polygon');
      const indices = Array.from({ length: parts }, (_, i) => buffer.readInt32LE(start + 44 + i * 4));
      indices.push(points);
      const rings = indices.slice(0, -1).map((p, i) => Array.from({ length: indices[i + 1] - p }, (_, j) => {
        const at = start + 44 + parts * 4 + (p + j) * 16; const point = normalizeXY(buffer.readDoubleLE(at), buffer.readDoubleLE(at + 8));
        return [point.longitude, point.latitude];
      }));
      result.push({ type, xy: null, rings });
    } else if (type === 0) result.push({ type, xy: null, rings: [] });
    else throw new Error(`Unsupported SHP shape ${type}`);
    offset = start + length;
  }
  return result;
}
export function inPolygon(x: number, y: number, rings: number[][][]) {
  let inside = false;
  for (const ring of rings) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (((yi > y) !== (yj > y)) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
