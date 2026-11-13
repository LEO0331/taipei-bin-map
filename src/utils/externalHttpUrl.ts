/** Keep a source's absolute web URL as written, but never treat arbitrary text as a link. */
export function externalHttpUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (!/^https?:\/\/[^/?#]/i.test(text) || /[\u0000-\u0020\u007f\\]/.test(text)) return undefined;

  try {
    const url = new URL(text);
    if ((url.protocol === 'https:' || url.protocol === 'http:') && url.hostname && !url.username && !url.password) return text;
  } catch {
    // The source may contain a placeholder or an invalid URL.
  }
  return undefined;
}
