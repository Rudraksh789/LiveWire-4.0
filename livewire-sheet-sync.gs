/**
 * LiveWire 4.0 — Two-way Firestore <-> Google Sheets sync
 * ---------------------------------------------------------
 * doPost()      -> called by admin27.js whenever Firestore changes. Overwrites
 *                  the visible sheet + updates the hidden cache tab.
 * reconcile()   -> runs on a time-driven trigger you set up yourself (see setup
 *                  notes below). Compares the sheet against the hidden cache to
 *                  find rows you edited, deleted, or added, and applies those
 *                  changes to Firestore.
 *
 * IMPORTANT: test all of this with a few fake/dummy rows before trusting it
 * with real registrations. Two-way sync with real student data is unforgiving
 * of bugs — an edit here writes directly to your live database.
 */

// ================== CONFIG — fill these in ==================
const PROJECT_ID = "livewire-2027";                          // from firebaseConfig.projectId
const SECRET = "PASTE_YOUR_OWN_RANDOM_SECRET_HERE";           // must match SHEETS_SYNC_SECRET in admin27.js
const SHEET_NAME = "Registrations";                           // your visible tab name
const CACHE_SHEET_NAME = "SyncCache";                         // hidden helper tab, auto-created
// ==============================================================

const EVENT_NAME_TO_ID = {
  'HackerRank': 'hackerrank',
  'APPetite': 'appetite',
  'Sandbox Mania': 'sandbox',
  'Ascension — Valorant': 'asc-valorant',
  'Ascension — Rocket League': 'asc-rocket',
  'Ascension — BGMI': 'asc-bgmi',
  'Dynamic Racing Showdown': 'drs',
  'Paradox Palette': 'paradox',
  'Aperture Alchemy': 'aperture',
  'Frame by Frame': 'fbf',
  'Sound Bytes': 'soundbytes',
  'Aenigma Syntax': 'aenigma',
  'Venture Verse': 'venture',
  'Quiz Quotient': 'quiz'
};

const COLS = ['schoolName','schoolEmail','teacherName','teacherPhone','teacherEmail',
              'event','participant','pClass','section','phone','email','discordId','inGameId'];
// Column indexes (0-based) in the visible sheet for the 3 hidden ID columns
const COL_DOC_ID = 13, COL_EVENT_ID = 14, COL_P_INDEX = 15;

// ================== Entry point: Firestore -> Sheet (push) ==================
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    if (payload.secret !== SECRET) {
      return jsonOut({ error: 'unauthorized' });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    const cache = getOrCreateCacheSheet(ss);

    // Wipe & rewrite visible data (row 1 is the header, left untouched)
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();

    if (payload.rows.length > 0) {
      sheet.getRange(2, 1, payload.rows.length, payload.rows[0].length).setValues(payload.rows);
    }

    // Hide the ID columns (harmless to re-run every time)
    try { sheet.hideColumns(COL_DOC_ID + 1, 3); } catch (err) {}

    // Update the cache so reconcile() doesn't mistake this push for a user edit
    writeCache(cache, payload.rows);

    return jsonOut({ success: true, count: payload.rows.length });
  } catch (err) {
    return jsonOut({ error: String(err) });
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ================== Cache tab helpers ==================
function getOrCreateCacheSheet(ss) {
  let cache = ss.getSheetByName(CACHE_SHEET_NAME);
  if (!cache) {
    cache = ss.insertSheet(CACHE_SHEET_NAME);
    cache.hideSheet();
  }
  return cache;
}

function rowKey(docId, eventId, pIndex) {
  return docId + '|||' + eventId + '|||' + pIndex;
}

function writeCache(cache, rows) {
  cache.clearContents();
  rows.forEach(r => {
    const key = rowKey(r[COL_DOC_ID], r[COL_EVENT_ID], r[COL_P_INDEX]);
    cache.appendRow([key].concat(r));
  });
}

function readCacheAsMap(cache) {
  const data = cache.getDataRange().getValues();
  const map = {};
  data.forEach(r => { if (r[0]) map[r[0]] = r.slice(1); });
  return map;
}

// ================== Firestore REST helpers ==================
function toFirestoreValue(v) {
  if (v === null || v === undefined || v === '') return { stringValue: '' };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFirestoreValue) } };
  if (typeof v === 'object') {
    const fields = {};
    Object.keys(v).forEach(k => fields[k] = toFirestoreValue(v[k]));
    return { mapValue: { fields: fields } };
  }
  return { stringValue: String(v) };
}

function fromFirestoreValue(fv) {
  if (!fv) return null;
  if ('stringValue' in fv) return fv.stringValue;
  if ('integerValue' in fv) return parseInt(fv.integerValue, 10);
  if ('doubleValue' in fv) return fv.doubleValue;
  if ('booleanValue' in fv) return fv.booleanValue;
  if ('nullValue' in fv) return null;
  if ('timestampValue' in fv) return fv.timestampValue;
  if ('mapValue' in fv) {
    const obj = {};
    const f = fv.mapValue.fields || {};
    Object.keys(f).forEach(k => obj[k] = fromFirestoreValue(f[k]));
    return obj;
  }
  if ('arrayValue' in fv) return (fv.arrayValue.values || []).map(fromFirestoreValue);
  return null;
}

function docUrl(docId) {
  return 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/registrations/' + docId;
}

function getDoc(docId) {
  const token = ScriptApp.getOAuthToken();
  const res = UrlFetchApp.fetch(docUrl(docId), {
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() === 404) return null;
  const json = JSON.parse(res.getContentText());
  if (!json.fields) return null;
  const obj = {};
  Object.keys(json.fields).forEach(k => obj[k] = fromFirestoreValue(json.fields[k]));
  return obj;
}

// Only touches the given top-level field (e.g. "events") — never overwrites the whole document
function patchField(docId, fieldName, value) {
  const token = ScriptApp.getOAuthToken();
  const fields = {};
  fields[fieldName] = toFirestoreValue(value);
  const url = docUrl(docId) + '?updateMask.fieldPaths=' + encodeURIComponent(fieldName) + '&currentDocument.exists=true';
  return UrlFetchApp.fetch(url, {
    method: 'patch',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({ fields: fields }),
    muteHttpExceptions: true
  });
}

function createDoc(docId, dataObj) {
  const token = ScriptApp.getOAuthToken();
  const fields = {};
  Object.keys(dataObj).forEach(k => fields[k] = toFirestoreValue(dataObj[k]));
  const url = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID +
              '/databases/(default)/documents/registrations?documentId=' + docId;
  return UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({ fields: fields }),
    muteHttpExceptions: true
  });
}

// ================== Entry point: Sheet -> Firestore (reconcile) ==================
// Set this up as a time-driven trigger (Triggers -> Add Trigger -> reconcile -> Time-driven -> every 5 minutes)
function reconcile() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  const cache = getOrCreateCacheSheet(ss);

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return; // nothing but the header

  const currentRows = sheet.getRange(2, 1, lastRow - 1, 16).getValues();
  const cacheMap = readCacheAsMap(cache);
  const seenKeys = {};
  const docsTouched = {}; // docId -> latest full doc fetched, so we only fetch once per doc per run

  currentRows.forEach((row, i) => {
    const sheetRowNum = i + 2;
    const docId = row[COL_DOC_ID];
    const eventIdRaw = row[COL_EVENT_ID];
    const pIndex = row[COL_P_INDEX];
    const hasId = docId && eventIdRaw !== '' && pIndex !== '';

    const currentValues = row.slice(0, 13); // the 13 visible fields

    if (hasId) {
      const key = rowKey(docId, eventIdRaw, pIndex);
      seenKeys[key] = true;
      const cached = cacheMap[key];
      const changed = !cached || JSON.stringify(cached.slice(0, 13)) !== JSON.stringify(currentValues);

      if (changed) {
        // EDIT: push this row's fields back into the specific participant slot
        applyEditToFirestore(docId, eventIdRaw, Number(pIndex), currentValues, docsTouched);
      }
    } else {
      // ADD: brand-new row with no hidden IDs yet
      applyAddToFirestore(sheet, sheetRowNum, currentValues, docsTouched);
    }
  });

  // Anything that was in the cache but no longer appears on the sheet = user deleted that row
  Object.keys(cacheMap).forEach(key => {
    if (!seenKeys[key]) {
      const parts = key.split('|||');
      applyDeleteToFirestore(parts[0], parts[1], Number(parts[2]), docsTouched);
    }
  });

  // Refresh the cache to match what we just processed (prevents reprocessing the same edits next run)
  const refreshedRows = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 0), 16).getValues();
  writeCache(cache, refreshedRows);
}

function applyEditToFirestore(docId, eventId, pIndex, values, docsTouched) {
  const doc = docsTouched[docId] || getDoc(docId);
  if (!doc) return; // document was deleted/missing — skip safely
  docsTouched[docId] = doc;

  if (!doc.events) doc.events = {};
  if (!Array.isArray(doc.events[eventId])) doc.events[eventId] = [];
  doc.events[eventId][pIndex] = {
    fullName: values[6], phone: values[9], class: values[7],
    section: values[8], email: values[10], discordId: values[11], inGameId: values[12]
  };
  // Also allow editing school/teacher fields from the sheet
  doc.school = { name: values[0], email: values[1] };
  doc.teacher = { name: values[2], phone: values[3], email: values[4] };

  patchField(docId, 'events', doc.events);
  patchField(docId, 'school', doc.school);
  patchField(docId, 'teacher', doc.teacher);
}

function applyDeleteToFirestore(docId, eventId, pIndex, docsTouched) {
  const doc = docsTouched[docId] || getDoc(docId);
  if (!doc || !doc.events || !doc.events[eventId] || !doc.events[eventId][pIndex]) return;
  docsTouched[docId] = doc;

  // Soft-delete, same convention as the admin panel's delete button
  doc.events[eventId][pIndex] = { fullName: '', class: '', section: '', phone: '', email: '', discordId: '', inGameId: '' };
  patchField(docId, 'events', doc.events);
}

function applyAddToFirestore(sheet, sheetRowNum, values, docsTouched) {
  const schoolName = String(values[0] || '').trim();
  const eventName = String(values[5] || '').trim();
  const eventId = EVENT_NAME_TO_ID[eventName];

  if (!schoolName || !eventId || !String(values[6] || '').trim()) {
    return; // not enough info yet (still being typed) — skip until the row is complete
  }

  // Try to find an existing document for this school (exact match on name, case-insensitive)
  let targetDocId = null;
  const cache = getOrCreateCacheSheet(SpreadsheetApp.getActiveSpreadsheet());
  const cacheMap = readCacheAsMap(cache);
  Object.keys(cacheMap).forEach(key => {
    const r = cacheMap[key];
    if (String(r[0] || '').trim().toLowerCase() === schoolName.toLowerCase()) {
      targetDocId = key.split('|||')[0];
    }
  });

  let doc, newPIndex;
  if (targetDocId) {
    doc = docsTouched[targetDocId] || getDoc(targetDocId);
    if (!doc) return;
    docsTouched[targetDocId] = doc;
    if (!doc.events) doc.events = {};
    if (!Array.isArray(doc.events[eventId])) doc.events[eventId] = [];
    newPIndex = doc.events[eventId].length;
    doc.events[eventId].push({
      fullName: values[6], phone: values[9], class: values[7],
      section: values[8], email: values[10], discordId: values[11], inGameId: values[12]
    });
    patchField(targetDocId, 'events', doc.events);
  } else {
    // No existing school found — create a brand new registration document
    targetDocId = Utilities.getUuid();
    newPIndex = 0;
    doc = {
      school: { name: schoolName, email: values[1] || '' },
      teacher: { name: values[2] || '', phone: values[3] || '', email: values[4] || '' },
      events: {},
      timestamp: new Date().toISOString()
    };
    doc.events[eventId] = [{
      fullName: values[6], phone: values[9], class: values[7],
      section: values[8], email: values[10], discordId: values[11], inGameId: values[12]
    }];
    createDoc(targetDocId, doc);
    docsTouched[targetDocId] = doc;
  }

  // Write the new IDs back into the sheet row so it's tracked from now on
  sheet.getRange(sheetRowNum, COL_DOC_ID + 1, 1, 3).setValues([[targetDocId, eventId, newPIndex]]);
}
