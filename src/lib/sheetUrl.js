const GOOGLE_SHEETS_HOST = 'docs.google.com';
const SPREADSHEET_ID_PATTERN = /\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/;
const PUBLISHED_ID_PATTERN = /\/spreadsheets\/d\/e\/([a-zA-Z0-9_-]{20,})/;
const GID_PATTERN = /[#&?]gid=(\d+)/;

function findGid(url) {
  return url.searchParams.get('gid') ?? url.hash.match(GID_PATTERN)?.[1] ?? null;
}

/**
 * Converts a Google Sheets share link into its CSV export URL.
 * Supports normal links (/d/{id}/edit#gid=…) and "Publish to web" links (/d/e/{id}/pub…).
 * @param {string} link
 * @returns {string | null} null when the link isn't a Google Sheets link
 */
export function toSheetCsvUrl(link) {
  let url;
  try {
    url = new URL(link.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.hostname !== GOOGLE_SHEETS_HOST) return null;

  const gid = findGid(url);
  const publishedId = url.pathname.match(PUBLISHED_ID_PATTERN)?.[1];
  if (publishedId) {
    const exportUrl = new URL(`https://${GOOGLE_SHEETS_HOST}/spreadsheets/d/e/${publishedId}/pub`);
    exportUrl.searchParams.set('output', 'csv');
    if (gid) exportUrl.searchParams.set('gid', gid);
    return exportUrl.toString();
  }

  const spreadsheetId = url.pathname.match(SPREADSHEET_ID_PATTERN)?.[1];
  if (!spreadsheetId) return null;

  const exportUrl = new URL(`https://${GOOGLE_SHEETS_HOST}/spreadsheets/d/${spreadsheetId}/export`);
  exportUrl.searchParams.set('format', 'csv');
  if (gid) exportUrl.searchParams.set('gid', gid);
  return exportUrl.toString();
}
