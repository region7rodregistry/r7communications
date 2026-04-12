# User Dashboard — `user-dashboard.html`

**File:** `user-dashboard.html`  
**Lines:** ~889  
**Access:** Department users (`role === 'user'`)  
**Purpose:** View, filter, and interact with memos assigned to the user's department.

---

## Page Load Sequence

1. Read `currentUser` from `localStorage` — redirect to `index.html` if missing
2. Display department name in welcome message
3. Start **15-minute inactivity timeout** (resets on any user activity)
4. Call `getMemosByDepartment(department, callback)` — sets up real-time Firestore listener
5. Callback populates stats cards and memo table
6. Initialize search, filter, tab, and pagination handlers

---

## Layout Sections

| Section | Description |
|---------|-------------|
| Sidebar | Navigation links + mobile drawer |
| Header | Welcome message, dark mode toggle, logout button |
| Stats Cards | Total, Pending, Signed, Approved/Archived counts |
| Search + Filters | Search input, status dropdown, date range pickers |
| Tab Bar | Pending / Signed / Approved / Archive tabs |
| Memo Table | Paginated list of memos for the active tab |

---

## Sidebar Navigation

| Link | Destination |
|------|------------|
| Dashboard | `user-dashboard.html` (current page) |
| Create Memo | `create-memo.html` |
| View Old System | `oldsystem/index.html` |
| R7-Data | External or internal data link |
| ICT Team | `ictunit.html` |

Mobile drawer is toggled by the hamburger menu icon in the header.

---

## Statistics Cards

All computed client-side from the loaded memo array (no separate Firestore queries).

| Card | Filter | Icon Color |
|------|--------|-----------|
| Total Memos | All memos for the department | Blue |
| Pending Memos | `status === 'pending'` | Yellow |
| Signed Memos | `status === 'signed'` | Red |
| Approved and Archived | `status === 'approved'` | Green |

Each card is **clickable** — clicking a card filters the table to that status.

---

## Memo Tabs

### Pending Tab
- Memos with `status === 'pending'`
- Shows memo number, title, date, and a "Mark as Received" action

### Signed Tab
- Memos with `status === 'signed'`
- Same expandable row structure

### Approved Tab
- Memos with `status === 'approved'`
- Grouped by received date or month

### Archive Tab
- Approved and archived memos
- Filter by archive sub-type
- Copy archive data button
- Export to Excel button

---

## Firestore Query

```javascript
// getMemosByDepartment(department, callback) in firebase-config.js
query(
  collection(db, 'memos'),
  where('department', '==', department),
  orderBy('createdAt', 'desc')
)
```

This is a **real-time listener** (`onSnapshot`). Every time a memo is added, updated, or deleted in Firestore, the callback fires and the table updates automatically without a page refresh.

The listener's `unsubscribe` function is stored and called on page unload to prevent memory leaks.

---

## Functions Reference

### `loadMemos()` — Lines 720–747

Sets up the real-time Firestore listener for the current user's department.

```javascript
const department = currentUser.department;
unsubscribeMemos = getMemosByDepartment(department, (memos) => {
  allMemos = memos;
  updateStatsCards(memos);
  renderActiveTab(memos);
});
```

Called once on page load. The callback runs every time data changes.

---

### `filterMemos()` — Lines 443–470

Client-side filter — no Firestore call. Filters `allMemos` array:

| Filter Input | Logic |
|-------------|-------|
| Search term | Checks `memoNumber`, `title`, `description` (case-insensitive) |
| Status dropdown | Exact match on `status` field |
| Start date | `createdAt >= startDate` |
| End date | `createdAt <= endDate` |

Combines all active filters. Passes result to `updateTable()`.

---

### `updateTable(memos)` — Lines 497–656

Rebuilds the memo table for the active tab.

**Table Columns:**
- Memo Number
- Title
- Date (formatted with `toLocaleDateString()`)
- Status (color-coded badge)
- Actions (View, Mark as Received)

**Row expand/collapse:**
- Clicking a row toggles an inline detail panel showing description, recipients, and signatory

**Status badge colors:**
| Status | Badge Class |
|--------|------------|
| `pending` | `bg-yellow-100 text-yellow-800` |
| `signed` | `bg-blue-100 text-blue-800` |
| `approved` | `bg-green-100 text-green-800` |
| `cancelled` | `bg-red-100 text-red-800` |

---

### `viewMemo(memoId)` — Lines 764–773

Redirects to memo detail page:
```javascript
window.location.href = `view-memo.html?id=${memoId}`;
```

---

### `markAsReceived(memoId)` — Lines 804–820

1. Shows a confirmation modal asking for the receiver's name
2. On confirm, updates the memo in Firestore:
```javascript
updateDoc(doc(db, 'memos', memoId), {
  receivedAt: serverTimestamp(),
  receivedBy: recipientName,
  status: 'signed'  // or updates receipt flag
})
```
3. Shows success toast
4. Table refreshes automatically via real-time listener

---

### `showSuccessToast(message)` — Lines 822–832

Displays a green toast notification for 3 seconds.

```javascript
toast.textContent = message;
toast.classList.remove('hidden');
setTimeout(() => toast.classList.add('hidden'), 3000);
```

### `showErrorToast(message)` — Lines 834–842

Same as success toast but with red styling. Duration: 4 seconds.

---

### `getStatusColor(status)` — Lines 748–762

Returns Bootstrap/Tailwind badge class string for a given status string.

---

## Pagination

Memos are paginated to keep performance acceptable for large lists.

| Control | Behavior |
|---------|---------|
| "Prev" button | Goes to previous page |
| "Next" button | Goes to next page |
| Page counter | Shows "Page X of Y" |

Default page size: **10 memos per page** (configurable in the JS).

Pagination state resets when search or filter changes.

---

## Search & Filter Controls

| Control | Type | What It Filters |
|---------|------|----------------|
| Search input | Text | Memo number, title, description |
| Status dropdown | Select | pending / signed / approved / cancelled |
| Start date | Date picker | `createdAt` >= value |
| End date | Date picker | `createdAt` <= value |

All filters combine — only memos matching **all** active filters are shown.

---

## Session Timeout (15 Minutes)

```javascript
let inactivityTimer;

function resetTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    logoutUser().then(() => {
      localStorage.removeItem('currentUser');
      window.location.href = 'index.html';
    });
  }, 900000); // 15 min = 900,000 ms
}

document.addEventListener('mousemove', resetTimer);
document.addEventListener('keydown', resetTimer);
document.addEventListener('click', resetTimer);
document.addEventListener('scroll', resetTimer);
document.addEventListener('touchstart', resetTimer);

resetTimer();
```

---

## Dark Mode

Toggle button in the header switches between light and dark themes:
- Adds/removes `dark` class on `<html>` element
- Tailwind dark mode classes (`dark:bg-gray-900`, etc.) handle styling
- Preference is stored in `localStorage` as `'darkMode': 'enabled' | 'disabled'`
- Applied on page load so the preference persists across sessions

---

## Mobile Responsiveness

- Sidebar collapses to a hidden drawer on small screens
- Hamburger icon (☰) in header opens/closes drawer
- Table columns collapse on mobile (shows only Memo Number + Status)
- Stats cards stack vertically on small screens
