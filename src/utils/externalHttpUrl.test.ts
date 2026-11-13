import { describe, expect, it } from 'vitest';
import { externalHttpUrl } from './externalHttpUrl';

describe('external facility URL validation', () => {
  it.each(['https://example.test/水質?station=1#latest', 'http://example.test/photo.png', 'HTTPS://example.test/path'])(
    'preserves valid web URL %s', (url) => expect(externalHttpUrl(url)).toBe(url),
  );

  it.each([undefined, 42, '', 'no link', '/relative/photo.png', '//example.test/photo.png',
    'mailto:station@example.test', 'https://', 'https:///example.test', 'https://exa mple.test',
    'https://example.test/a\tb', 'https://example.test/a\\b', 'https://user@example.test/photo.png'])(
    'rejects non-web or ambiguous value %s', (url) => expect(externalHttpUrl(url)).toBeUndefined(),
  );
});
