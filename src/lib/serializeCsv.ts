// Normalize only for detection, not for output; preserve original source text.
const spreadsheetPrefix = /^[\s\p{Cc}\p{Cf}]*[=+@-]|^\s*[\t\r\n]/u;

export function csvCellText(value: unknown): string {
  let text = String(value ?? '');
  // Typed finite numbers are data, not untrusted spreadsheet expressions.
  if (!(typeof value === 'number' && Number.isFinite(value)) &&
      spreadsheetPrefix.test(text.normalize('NFKC'))) {
    text = `'${text}`;
  }
  return text;
}

/** UTF-8 BOM and CRLF for spreadsheet compatibility, with text-cell formula protection. */
export function serializeCsv(rows: readonly (readonly unknown[])[]): string {
  return '\uFEFF' + rows.map(row => row.map(value => `"${csvCellText(value).replace(/"/g, '""')}"`).join(',')).join('\r\n');
}
