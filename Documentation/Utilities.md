# Utilities and Admin Tools

This document covers all utility pages, admin scripts, and legacy system components.

---

## `init-users.html` — User Database Initialization

**Purpose:** Seeds the 4 base user documents into Firestore. Run once during initial setup.

**What it does:**
1. Calls `initializeUsers()` from `firebase-config.js`
2. Checks if each email already exists in the `users` collection before inserting
3. Displays a success or error message

**Users seeded:**

| Email | Department | Role |
|-------|-----------|------|
| ord7.communication@gmail.com | ORD | user |
| region7.rod@gmail.com | ROD | user |
| region7.fasd@gmail.com | FASD | user |
| region7@tesda.gov.ph | Administration | admin |

**Firestore Operations:**
```javascript
// For each user, checks first:
query(collection(db, 'users'), where('email', '==', user.email))

// If no doc found, creates:
addDoc(collection(db, 'users'), {
  email, department, role, username,
  createdAt: serverTimestamp()
})
```

**Note:** This only creates the Firestore profile documents. The Firebase Authentication accounts must be created separately in the Firebase Console.

---

## `deleteNullTitles.js` — Data Cleanup Script

**File:** `deleteNullTitles.js`  
**Type:** Node.js script (requires Firebase Admin SDK)  
**Purpose:** Removes memo documents from Firestore where the `title` field is missing, null, or the literal string `"null"`.

**How to run:**
```bash
node deleteNullTitles.js
```

**Logic:**
```javascript
const memos = await getDocs(collection(db, 'memos'));
memos.forEach(async (doc) => {
  const title = doc.data().title;
  if (!title || title === 'null') {
    await deleteDoc(doc.ref);
    console.log(`Deleted memo: ${doc.id}`);
  }
});
```

**Output:**
- Logs each deleted document ID to console
- Reports total deletion count
- Reports any errors

**When to use:** After a data import, migration, or testing session that may have left incomplete memo records.

---

## `upload.html` — Simple PDF Upload

**Purpose:** Minimal standalone PDF upload tool. Allows attaching a PDF to a memo by memo ID.

**Features:**
- File input (PDF only)
- Optional custom filename input
- Upload button
- Displays resulting Firebase Storage download URL
- Optional checkbox to also create a Firestore record

**Use case:** Quick manual PDF attachment when the admin dashboard upload is not available.

---

## `upload-test.html` — PDF Upload Testing

**Purpose:** Developer tool for testing and debugging the PDF upload flow with verbose logging.

**Features:**
- Drag-and-drop zone
- Progress bar
- In-page log console with timestamped entries
- Color-coded log levels:
  - Blue → info
  - Green → success
  - Red → error
  - Yellow → warning
- "Clear Logs" button

**What it tests:**
- File validation (PDF type, size)
- Firebase Storage upload (`uploadBytesResumable`)
- Progress callback behavior
- Firestore update after upload
- Error handling (unauthorized, canceled, unknown)

---

## `verify-cors.html` — CORS Configuration Verification

**Purpose:** Tests whether Firebase Storage CORS rules are correctly applied.

**What it checks:**
- Makes a `fetch()` HEAD request to the Firebase Storage bucket
- Reports HTTP status and response headers
- Flags missing `Access-Control-Allow-Origin` header

**Displayed information:**
- Test result (pass/fail)
- Applicable setup instructions if CORS is not configured
- Firebase project ID: `ro7mbms`
- Storage bucket: `ro7mbms.firebasestorage.app`

**When to use:** After deploying to a new domain or after modifying `cors.json` and running `gsutil cors set`.

---

## `download-all-pdfs-example.html` — Bulk PDF Download

**Purpose:** Downloads all memo PDFs from Firebase Storage as a single ZIP file.

**Steps:**
1. Authenticates using current Firebase session
2. Fetches all memos via `getAllMemos()`
3. Filters for memos where `pdfUrl` is not null
4. Fetches each PDF as a blob
5. Adds each to a JSZip archive
6. Triggers browser download of the ZIP

**Progress tracking:** Shows count of downloaded PDFs and progress bar.

**Libraries:** JSZip 3.10.1 (loaded from CDN)

**Filename format:** `memos-pdfs-{timestamp}.zip`

**Error handling:**
- PDF fetch errors are logged and skipped (bulk download continues)
- Final report shows success count vs. failure count

---

## `ictunit.html` — ICT Team Page

**Purpose:** Informational page about the ICT team responsible for this system.

**Features:**
- Team member cards with names and roles
- Fade-in animations on page load
- Gradient text effects
- Mobile responsive layout
- Dark mode support via Tailwind
- No Firestore interaction

---

## `app.js` — Legacy Application Class

**File:** `app.js`  
**Type:** ES5 class — `TesdaMBMS`  
**Status:** Not used in active pages. Pre-Firebase implementation.

**What it did (before Firebase migration):**

| Method | Description |
|--------|-------------|
| `init()` | Loads session from localStorage, sets up event listeners |
| `login(username, password, department)` | Static username/password check, stores to localStorage |
| `logout()` | Clears localStorage, redirects |
| `generateMemoNumber(department)` | Creates `DEPT-YYYY-XXX` format memo numbers |
| `createMemo(memoData)` | Saves memo to localStorage array |
| `getMemos(filters)` | Filters in-memory memo array |
| `updateMemoStatus(memoId, status)` | Updates memo in localStorage |
| `saveMemos()` / `loadMemos()` | JSON stringify/parse to localStorage |
| `loadMockData()` | Seeds 3 sample memos on first load |
| `getStatistics()` | Counts by status and department |
| `formatDate(date)` | Locale date string |
| `validateMemoData(data)` | Checks required fields |
| `searchMemos(query)` | Full-text search on memo fields |
| `filterMemosByDateRange(start, end)` | Date range filter |
| `exportMemos(format)` | JSON or CSV export |
| `convertToCSV(data)` | CSV conversion |
| `downloadFile(blob, filename)` | Browser download trigger |
| `showNotification(message, type)` | Toast with 5s auto-hide |

**Memo statuses used:** `Active`, `Pending`, `Completed`  
**Departments used:** `ROD`, `FASD`, `ORD`

---

## `users.js` — Static User Credentials

**File:** `users.js`  
**Type:** ES6 Module  
**Status:** Legacy fallback — not used in production Firebase flow.

**Exports:**
```javascript
export function validateUser(username, password) { ... }
export function getUserByUsername(username) { ... }
```

**Credentials stored:**
```javascript
const users = [
  { username: 'ROD', password: 'rod2025', department: 'ROD', role: 'user' },
  { username: 'ORD', password: 'ord2025', department: 'ORD', role: 'user' },
  { username: 'FASD', password: 'fasd2025', department: 'FASD', role: 'user' },
  { username: 'admintesda', password: 'tesdaadmin', department: 'Administration', role: 'admin' }
];
```

**Security note:** These credentials are plaintext in source code. They are not used in the live production login path, which goes through Firebase Authentication.

---

## `oldsystem/` — Legacy Records

**Directory:** `oldsystem/`  
**Purpose:** Stores and displays historical memo records from before the MBMS system.

### Files

| File | Description |
|------|-------------|
| `oldsystem/index.html` | Historical records viewer UI |
| `oldsystem/convert.html` | Data migration tool (old format → new format) |
| `oldsystem/2020.json` | Memo records from 2020 |
| `oldsystem/2021.json` | Memo records from 2021 |
| `oldsystem/2022.json` | Memo records from 2022 |
| `oldsystem/2023.json` | Memo records from 2023 |
| `oldsystem/2024.json` | Memo records from 2024 |
| `oldsystem/2025.json` | Memo records from 2025 |

### `oldsystem/index.html`

**Features:**
- Year selector dropdown (2020–2025)
- Loads the corresponding JSON file for the selected year
- Displays memo list with Firestore integration (auth check)
- "Back to Dashboard" button that routes based on user role:
  - Admin → `admin-dashboard.html`
  - User → `user-dashboard.html`

**Firestore interaction:** Auth check only — memo data comes from local JSON files, not Firestore.

### `oldsystem/convert.html`

**Purpose:** Converts old system memo format to the new MBMS format.  
Reads from the JSON files and can write to Firestore for migration.
