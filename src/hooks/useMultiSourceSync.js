import { useState, useCallback, useEffect, useRef } from 'react';

// ─── Sheet row-to-person mapping ───

export function sheetRowToPerson(row) {
  const phones = row['Phones'] ? row['Phones'].split('/').map(s => s.trim()) : [];
  const emails = row['Emails'] ? row['Emails'].split('/').map(s => s.trim()) : [];
  return {
    name: (row['Name'] || '').trim(),
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
  };
}

export function personToSheetRow(person) {
  return {
    Name: person.name || '',
    'Quan hệ': person.relationType || '',
    Phones: (person.phones || []).join('/'),
    'Ngày sinh': person.birthday || '',
    Emails: (person.emails || []).join('/'),
    Organization: person.organization || '',
    Facebook: person.socialLinks?.facebook || '',
    Tiktok: person.socialLinks?.tiktok || '',
    Address: person.address || '',
    'Relationship Score': person.score ?? 0,
  };
}

// ─── Tag converters ───

export function buildTagsFromRow(row) {
  const tags = [];
  const quanHe = row['Quan hệ'] || '';
  if (quanHe) tags.push(quanHe.trim());
  const org = row['Organization'] || '';
  if (org && !tags.includes(org.trim())) tags.push(org.trim());
  return tags;
}

export function mapStringTagsToObjects(stringTags, allTags) {
  if (!Array.isArray(stringTags) || !allTags?.length) return [];
  return stringTags.map(st => {
    st = st.trim().toLowerCase();
    const match = allTags.find(
      t =>
        t.nameVI?.toLowerCase() === st ||
        t.nameEN?.toLowerCase() === st ||
        t.id?.toLowerCase() === st
    );
    return match || { id: st.replace(/\s+/g, '_'), nameVI: st, nameEN: st, color: '#9CA3AF' };
  });
}

// ─── Sources persistence ───

const STORAGE_KEY = 'protsphere_sync_sources';

export function loadSources() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function persistSources(sources) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sources)); } catch {}
}

// ─── Hook ───

export function useMultiSourceSync({ people, setPeople, showToast, allTags }) {
  const [sources, setSourcesState] = useState(() => loadSources());
  const [syncingId, setSyncingId] = useState(null);
  const [lastSyncMap, setLastSyncMap] = useState({});
  const [errorMap, setErrorMap] = useState({});
  const sourceRef = useRef(sources);
  sourceRef.current = sources;

  // Persist sources on change
  useEffect(() => { persistSources(sources); }, [sources]);

  const setSources = useCallback((fn) => {
    setSourcesState(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn;
      persistSources(next);
      return next;
    });
  }, []);

  const addSource = useCallback((name, configUrl) => {
    setSources(prev => [...prev, {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      name,
      configUrl,
      createdAt: new Date().toISOString(),
    }]);
  }, [setSources]);

  const removeSource = useCallback((id) => {
    setSources(prev => prev.filter(s => s.id !== id));
  }, [setSources]);

  const updateSource = useCallback((id, updates) => {
    setSources(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, [setSources]);

  const syncFromSource = useCallback(async (id) => {
    const src = sourceRef.current.find(s => s.id === id);
    if (!src || !src.configUrl) return;
    setSyncingId(id);
    setErrorMap(prev => ({ ...prev, [id]: null }));
    try {
      const res = await fetch(src.configUrl);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Lỗi từ server');
      const rows = json.data || [];
      const now = new Date().toISOString();
      let count = 0;
      setPeople(prev => {
        const updated = [...prev];
        for (const row of rows) {
          const name = (row['Name'] || '').trim();
          if (!name) continue;
          const person = sheetRowToPerson(row);
          const idx = updated.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
          if (idx >= 0) {
            updated[idx] = {
              ...updated[idx],
              ...person,
              tags: mapStringTagsToObjects(person.tags, allTags),
              id: updated[idx].id,
              createdAt: updated[idx].createdAt,
              updatedAt: now,
            };
          } else {
            updated.push({
              ...person,
              tags: mapStringTagsToObjects(person.tags, allTags),
              id: 'sheet_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7),
              createdAt: now,
              updatedAt: now,
            });
          }
          count++;
        }
        return updated;
      });
      setLastSyncMap(prev => ({ ...prev, [id]: Date.now() }));
      showToast?.('Đã đồng bộ ' + count + ' người từ ' + src.name);
    } catch (e) {
      setErrorMap(prev => ({ ...prev, [id]: e.message }));
      showToast?.('Lỗi: ' + e.message);
    } finally {
      setSyncingId(null);
    }
  }, [setPeople, showToast, allTags]);

  const pushToSource = useCallback(async (id) => {
    const src = sourceRef.current.find(s => s.id === id);
    if (!src || !src.configUrl) return;
    setSyncingId(id);
    setErrorMap(prev => ({ ...prev, [id]: null }));
    try {
      const payload = (people || []).map(personToSheetRow);
      const res = await fetch(src.configUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: payload }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Lỗi từ server');
      setLastSyncMap(prev => ({ ...prev, [id]: Date.now() }));
      showToast?.('Đã xuất ' + payload.length + ' người lên ' + src.name);
    } catch (e) {
      setErrorMap(prev => ({ ...prev, [id]: e.message }));
      showToast?.('Lỗi: ' + e.message);
    } finally {
      setSyncingId(null);
    }
  }, [people, showToast]);

  return {
    sources,
    syncingId,
    lastSyncMap,
    errorMap,
    addSource,
    removeSource,
    updateSource,
    syncFromSource,
    pushToSource,
  };
}
