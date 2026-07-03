import { useState, useCallback } from 'react';

/**
 * Maps a sheet row (from Google Sheets) to a Person object
 */
function sheetRowToPerson(row) {
  return {
    name: row['Name'] || row['Tên'] || '',
    nickname: '',
    phone: row['Phones'] || row['Phone'] || '',
    email: row['Emails'] || row['Email'] || '',
    dob: parseDob(row['Ngày sinh'] || row['Birthday'] || ''),
    gender: '',
    facebook: row['Facebook'] || '',
    tiktok: row['Tiktok'] || row['TikTok'] || '',
    address: row['Address'] || row['Địa chỉ'] || '',
    notes: row['Quan hệ'] || row['Organization'] || row['Ghi chú'] || '',
    tags: buildTags(row),
    relationshipScore: Number(row['Relationship Score'] ?? row['Điểm thân thiết'] ?? 50),
    firstMetDate: '',
    interactions: [],
  };
}

/**
 * Maps a Person object back to a sheet row
 */
function personToSheetRow(person) {
  return {
    'Name': person.name || '',
    'Quan hệ': person.tags?.join(', ') || person.notes || '',
    'Phones': person.phone || '',
    'Ngày sinh': person.dob || '',
    'Emails': person.email || '',
    'Organization': '',
    'Facebook': person.facebook || '',
    'Tiktok': person.tiktok || '',
    'Address': person.address || '',
    'Relationship Score': person.relationshipScore ?? 50,
  };
}

function parseDob(val) {
  if (!val) return '';
  // Try dd/mm/yyyy
  const parts = val.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return val;
}

function buildTags(row) {
  const tags = [];
  const quanHe = row['Quan hệ'] || '';
  if (quanHe) tags.push(quanHe.trim());

  const org = row['Organization'] || '';
  if (org) tags.push(org.trim());

  return [...new Set(tags)]; // deduplicate
}

/**
 * Custom hook for syncing people data with a Google Sheet via Apps Script web app
 *
 * @param {Object} options
 * @param {string} options.apiUrl - The Apps Script web app URL
 * @param {Array} options.people - Current people array from AppContext
 * @param {Function} options.setPeople - Setter for people array
 * @param {Function} options.showToast - Toast notification function
 * @param {Function} options.t - Translation function
 * @param {string} options.lang - Current language
 */
export function useSheetSync({ apiUrl, people, setPeople, showToast, t, lang }) {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncError, setSyncError] = useState(null);

  /**
   * Import: Sheet → App
   * Fetches all rows from the Apps Script web app
   * Creates new people or updates existing ones by name
   */
  const syncFromSheet = useCallback(async () => {
    if (!apiUrl) {
      setSyncError(t?.('settings.sheetNoUrl', lang) || 'Chưa cấu hình URL');
      return { success: false, count: 0 };
    }
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch(apiUrl);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Lỗi từ server');

      const rows = json.data || [];
      const now = new Date().toISOString();
      const imported = [];

      setPeople(prev => {
        const updated = [...prev];
        for (const row of rows) {
          const rowName = (row['Name'] || '').trim();
          if (!rowName) continue;

          const person = sheetRowToPerson(row);
          const existingIdx = updated.findIndex(p => p.name.toLowerCase() === rowName.toLowerCase());

          if (existingIdx >= 0) {
            // Update existing — keep id, createdAt, interactions
            updated[existingIdx] = {
              ...updated[existingIdx],
              ...person,
              id: updated[existingIdx].id,
              createdAt: updated[existingIdx].createdAt,
              interactions: updated[existingIdx].interactions || [],
              updatedAt: now,
            };
          } else {
            // Add new
            updated.push({
              ...person,
              id: 'sheet_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5),
              createdAt: now,
              updatedAt: now,
            });
          }
          imported.push(person);
        }
        return updated;
      });

      setLastSync(new Date());
      setSyncing(false);
      showToast?.('Đã đồng bộ ' + imported.length + ' người từ Sheet');
      return { success: true, count: imported.length };
    } catch (e) {
      setSyncError(e.message);
      setSyncing(false);
      showToast?.('Lỗi đồng bộ: ' + e.message);
      return { success: false, count: 0, error: e.message };
    }
  }, [apiUrl, setPeople, showToast, t, lang]);

  /**
   * Export: App → Sheet
   * Sends all people data to the Apps Script web app
   */
  const syncToSheet = useCallback(async () => {
    if (!apiUrl) {
      setSyncError(t?.('settings.sheetNoUrl', lang) || 'Chưa cấu hình URL');
      return { success: false, count: 0 };
    }
    setSyncing(true);
    setSyncError(null);
    try {
      const payload = (people || []).map(personToSheetRow);
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: payload }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Lỗi từ server');

      setLastSync(new Date());
      setSyncing(false);
      showToast?.('Đã xuất ' + payload.length + ' người lên Sheet');
      return { success: true, count: payload.length, wrote: json.wrote, added: json.added };
    } catch (e) {
      setSyncError(e.message);
      setSyncing(false);
      showToast?.('Lỗi xuất: ' + e.message);
      return { success: false, count: 0, error: e.message };
    }
  }, [apiUrl, people, showToast, t, lang]);

  return {
    syncFromSheet,
    syncToSheet,
    syncing,
    lastSync,
    syncError,
    setSyncError,
  };
}

export default useSheetSync;
