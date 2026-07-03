/**
 * PROT SPHERE — Google Sheet Sync (Apps Script)
 * 
 * Hướng dẫn deploy:
 * 1. Mở sheet: https://docs.google.com/spreadsheets/d/123bKjeVZ_JEF2kWWic8-6PZjzmGQhzct1uPj_ZwRFhE
 * 2. Extensions → Apps Script
 * 3. Xoá code mặc định, paste toàn bộ file này vào
 * 4. Deploy → New deployment
 *    - Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy URL (dạng https://script.google.com/macros/s/.../exec)
 * 6. Dán URL vào Settings trong app hoặc biến môi trường VITE_SHEET_API_URL
 */

const SHEET_ID = '123bKjeVZ_JEF2kWWic8-6PZjzmGQhzct1uPj_ZwRFhE';
const SHEET_NAME = 'Mối quan hệ'; // Tên sheet (tab name)
// Nếu tab không phải "Mối quan hệ", đổi thành tên tab thật (VD: 'Sheet1')

/**
 * GET — Lấy toàn bộ dữ liệu từ sheet
 * https://script.google.com/macros/s/.../exec
 */
function doGet() {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME)
      || SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => h.trim());
    const rows = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = {};
      let hasValue = false;
      headers.forEach((h, j) => {
        const val = data[i][j];
        if (val !== undefined && val !== null && val !== '') {
          row[h] = typeof val === 'string' ? val.trim() : val;
          hasValue = true;
        } else {
          row[h] = '';
        }
      });
      if (hasValue) rows.push(row);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, data: rows, count: rows.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * POST — Ghi dữ liệu vào sheet
 * Body JSON: { data: [{ "Name": "...", "Relationship Score": 70, ... }] }
 */
function doPost(e) {
  try {
    const posted = JSON.parse(e.postData.contents);
    const updates = posted.data || [];
    if (!updates.length) throw new Error('No data provided');
    
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME)
      || SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => h.trim());
    
    // Map row data by Name (tên là key chính)
    const existingRows = {};
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) existingRows[String(data[i][0]).trim()] = i;
    }
    
    let wrote = 0;
    let added = 0;
    
    for (const update of updates) {
      const name = String(update['Name'] || '').trim();
      if (!name) continue;
      
      const rowIdx = existingRows[name];
      
      if (rowIdx !== undefined) {
        // Update existing row
        for (const key in update) {
          const colIdx = headers.indexOf(key);
          if (colIdx >= 0) {
            sheet.getRange(rowIdx + 1, colIdx + 1).setValue(update[key]);
          }
        }
        wrote++;
      } else {
        // Add new row
        const newRow = headers.map(h => update[h] !== undefined ? update[h] : '');
        sheet.appendRow(newRow);
        added++;
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, wrote, added }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * DELETE — Xoá người khỏi sheet (dựa theo Name)
 * Body JSON: { name: "Tên người cần xoá" }
 */
function doDelete() {
  // Apps Script web app không support DELETE mặc định, dùng POST với action: 'delete'
  return ContentService
    .createTextOutput(JSON.stringify({ success: false, error: 'Use POST with action=delete' }))
    .setMimeType(ContentService.MimeType.JSON);
}
