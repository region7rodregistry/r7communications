# View Memo — `view-memo.html`

**File:** `view-memo.html`  
**Access:** All authenticated users  
**Purpose:** Display full memo details, track its approval status visually, and show the complete activity log.

---

## URL Structure

```
view-memo.html?id={memoId}
```

The `memoId` query parameter is the Firestore document ID of the memo.

---

## Page Load Sequence

1. Read `memoId` from URL query string (`URLSearchParams`)
2. Redirect to `index.html` if `memoId` is missing
3. Check `currentUser` in `localStorage` — redirect if not logged in
4. Fetch memo by ID from Firestore
5. Render memo fields
6. Fetch activity logs for this memo
7. Render activity timeline

---

## Firestore Queries

### Fetch Memo

```javascript
getDoc(doc(db, 'memos', memoId))
```

Returns a single memo document. If not found, shows an error message.

### Fetch Activity Logs

```javascript
query(
  collection(db, 'memoActivities'),
  where('memoId', '==', memoId),
  orderBy('timestamp', 'asc')
)
```

Returns all activities for the memo, in chronological order.

---

## Displayed Fields

| Field | Source |
|-------|--------|
| Memo Number | `memo.memoNumber` |
| Department | `memo.department` |
| Status | `memo.status` (color-coded badge) |
| Date Created | `memo.createdAt` formatted |
| Title | `memo.title` |
| Description | `memo.description` |
| Recipients | `memo.recipients` (list) |
| Signatory | `memo.signatory` |
| Author / Focal | `memo.authorFocal` |
| Attached PDF | Link to `memo.pdfUrl` (if present) |

---

## Status Badge Colors

| Status | Badge Style |
|--------|------------|
| `pending` | Yellow background, yellow text |
| `signed` | Blue background, blue text |
| `approved` | Green background, green text |
| `cancelled` | Red background, red text |

---

## Activity Tracking Timeline

A visual step-by-step tracker shows where the memo is in the approval workflow.

### Steps Displayed

| Step | Icon | Conditions |
|------|------|-----------|
| Created | ✓ | Always completed |
| Submitted | ✓ | Always completed (created = submitted) |
| Approved | ✓ / pulse / — | Completed if status is `approved`; pulsing animation if `signed`; gray if `pending` |
| Archived | ✓ / — | Completed if `archived`; gray otherwise |

### Visual States

```
Completed step:    Filled blue circle with checkmark ✓
Current step:      Light blue circle with white ring + pulse animation
Pending step:      Gray circle, white fill
```

### CSS Animations

```css
/* Pulse on current step */
.tracking-circle.current {
  animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
}

@keyframes ping {
  75%, 100% {
    transform: scale(2);
    opacity: 0;
  }
}
```

### Connection Lines Between Steps

Horizontal or vertical lines connect each step circle. Color fills progressively as steps complete:
- **Completed segment:** Blue line
- **Pending segment:** Gray line

---

## Activity Log (Timeline Feed)

Below the tracker, each entry from `memoActivities` is displayed as a feed item:

| Field Shown | Source |
|-------------|--------|
| Action | `activity.action` (e.g. "Status changed from pending to signed") |
| By | `activity.username` |
| When | `activity.timestamp` formatted as date + time |

Activities are shown oldest-first (chronological).

---

## Header Buttons

| Button | Visible To | Action |
|--------|-----------|--------|
| Back to Dashboard | All | `history.back()` or redirects based on role |
| Print | All | Triggers `window.print()` |
| Edit | Admin only | Redirects to memo editing view |

---

## Print Support

CSS `@media print` rules:
- `.no-print` class hides navigation, buttons, and UI chrome
- Removes box shadows and border-radius for clean output
- Memo content fields render as plain text blocks
- Activity timeline prints in linear format

---

## Responsive Layout

- Header and content stack vertically on mobile
- Tracking timeline switches from horizontal (desktop) to vertical (mobile) at the `md` breakpoint
- PDF link becomes a full-width button on small screens
