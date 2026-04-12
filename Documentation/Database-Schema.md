# Firestore Database Schema

**Firebase Project:** ro7mbms  
**Database:** Cloud Firestore  

---

## Collection Overview

| Collection | Purpose | Document Count (approx) |
|-----------|---------|------------------------|
| `memos` | All memo records | Grows over time |
| `memoNumbers` | Auto-increment counters per memo type | 7 fixed documents |
| `memoActivities` | Audit log for every memo action | Grows over time |
| `users` | Registered user profiles | 4 seeded + any new |
| `analytics` | Global read/write usage counters | 1 document (`global`) |

---

## Collection: `memos`

Primary data store. Each document represents one memo.

### Document Shape

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `memoNumber` | `string` | Yes | Formatted memo number, e.g. `PO-2025-ORD-0001` |
| `title` | `string` | Yes | Memo subject/title (max 200 chars) |
| `description` | `string` | No | Memo body/description (max 500 chars) |
| `department` | `string` | Yes | Originating department: `ORD`, `ROD`, `FASD`, `Administration` |
| `recipients` | `array<string>` | Yes | List of recipient names or departments |
| `authorFocal` | `string` | Yes | Author or focal person name |
| `signatory` | `string` | Yes | Name of the signing authority |
| `createdBy` | `string` | Yes | Email of the user who created the memo |
| `memoType` | `string` | Yes | One of: `PO`, `CO`, `Office Order`, `Advisory`, `AdvisoryBulletin`, `Bulletin`, `Acknowledgment` |
| `isAntedated` | `boolean` | Yes | `true` if memo was created with an antedated date |
| `antedationDate` | `string \| null` | Yes | Date string `YYYY-MM-DD` if antedated, otherwise `null` |
| `createdAt` | `Timestamp` | Yes | Creation time (set to antedation date if antedated, else server time) |
| `updatedAt` | `Timestamp` | No | Last update time, set on every status change |
| `status` | `string` | Yes | Current status: `pending`, `signed`, `approved`, `cancelled` |
| `pdfUrl` | `string \| null` | No | Firebase Storage download URL for attached PDF |
| `pdfUploadedAt` | `Timestamp \| null` | No | When the PDF was uploaded |
| `pdfFileName` | `string \| null` | No | Sanitized PDF filename stored in Storage |

### Example Document

```json
{
  "memoNumber": "PO-2025-ORD-0001",
  "title": "Positioning Order for Regional Staff",
  "description": "This memo positions staff to their new assignments...",
  "department": "ORD",
  "recipients": ["ROD", "FASD"],
  "authorFocal": "Juan Dela Cruz",
  "signatory": "Regional Director",
  "createdBy": "ord7.communication@gmail.com",
  "memoType": "PO",
  "isAntedated": false,
  "antedationDate": null,
  "createdAt": "2025-06-15T08:00:00Z",
  "updatedAt": "2025-06-16T10:30:00Z",
  "status": "approved",
  "pdfUrl": "https://firebasestorage.googleapis.com/...",
  "pdfUploadedAt": "2025-06-15T09:00:00Z",
  "pdfFileName": "PO-2025-ORD-0001.pdf"
}
```

### Queries Used

| Query | Used In | Code |
|-------|---------|------|
| All memos, ordered by date desc | `getAllMemos()` | `getDocs(collection(db, 'memos'))` |
| Memos by department, ordered by date desc | `getMemosByDepartment()` | `where('department', '==', dept), orderBy('createdAt', 'desc')` |
| Single memo by ID | `view-memo.html` | `getDoc(doc(db, 'memos', memoId))` |
| Memos by type (for antedation) | `create-memo.html` | `where('memoType', '==', type)` |
| Memos by memo number (uniqueness check) | `create-memo.html` | `where('memoNumber', '==', number)` |

---

## Collection: `memoNumbers`

Stores auto-increment counters for each memo type. There are exactly **7 documents** in this collection — one per memo type.

### Document IDs and Memo Type Mapping

| Document ID | Memo Type |
|-------------|-----------|
| `current` | PO (Positioning Order) |
| `coCurrent` | CO (Compliance Order) |
| `officeOrder` | Office Order |
| `advisory` | Advisory |
| `advisoryBulletin` | Advisory Bulletin |
| `bulletin` | Bulletin |
| `acknowledgment` | Acknowledgment |

### Document Shape

| Field | Type | Description |
|-------|------|-------------|
| `number` | `integer` | The **next** number to be assigned (incremented atomically on each memo creation) |

### Example Document (`memoNumbers/current`)

```json
{
  "number": 42
}
```

This means the next PO memo created will be numbered `PO-2025-ORD-0042`.

### How Numbers Are Used

1. `getCurrentMemoNumber(memoType)` — reads current `number` for preview display (no increment)
2. `getNextMemoNumber(memoType)` — reads `number` **and** atomically increments it (via transaction) — used only on actual form submission

### Important Notes

- The counter is **global** (not per-department). All departments share the same counter per memo type.
- For antedated memos, the counter is **NOT incremented** — they use a suffix-based number (e.g. `PO-2024-ORD-0010A`).
- Admins can manually edit these counters from the admin dashboard.

---

## Collection: `memoActivities`

Audit trail — every significant action on a memo creates a record here.

### Document Shape

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `memoId` | `string` | Yes | Firestore document ID of the related memo |
| `action` | `string` | Yes | Description of the action (e.g. `"Status changed to approved"`) |
| `username` | `string` | Yes | Email or display name of the user who performed the action |
| `timestamp` | `Timestamp` | Yes | When the action occurred |

### Example Document

```json
{
  "memoId": "abc123xyz",
  "action": "Status changed from pending to signed",
  "username": "region7@tesda.gov.ph",
  "timestamp": "2025-06-16T10:30:00Z"
}
```

### Queries Used

| Query | Used In |
|-------|---------|
| Logs by memoId | `view-memo.html` (activity timeline) |
| Logs by memoId (for deletion) | `deleteMemoFromFirestore()` — cascading delete |
| All logs (for orphan cleanup) | `cleanupOrphanedActivityLogs()` |

### Cascade Behavior

When a memo is deleted:
1. All `memoActivities` documents where `memoId` matches the deleted memo are deleted first
2. Then the memo document itself is deleted
3. This prevents orphaned activity logs from accumulating

---

## Collection: `users`

Stores user profile data. Populated by `initializeUsers()` and auto-created on first login if not found.

### Document Shape

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | `string` | Yes | User's email address (used as login identifier) |
| `username` | `string` | No | Display name |
| `department` | `string` | Yes | `ORD`, `ROD`, `FASD`, or `Administration` |
| `role` | `string` | Yes | `user` or `admin` |
| `createdAt` | `Timestamp` | No | When the user document was created |

### Example Document

```json
{
  "email": "ord7.communication@gmail.com",
  "username": "ORD Communications",
  "department": "ORD",
  "role": "user",
  "createdAt": "2025-01-01T00:00:00Z"
}
```

### Queries Used

| Query | Used In |
|-------|---------|
| User by email | `getUserData()` in `firebase-config.js` |
| User by email (existence check before seed) | `initializeUsers()` |

### Auto-creation Logic

If `getUserData(email)` returns no document (new user logged in via Firebase Auth but no Firestore record):
- Department is inferred from email:
  - Contains `ord` → `ORD`
  - Contains `rod` → `ROD`
  - Contains `fasd` → `FASD`
  - Ends with `@tesda.gov.ph` → `Administration`
  - Default → `ORD`
- Role: `admin` if `@tesda.gov.ph`, else `user`

---

## Collection: `analytics`

Single document (`analytics/global`) that tracks daily and total Firestore read/write operations.

### Document Shape (`analytics/global`)

| Field | Type | Description |
|-------|------|-------------|
| `totalReads` | `integer` | All-time total read operations |
| `todayReads` | `integer` | Read operations since midnight (resets daily) |
| `totalWrites` | `integer` | All-time total write operations |
| `todayWrites` | `integer` | Write operations since midnight (resets daily) |
| `lastUpdated` | `Timestamp` | When the document was last updated (used to detect day rollover) |

### Example Document

```json
{
  "totalReads": 1542,
  "todayReads": 37,
  "totalWrites": 284,
  "todayWrites": 12,
  "lastUpdated": "2025-06-16T14:00:00Z"
}
```

### How It Works

`incrementAnalyticsCounter(type)` uses a Firestore **transaction** to:
1. Read `lastUpdated` from the document
2. If date differs from today → reset `todayReads` or `todayWrites` to 0
3. Increment the appropriate counters
4. Write back atomically

This is called automatically by `createMemo`, `getMemosByDepartment`, and `getAllMemos`.

---

## Firestore Security Considerations

- The Firebase API key is exposed client-side (standard for Firebase web apps)
- Security is enforced via **Firestore Security Rules** (not stored in this repo — configured in the Firebase Console)
- Admin operations (delete, status change) require password re-confirmation in the UI as an additional layer
- `@tesda.gov.ph` email addresses are automatically assigned admin role — ensure only trusted emails use this domain

---

## Indexes Required

The following composite indexes should be configured in the Firebase Console:

| Collection | Fields | Order |
|-----------|--------|-------|
| `memos` | `department` ASC, `createdAt` DESC | For `getMemosByDepartment()` |
| `memoActivities` | `memoId` ASC, `timestamp` DESC | For activity log display |
