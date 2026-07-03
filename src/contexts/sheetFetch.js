/**
 * Sheet fetch — user must configure source URL in Settings.
 * No built-in sheet URL. All data is local + Firestore.
 */

const STORAGE_KEY = 'protsphere_sync_sources';

/**
 * Parse CSV text into array of objects (first row = headers).
 */
export function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = [];
    let current = '', inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === ',' && !inQuote) { vals.push(current); current = ''; continue; }
      current += ch;
    }
    vals.push(current);
    const row = {};
    headers.forEach((h, i) => { row[h] = (vals[i] || '').replace(/^"|"$/g, '').trim(); });
    return row;
  });
}

/**
 * Convert a parsed CSV row to a person object for AppContext state.
 */
export function sheetRowToPerson(row) {
  const name = (row['Name'] || '').trim();
  if (!name) return null;
  const phones = row['Phones'] ? row['Phones'].split('/').map(s => s.trim()) : [];
  const emails = row['Emails'] ? row['Emails'].split('/').map(s => s.trim()) : [];
  return {
    id: 'sheet_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
    name,
    relationType: (row['Quan hệ'] || '').trim(),
    tags: [],
    phones,
    emails,
    birthday: (row['Ngày sinh'] || '').trim(),
    organization: (row['Organization'] || '').trim(),
    socialLinks: {
      facebook: (row['Facebook'] || '').trim(),
      tiktok: (row['Tiktok'] || '').trim(),
    },
    address: (row['Address'] || '').trim(),
    score: parseInt(row['Relationship Score'], 10) || 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Load saved sources from localStorage.
 */
export function loadSources() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

/**
 * Persist sources to localStorage.
 */
export function persistSources(sources) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sources)); } catch {}
}
