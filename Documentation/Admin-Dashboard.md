# Admin Dashboard — `admin-dashboard.html`

**File:** `admin-dashboard.html`  
**Lines:** ~4,466  
**Access:** Admin role only (`role === 'admin'`)  
**Purpose:** Full system control — memo management, approvals, routing, analytics, and configuration.

---

## Page Load Sequence

1. Check `localStorage` for `currentUser` — redirect to `index.html` if missing
2. Verify `role === 'admin'` — redirect if not admin
3. Set up `auth.onAuthStateChanged()` listener
4. Call `getAllMemos()` to load all memos
5. Set up real-time listener via `onSnapshot` for live updates
6. Populate statistics cards
7. Render memo tables (pending, signed, approved, cancelled, archive)
8. Initialize search, filter, and sort handlers

---

## Layout Sections

| Section | Description |
|---------|-------------|
| Header | Department selector, search bar, filter controls, view toggle |
| Stats Row | Cards: Total, Pending, Signed, Archived, per-department counts |
| Tab Bar | Tabs: Pending / Signed / Approved / Archive / Cancelled |
| Main Table | Memo list for active tab — sortable, resizable columns |
| Sidebar / Panels | PDF upload, activity log, memo number editor |

---

## Statistics Cards

Counts are computed from the full memo array loaded in memory. No additional Firestore queries are made — all filtering is client-side.

| Card | Count Logic |
|------|------------|
| Total Memos | `memos.length` |
| Pending Approvals | `memos.filter(m => m.status === 'pending').length` |
| Signed Memos | `memos.filter(m => m.status === 'signed').length` |
| Archived Memos | `memos.filter(m => m.status === 'approved' \|\| m.status === 'cancelled').length` |
| ROD Memos | `memos.filter(m => m.department === 'ROD').length` |
| FASD Memos | `memos.filter(m => m.department === 'FASD').length` |
| ORD Memos | `memos.filter(m => m.department === 'ORD').length` |

---

## Memo Table — Column Structure

| Column | Description |
|--------|------------|
| Checkbox | Selects memo for bulk operations |
| Memo Number | Formatted ID (e.g. `PO-2025-ORD-0001`) |
| Title | Memo subject |
| Department | Origin department badge |
| Date | `createdAt` formatted to locale string |
| Status | Color-coded badge |
| Actions | View / Change Status / Delete buttons |

Columns support:
- **Resizing** — drag column borders to resize
- **Sorting** — click header to sort ascending/descending
- **Collapse/Expand** — click row to expand details inline

---

## Memo Tabs

### Pending Tab
- Displays memos with `status === 'pending'`
- Bulk select + route action available
- Change Status button per row

### Signed Tab
- Displays memos with `status === 'signed'`
- Admin can release to departments

### Approved Tab
- Displays memos with `status === 'approved'`
- Shows `updatedAt` as release timestamp

### Archive Tab
- Displays approved and archived memos
- Filterable by archive type sub-tabs: `Approved`, `Cancelled`, `All`
- Copy to clipboard button
- Export to Excel button

### Cancelled Tab
- Displays memos with `status === 'cancelled'`
- Shows cancellation details

---

## Functions Reference

### Memo Display

#### `renderMemos(memos)` 
Renders the full memo list into the active tab's table. Called after every data load or filter operation.

#### `updateTable(memos)`
Rebuilds table rows. Attaches event listeners to all action buttons (view, status change, delete).

#### `getStatusColor(status)`
Returns Tailwind badge class for a given status:
| Status | Class |
|--------|-------|
| `pending` | `bg-yellow-100 text-yellow-800` |
| `signed` | `bg-blue-100 text-blue-800` |
| `approved` | `bg-green-100 text-green-800` |
| `cancelled` | `bg-red-100 text-red-800` |

---

### Memo Actions

#### `viewMemo(memoId)` — Line ~1820
Redirects to `view-memo.html?id={memoId}` to show full memo detail and activity log.

#### `deleteMemo(memoId)` — Line ~1825
1. Shows delete confirmation modal
2. On confirm, calls `deleteMemoFromFirestore(memoId)` (cascading delete)
3. Requires admin password verification
4. Shows success/error toast
5. Reloads memo list

#### `changeStatus(memoId, currentStatus)` — Line ~2087
Opens the status change modal with:
- Current status displayed
- New status dropdown
- Password confirmation field

#### `confirmStatusChange()` — Lines ~2128–2166
1. Validates password via Firebase Auth re-authentication
2. Calls `updateMemoStatus(memoId, newStatus)`
3. Calls `logMemoActivity(memoId, action, username)` to record the change
4. Shows toast notification
5. Refreshes memo list

---

### Memo Activity Logging

#### `logMemoActivity(memoId, action, username)` — Line ~2113

Creates a document in the `memoActivities` collection:

```javascript
addDoc(collection(db, 'memoActivities'), {
  memoId,
  action,           // e.g. "Status changed from pending to signed"
  username,         // admin's email
  timestamp: serverTimestamp()
})
```

Called after every status change, distribution, or archival action.

---

### Memo Number Management

#### `editMemoNumber(type)` — Line ~2174
Opens the memo number editor panel for a specific memo type.

Displays:
- Current memo number (from `memoNumbers/{docId}`)
- Input field to enter new number
- Save button

#### `saveMemoNumber(type)` — Line ~2250
1. Reads new number from input
2. Validates: new number must be greater than 0
3. Calls Firestore update:
```javascript
updateDoc(doc(db, 'memoNumbers', docId), { number: newNumber })
```
4. Shows success toast
5. Refreshes memo number display

**Memo Type → Document ID mapping:**
| Type | Document |
|------|---------|
| PO | `current` |
| CO | `coCurrent` |
| Office Order | `officeOrder` |
| Advisory | `advisory` |
| Advisory Bulletin | `advisoryBulletin` |
| Bulletin | `bulletin` |
| Acknowledgment | `acknowledgment` |

---

### Distribution Functions

#### `releaseToRodFasd(memoId)` — Line ~2398
Releases an approved memo to ROD and FASD departments for distribution.

```javascript
updateDoc(doc(db, 'memos', memoId), {
  releasedAt: serverTimestamp(),
  releasedBy: currentUser.email
})
```

#### `markAsReceived(memoId)` — Line ~2443
Marks a memo as received by a department user.

```javascript
updateDoc(doc(db, 'memos', memoId), {
  receivedAt: serverTimestamp(),
  receivedBy: currentUser.email
})
```

---

### Search & Filter

#### `filterMemos(memos, searchTerm, filterField)` — Line ~1876

Client-side filtering (no additional Firestore queries):

| Filter Field | Logic |
|-------------|-------|
| Memo Number | `memoNumber.toLowerCase().includes(term)` |
| Title | `title.toLowerCase().includes(term)` |
| Department | `department.toLowerCase().includes(term)` |
| Date Range | Parses `createdAt` and checks `start <= date <= end` |
| Status | `status === filterField` |

#### `updateSearchSuggestions()` — Line ~1955
- Fires on each keystroke in the search input
- Shows a dropdown of up to 5 matching memos
- Clicking a suggestion filters the table to that memo

---

### Bulk Operations

#### `handleSelectAll()` — Line ~2697
Toggles all visible checkbox rows on the active tab.

#### `handleIndividualCheckbox()` — Line ~2708
Updates the master "select all" checkbox to reflect individual selections.

#### `getSelectedMemoIds()` — Line ~2725
Returns array of memo IDs for all checked rows.

#### `routeSelectedMemos()` — Line ~2731
1. Calls `getSelectedMemoIds()`
2. Shows confirmation dialog
3. On confirm, updates each selected memo's department routing
4. Shows bulk success toast

#### `bulkDeleteSelectedMemos()` — Line ~2791
1. Shows password confirmation modal
2. On success:
   - Calls `deleteActivityLogsForMemos(selectedIds)` — deletes logs first
   - Deletes each memo via `deleteMemoFromFirestore(id)`
3. Refreshes memo list

---

### Action Taken Column

#### `applyActionTaken()` — Line ~2591
Marks selected memos as "action taken":
```javascript
updateDoc(doc(db, 'memos', memoId), {
  actionTaken: true,
  actionTakenAt: serverTimestamp(),
  actionTakenBy: currentUser.email
})
```

#### `clearActionTaken()` — Line ~2671
Removes the `actionTaken` flag:
```javascript
updateDoc(doc(db, 'memos', memoId), {
  actionTaken: false,
  actionTakenAt: null,
  actionTakenBy: null
})
```

The "Action Taken" column is toggled via the `actionToggle` checkbox — when hidden, the column and its buttons are removed from the DOM.

---

### Archive Management

#### `filterArchivedMemosByType(type)` — Line ~2945
Filters the archive tab by sub-type. Available types:
- `All` — all archived memos
- `Approved` — status `approved`
- `Cancelled` — status `cancelled`

#### `copyArchiveData()` — Line ~3012
Copies the current archive table data to the clipboard as plain text.
Shows a brief "Copied!" toast on success.

#### `exportArchiveData()` — Line ~3078
Exports archive data to an Excel file using the XLSX library:

```javascript
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(archiveData);
XLSX.utils.book_append_sheet(wb, ws, 'Archive');
XLSX.writeFile(wb, `archive-${Date.now()}.xlsx`);
```

Exported columns: Memo Number, Title, Department, Date, Status, Recipients, Signatory

---

### PDF Bulk Download

#### `downloadAllPDFs()` — Line ~3137
Downloads all memo PDFs as a single ZIP file.

**Steps:**
1. Fetches all memos via `getAllMemos()`
2. Filters for memos with `pdfUrl != null`
3. Shows progress bar
4. For each PDF:
   - Fetches the file via `fetch(pdfUrl)`
   - Adds to JSZip archive with original filename
5. Generates ZIP blob
6. Triggers browser download as `memos-pdfs-{timestamp}.zip`

**Requires:** JSZip 3.10.1 (loaded via CDN)

---

### Admin Utilities

#### `cleanupOrphanedLogs()` — Line ~1830
Calls `cleanupOrphanedActivityLogs()` from `firebase-config.js`.
Displays count of deleted orphaned records in a toast.

---

## PDF Upload Section

Admin can attach a PDF to any memo via drag-and-drop or file picker.

**UI Elements:**
- Drag-and-drop zone with dashed border
- File input (hidden, triggered by zone click)
- Progress bar with percentage label
- Cancel/Retry buttons
- File name and size display

**Validation (in `uploadPDF()`):**
- Must be `application/pdf`
- Maximum 10MB

**Upload flow:**
1. Admin drags or selects file
2. `uploadPDF(memoId, file, onProgress)` called
3. Progress bar updates via `onProgress` callback
4. On complete: Firestore memo updated with `pdfUrl`, `pdfFileName`, `pdfUploadedAt`
5. Success toast shown with download link

---

## Session & Auth Guards

- Page checks `auth.currentUser` on load
- If null → redirect to `index.html`
- If `role !== 'admin'` → redirect to `user-dashboard.html`
- Admin password is re-verified before destructive actions (delete, status change)

---

## External Libraries Used

| Library | Version | Purpose |
|---------|---------|---------|
| Tailwind CSS | v3 | Styling |
| Lucide Icons | latest | Icon set |
| XLSX | 0.18.5 | Excel export |
| JSZip | 3.10.1 | ZIP file creation for bulk PDF download |
| Firebase SDK | v10.8.0 | Auth, Firestore, Storage |
