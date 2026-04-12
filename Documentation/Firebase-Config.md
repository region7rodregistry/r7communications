# Firebase Config — `firebase-config.js`

**File:** `firebase-config.js`  
**Type:** ES6 Module  
**Purpose:** Central module for every Firebase operation in the app — Firestore, Authentication, and Storage. All other pages import their database/storage functions from here.

---

## Firebase SDK Imports

```javascript
// Firebase App
import { initializeApp } from "firebase/app";

// Firestore
import {
  getFirestore, collection, addDoc, getDocs, query, where,
  updateDoc, doc, deleteDoc, runTransaction, orderBy,
  onSnapshot, getDoc
} from "firebase/firestore";

// Authentication
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";

// Storage
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
```

---

## Firebase Project Configuration

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAiDFpdkWI3BiZwdjp6mHN01hmvBItMk6o",
  authDomain: "ro7mbms.firebaseapp.com",
  projectId: "ro7mbms",
  storageBucket: "ro7mbms.firebasestorage.app",
  messagingSenderId: "379123096432",
  appId: "1:379123096432:web:b790b0eaf620840af80db5"
};
```

**Exported objects:** `db` (Firestore), `auth` (Firebase Auth), `storage` (Firebase Storage)

---

## Memo Functions

### `createMemo(memoData)` — Lines 25–77

Creates a new memo document in the `memos` Firestore collection.

**Behavior:**
- Sets `status` to `'pending'` if not provided
- If `isAntedated` is true and `antedationDate` is provided, uses that date as `createdAt`
- Otherwise sets `createdAt` to `serverTimestamp()`
- Calls `incrementAnalyticsCounter('write')` after creation

**Firestore Operation:**
```javascript
addDoc(collection(db, 'memos'), {
  ...memoData,
  createdAt: isAntedated ? Timestamp.fromDate(antedationDateObj) : serverTimestamp(),
  status: 'pending'
})
```

**Returns:** Firestore `DocumentReference` of the new memo.

**Called from:** `create-memo.html` on form submission.

---

### `getMemosByDepartment(department, callback)` — Lines 80–100

Sets up a **real-time listener** that fires whenever memos for a department change.

**Firestore Query:**
```javascript
query(
  collection(db, 'memos'),
  where('department', '==', department),
  orderBy('createdAt', 'desc')
)
```

**Behavior:**
- Uses `onSnapshot` for live updates
- Calls `callback(memos)` every time data changes
- Each memo in the callback array includes `id` (Firestore doc ID) + all fields
- Calls `incrementAnalyticsCounter('read')` on each snapshot

**Returns:** `unsubscribe` function — call it to stop listening.

**Called from:** `user-dashboard.html`, `admin-dashboard.html`

---

### `getAllMemos()` — Lines 102–113

One-time fetch of **all** memos (no department filter).

**Firestore Query:**
```javascript
getDocs(collection(db, 'memos'))
```

**Returns:** Array of memo objects (each with `id` field).

**Called from:** `admin-dashboard.html`, `download-all-pdfs-example.html`

---

### `updateMemoStatus(memoId, status)` — Lines 115–126

Updates the `status` field of a single memo and records `updatedAt`.

**Firestore Operation:**
```javascript
updateDoc(doc(db, 'memos', memoId), {
  status: status,
  updatedAt: serverTimestamp()
})
```

**Called from:** `admin-dashboard.html` (status change workflow), `user-dashboard.html` (mark as received)

---

### `deleteMemoFromFirestore(memoId)` — Lines 128–155

Cascading delete — removes the memo and **all related activity logs**.

**Steps:**
1. Queries `memoActivities` where `memoId == memoId`
2. Deletes each activity log document individually
3. Deletes the memo document from `memos`

**Firestore Operations:**
```javascript
// Step 1 — find activity logs
query(collection(db, 'memoActivities'), where('memoId', '==', memoId))

// Step 2 — delete each log
deleteDoc(doc(db, 'memoActivities', logDoc.id))

// Step 3 — delete memo
deleteDoc(doc(db, 'memos', memoId))
```

**Called from:** `admin-dashboard.html` (delete button + bulk delete)

---

### `deleteActivityLogsForMemos(memoIds)` — Lines 157–185

Bulk-deletes activity logs for a list of memo IDs.

**Behavior:**
- Iterates over `memoIds` array
- For each ID, queries and deletes all matching `memoActivities` docs
- Used before bulk memo deletion to prevent orphaned logs

**Called from:** `admin-dashboard.html` (bulk delete operations)

---

### `cleanupOrphanedActivityLogs()` — Lines 187–220

Admin maintenance utility. Finds `memoActivities` documents that reference memos which no longer exist and deletes them.

**Steps:**
1. Fetches all memos → builds Set of valid memo IDs
2. Fetches all activity logs
3. Any log whose `memoId` is not in the valid set is deleted

**Returns:** Count of deleted orphaned records.

**Called from:** `admin-dashboard.html` "Cleanup Orphaned Logs" admin action

---

## Memo Number Functions

### `getNextMemoNumber(memoType)` — Lines 223–267

Atomically reads the current memo number for a given type and **increments it** for the next call. Uses a Firestore transaction to prevent race conditions.

**Memo Type → Firestore Document ID mapping:**
| memoType | Document ID |
|----------|------------|
| `PO` | `current` |
| `CO` | `coCurrent` |
| `Office Order` | `officeOrder` |
| `Advisory` | `advisory` |
| `AdvisoryBulletin` | `advisoryBulletin` |
| `Bulletin` | `bulletin` |
| `Acknowledgment` | `acknowledgment` |

**Firestore Transaction:**
```javascript
runTransaction(db, async (transaction) => {
  const docSnap = await transaction.get(doc(db, 'memoNumbers', docId));
  const currentNum = docSnap.exists() ? docSnap.data().number : 0;
  transaction.set(doc(db, 'memoNumbers', docId), { number: currentNum + 1 });
  return currentNum;
})
```

**Returns:** The current number (before increment) as an integer.

**Called from:** `create-memo.html` on form submission (for non-antedated memos only)

---

### `getCurrentMemoNumber(memoType)` — Lines 269–307

Reads the current memo number **without incrementing**. Used to display the preview in the form.

**Firestore Query:**
```javascript
getDoc(doc(db, 'memoNumbers', docId))
```

**Returns:** Current number (integer), or `0` if the document doesn't exist.

**Called from:** `create-memo.html` real-time preview display

---

## User Functions

### `authenticateUser(email, password)` — Lines 310–318

Wraps Firebase Auth sign-in.

**Firebase Operation:**
```javascript
signInWithEmailAndPassword(auth, email, password)
```

**Returns:** Firebase `UserCredential` object.

**Called from:** `index.html` login form

---

### `getUserData(email)` — Lines 320–364

Fetches user data from Firestore `users` collection by email. If the user document doesn't exist yet, **auto-creates** it.

**Firestore Query:**
```javascript
query(collection(db, 'users'), where('email', '==', email))
```

**Auto-creation logic (when no doc found):**
- Infers department from email domain:
  - `@ord` in email → `ORD`
  - `@rod` in email → `ROD`
  - `@fasd` in email → `FASD`
  - `@tesda.gov.ph` → `Administration`
  - Default → `ORD`
- Sets role to `admin` if `@tesda.gov.ph`, else `user`

**Returns:** User data object `{ email, username, department, role }`.

**Called from:** `index.html` after successful login

---

### `logoutUser()` — Lines 366–373

```javascript
signOut(auth)
```

**Called from:** All dashboards (logout button)

---

### `initializeUsers()` — Lines 375–418

Seeds the `users` collection with the 4 base accounts if they don't already exist.

**Users seeded:**
```javascript
[
  { email: 'ord7.communication@gmail.com', department: 'ORD', role: 'user' },
  { email: 'region7.rod@gmail.com', department: 'ROD', role: 'user' },
  { email: 'region7.fasd@gmail.com', department: 'FASD', role: 'user' },
  { email: 'region7@tesda.gov.ph', department: 'Administration', role: 'admin' }
]
```

**Check before insert:**
```javascript
query(collection(db, 'users'), where('email', '==', user.email))
// Only adds if result is empty
```

**Called from:** `init-users.html`

---

## Analytics Functions

### `incrementAnalyticsCounter(type)` — Lines 420–455

Tracks usage — called automatically by read/write operations.

**Parameter `type`:** `'read'` or `'write'`

**Firestore Transaction on `analytics/global`:**
- If `lastUpdated` date differs from today → resets `todayReads`/`todayWrites` to 0
- Increments `totalReads` + `todayReads` (for reads) or `totalWrites` + `todayWrites` (for writes)
- Sets `lastUpdated` to current timestamp

```javascript
// Document structure updated:
{
  totalReads: N,
  todayReads: N,
  totalWrites: N,
  todayWrites: N,
  lastUpdated: Timestamp
}
```

**Called from:** Internally by `createMemo`, `getMemosByDepartment`, `getAllMemos`

---

## PDF Upload Functions

### `uploadPDF(memoId, file, onProgress)` — Lines 457–578

Uploads a PDF to Firebase Storage and updates the corresponding Firestore memo document.

**Validation (before upload):**
- File type must be `application/pdf`
- File size must be ≤ 10MB (10 × 1024 × 1024 bytes)

**Filename Sanitization:**
```javascript
sanitizedFilename = file.name
  .replace(/\s+/g, '_')        // spaces → underscores
  .replace(/[^a-zA-Z0-9._-]/g, '') // remove special chars
```

**Storage Path:**
```
memos/{memoId}/{sanitizedFilename}
```

**Upload Method:** `uploadBytesResumable` (resumable, tracks progress)

**Progress Callback:**
```javascript
onProgress({ progress: percentage, state: 'running' | 'paused' | 'error' })
```

**After successful upload:**
```javascript
// Updates Firestore memo with:
updateDoc(doc(db, 'memos', memoId), {
  pdfUrl: downloadURL,
  pdfUploadedAt: serverTimestamp(),
  pdfFileName: sanitizedFilename
})
```

**Error Handling:**
- `storage/unauthorized` → permission denied message
- `storage/canceled` → upload canceled message
- `storage/unknown` → generic unknown error
- Non-PDF file → validation error before upload starts
- File > 10MB → validation error before upload starts

**Returns:** `{ downloadURL, fileName }` on success.

**Called from:** `admin-dashboard.html` PDF upload section, `upload.html`, `upload-test.html`

---

## Exports

```javascript
export {
  db, auth, storage,
  createMemo, getMemosByDepartment, getAllMemos,
  updateMemoStatus, deleteMemoFromFirestore,
  deleteActivityLogsForMemos, cleanupOrphanedActivityLogs,
  getNextMemoNumber, getCurrentMemoNumber,
  authenticateUser, getUserData, logoutUser, initializeUsers,
  incrementAnalyticsCounter,
  uploadPDF
}
```
