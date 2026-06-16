import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const API_URL =
  'https://data.taipei/api/v1/dataset/52538305-ed23-490c-8f67-3efff2d777c3?scope=resourceAquire';
const RAW_OUTPUT_DIR = resolve('data/raw/drinking-fountains');
const PAGE_LIMIT = 1000;

type TaipeiOpenDataResponse = {
  result?: {
    limit?: number;
    offset?: number;
    count?: number;
    results?: Array<Record<string, unknown>>;
  };
};

async function fetchPage(offset: number) {
  const url = new URL(API_URL);
  url.searchParams.set('limit', String(PAGE_LIMIT));
  url.searchParams.set('offset', String(offset));

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to fetch drinking fountains: HTTP ${response.status}`);
  }

  return (await response.json()) as TaipeiOpenDataResponse;
}

function writeJson(path: string, data: unknown) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

mkdirSync(RAW_OUTPUT_DIR, { recursive: true });

const pages: Array<{
  filename: string;
  offset: number;
  limit: number;
  count: number;
  rows: number;
}> = [];

let offset = 0;
let totalCount = 0;

while (true) {
  const page = await fetchPage(offset);
  const result = page.result;
  const rows = result?.results ?? [];
  const limit = result?.limit ?? PAGE_LIMIT;
  totalCount = result?.count ?? totalCount;
  const filename = `page-${String(offset).padStart(5, '0')}.json`;

  writeJson(resolve(RAW_OUTPUT_DIR, filename), page);
  pages.push({ filename, offset, limit, count: totalCount, rows: rows.length });

  if (rows.length === 0 || offset + rows.length >= totalCount) {
    break;
  }

  offset += limit;
}

writeJson(resolve(RAW_OUTPUT_DIR, 'resource-index.json'), {
  fetchedAt: new Date().toISOString(),
  sourceUrl: API_URL,
  totalCount,
  pages,
});

console.log(`Fetched ${totalCount} drinking fountain records into ${RAW_OUTPUT_DIR}`);
