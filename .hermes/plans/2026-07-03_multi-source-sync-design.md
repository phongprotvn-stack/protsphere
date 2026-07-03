# Multi-Source Sync Architecture + Mobile DB Fix Research

> Date: 2026-07-03
> Project: PROT SPHERE

## 1️⃣ Vấn đề Mobile không hiển thị DB mới nhất

### Nguyên nhân gốc rễ

**App hiện dùng `getDocs()` (one‑time read) thay vì `onSnapshot()` (real‑time listener).**

File `src/firebase/firebase.js`:
- `loadFromFirestore()` dùng `getDocs()` — chỉ đọc 1 lần khi login
- Không có real‑time listener → khi data thay đổi từ nguồn khác (Sheet import, thiết bị khác), app không biết

**Luồng dữ liệu hiện tại:**
```
Sheet Import → setPeople → localStorage ✅ (ngay lập tức)
                            → Firestore (3s debounce) ✅
                            → Các thiết bị khác? ❌ (chỉ update khi refresh + login lại)
```

### Cách fix

Chuyển từ `getDocs()` sang `onSnapshot()` trong `firebase.js`:

```js
// Thêm listener real-time
export function subscribeToFirestore(userId, callback) {
  const { onSnapshot, collection: collRef } = await import('firebase/firestore');
  const unsubscribes = [];
  for (const coll of COLLECTIONS) {
    const unsub = onSnapshot(collRef(db, `users/${userId}/${coll}`), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(coll, data);
    });
    unsubscribes.push(unsub);
  }
  return () => unsubscribes.forEach(u => u());
}
```

## 2️⃣ Thiết kế đồng bộ đa nguồn dữ liệu

### Kiến trúc: Source Adapter Pattern

```
┌──────────────────────────────────────────────────────┐
│                  SyncManager                          │
│                                                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────┐ │
│  │ Sheet #1 │  │ Sheet #2 │  │ Airtable │  │ CSV  │ │
│  │AppScript │  │AppScript │  │ REST API │  │ File │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──┬───┘ │
│       │              │             │            │      │
│       ▼              ▼             ▼            ▼      │
│  ┌──────────────────────────────────────────────┐     │
│  │          Data Normalizer                      │     │
│  │  - Map field names per source                 │     │
│  │  - Dedup by name/email/phone                  │     │
│  │  - Merge fields (last-write-wins)             │     │
│  │  - Conflict detection                         │     │
│  └──────────────────┬───────────────────────────┘     │
│                     ▼                                   │
│  ┌──────────────────────────────────────────────┐     │
│  │      App State (setPeople, setEvents, etc.)   │     │
│  └──────────────────┬───────────────────────────┘     │
│                     │                                   │
└─────────────────────┼───────────────────────────────────┘
                      │
                      ▼
  ┌─────────────────────────────────────┐
  │  localStorage (always)              │
  │  + Firestore (real-time onSnapshot) │
  └─────────────────────────────────────┘
```

### Các nguồn dữ liệu free có thể tích hợp

| Nguồn | Free Tier | API | Cách tích hợp |
|-------|-----------|-----|--------------|
| **Google Sheet** ✅ | Không giới hạn | Apps Script Web App | Đã có `useSheetSync` |
| **Google Sheet #2** | Không giới hạn | Apps Script Web App | Nhân bản `useSheetSync` với URL khác |
| **Airtable** | 1200 records/base | REST API (no auth cho read) | `fetch('https://api.airtable.com/v0/...')` |
| **SheetDB.io** | 100 req/ngày | REST API | Biến sheet thành API, không cần Apps Script |
| **CSV Import** | Không giới hạn | File upload | Đã có `importData` (cần cải tiến) |
| **Supabase** | 500MB DB | REST + Realtime API | Thay thế/hỗ trợ Firebase |

### Source Interface (mẫu)

```js
// Mỗi nguồn implement interface này
class DataSource {
  id: string;           // 'sheet_1', 'airtable_contacts'
  name: string;         // 'Google Sheet - Mối quan hệ'
  type: string;         // 'google_sheet' | 'airtable' | 'csv'
  config: { url: string };

  // Đọc dữ liệu từ nguồn
  async fetchPeople(): Promise<RawPerson[]>
  
  // Ghi dữ liệu lên nguồn
  async pushPeople(people: Person[]): Promise<{ wrote: number }>
  
  // Map row format → Person object
  mapToPerson(row: RawRow): Partial<Person>
  
  // Map Person object → row format
  mapFromPerson(person: Person): RawRow
}
```

### File thay đổi

| File | Thay đổi |
|------|----------|
| `src/lib/sources/DataSource.js` | Base class cho các nguồn (MỚI) |
| `src/lib/sources/GoogleSheetSource.js` | Source cho Google Sheet (MỚI) |
| `src/lib/sources/AirtableSource.js` | Source cho Airtable (MỚI) |
| `src/hooks/useSourceSync.js` | Hook tổng quát thay thế `useSheetSync` |
| `src/contexts/AppContext.jsx` | Thêm `onSnapshot` listener real-time |
| `src/firebase/firebase.js` | Thêm `subscribeToFirestore()` |
| `src/screens/Settings.jsx` | UI quản lý nhiều nguồn |
| `src/i18n/vi.json` + `en.json` | Key mới cho multi-source |

### Lộ trình triển khai

**Phase 1 (ngay):** Fix real-time Firestore listener — thêm `onSnapshot` để data cập nhật tức thì trên mọi thiết bị

**Phase 2 (tiếp theo):** Refactor `useSheetSync` → `useSourceSync` với Source Adapter Pattern, cho phép thêm nhiều URL Google Sheet

**Phase 3:** Thêm nguồn Airtable / CSV / SheetDB.io

**Phase 4:** Auto-sync (cron job mỗi N phút kiểm tra thay đổi)
