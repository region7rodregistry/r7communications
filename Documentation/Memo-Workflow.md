# Memo Workflow — End-to-End Lifecycle

This document traces a memo from the moment it is created to when it is archived, covering every Firestore write, status transition, and user action along the way.

---

## Lifecycle Overview

```
[User] Create Memo (create-memo.html)
          ↓
       status: pending
          ↓
[Admin] Review Pending Memos (admin-dashboard.html)
          ↓
       status: signed
          ↓
[Admin] Approve and Release (admin-dashboard.html)
          ↓
       status: approved
          ↓
[Dept User] View and Mark as Received (user-dashboard.html)
          ↓
       receivedAt + receivedBy recorded
          ↓
[Admin] Archive or Cancel (admin-dashboard.html)
          ↓
       status: archived / cancelled
```

---

## Stage 1 — Memo Creation

**Page:** `create-memo.html`  
**Actor:** Any authenticated user

### Steps

1. User selects memo type (PO, CO, Office Order, etc.)
2. System displays next available memo number in real time (from `memoNumbers` collection)
3. User fills in title, description, recipients, signatory, and author
4. *(Optional)* User enables antedation and picks a historical date
5. User clicks "Submit"
6. System validates all fields
7. For non-antedated memos: `getNextMemoNumber()` atomically increments the counter
8. `createMemo()` writes to Firestore `memos` collection with `status: 'pending'`
9. `logMemoActivity()` writes to `memoActivities` with action `"Memo created"`
10. Success modal shows the generated memo number
11. User is redirected to their department dashboard

### Firestore Writes at This Stage

| Collection | Operation | Data Written |
|-----------|-----------|-------------|
| `memos` | `addDoc` | Full memo object, `status: 'pending'` |
| `memoNumbers/{docId}` | `runTransaction` (update) | `number: currentNumber + 1` (non-antedated only) |
| `memoActivities` | `addDoc` | `{ memoId, action: 'Memo created', username, timestamp }` |

---

## Stage 2 — Admin Review (Pending → Signed)

**Page:** `admin-dashboard.html`  
**Actor:** Admin user  
**Tab:** Pending Memos

### Steps

1. Admin sees memo in the Pending tab
2. Admin reviews memo details (can click row to expand)
3. Admin clicks "Change Status" button
4. Modal shows: current status `pending`, new status dropdown
5. Admin selects `signed`, enters password for verification
6. Password is re-verified via Firebase Auth
7. `updateMemoStatus(memoId, 'signed')` updates Firestore
8. `logMemoActivity()` records `"Status changed from pending to signed"`
9. Memo moves to Signed tab

### Firestore Writes at This Stage

| Collection | Operation | Data Written |
|-----------|-----------|-------------|
| `memos/{memoId}` | `updateDoc` | `{ status: 'signed', updatedAt: serverTimestamp() }` |
| `memoActivities` | `addDoc` | `{ memoId, action: 'Status changed from pending to signed', username, timestamp }` |

---

## Stage 3 — Admin Approval (Signed → Approved)

**Page:** `admin-dashboard.html`  
**Actor:** Admin user  
**Tab:** Signed Memos

### Steps

1. Admin reviews signed memos
2. Admin changes status to `approved`
3. Admin may click "Release to ROD/FASD" to formally distribute
4. `updateMemoStatus(memoId, 'approved')` updates Firestore
5. `releaseToRodFasd()` records release metadata
6. Activity log entry added

### Firestore Writes at This Stage

| Collection | Operation | Data Written |
|-----------|-----------|-------------|
| `memos/{memoId}` | `updateDoc` | `{ status: 'approved', updatedAt: serverTimestamp() }` |
| `memos/{memoId}` | `updateDoc` | `{ releasedAt: serverTimestamp(), releasedBy: email }` |
| `memoActivities` | `addDoc` | `{ memoId, action: 'Status changed from signed to approved', ... }` |

---

## Stage 4 — Department User Receives Memo

**Page:** `user-dashboard.html`  
**Actor:** Department user (ROD, FASD, ORD)  
**Tab:** Approved or Signed Memos

### Steps

1. User's real-time listener (`onSnapshot`) automatically shows the newly approved memo
2. User views memo details
3. User clicks "Mark as Received"
4. Confirmation modal asks for receiver's name
5. `markAsReceived()` updates the Firestore document with receipt info

### Firestore Writes at This Stage

| Collection | Operation | Data Written |
|-----------|-----------|-------------|
| `memos/{memoId}` | `updateDoc` | `{ receivedAt: serverTimestamp(), receivedBy: name }` |

---

## Stage 5 — Archival or Cancellation

**Page:** `admin-dashboard.html`  
**Actor:** Admin user

### Archive Path

1. Admin changes memo status to `archived` via status change modal
2. Memo appears in Archive tab

### Cancel Path

1. Admin changes status to `cancelled`
2. Memo moves to Cancelled tab

### Firestore Writes at This Stage

| Collection | Operation | Data Written |
|-----------|-----------|-------------|
| `memos/{memoId}` | `updateDoc` | `{ status: 'archived' \| 'cancelled', updatedAt: serverTimestamp() }` |
| `memoActivities` | `addDoc` | `{ memoId, action: 'Status changed to archived/cancelled', ... }` |

---

## Memo Deletion

Deletion can occur at any stage (admin only).

### Firestore Operations (Cascading Delete)

```
1. Query memoActivities where memoId == id → delete all matching docs
2. Delete doc from memos collection
```

```javascript
// In firebase-config.js → deleteMemoFromFirestore(memoId)
const logsQuery = query(collection(db, 'memoActivities'), where('memoId', '==', memoId));
const logs = await getDocs(logsQuery);
await Promise.all(logs.docs.map(log => deleteDoc(doc(db, 'memoActivities', log.id))));
await deleteDoc(doc(db, 'memos', memoId));
```

---

## Antedated Memo Creation (Alternative Path)

When a memo needs to be filed under a historical date:

1. User enables antedation toggle
2. User picks a past date (max: yesterday)
3. System queries all existing memos of the selected type
4. System finds the correct base number and next letter suffix
5. Generated number format: `PO-2024-ORD-0010A` (suffix A, B, C, ... AA, AB, ...)
6. The counter in `memoNumbers` is **NOT incremented**
7. `createdAt` is set to the antedation date (not server time)

---

## PDF Attachment (Optional, Any Stage)

Admin can attach a PDF to any memo at any point:

1. Admin opens PDF upload panel in admin dashboard
2. Selects memo, drags or picks PDF file
3. `uploadPDF(memoId, file, onProgress)` uploads to Firebase Storage
4. On complete, Firestore memo is updated:
```javascript
updateDoc(doc(db, 'memos', memoId), {
  pdfUrl: downloadURL,
  pdfFileName: sanitizedName,
  pdfUploadedAt: serverTimestamp()
})
```
5. Memo detail view shows PDF download link

---

## Status Transition Summary

| From | To | Actor | Page |
|------|----|-------|------|
| *(new)* | `pending` | Department user | create-memo.html |
| `pending` | `signed` | Admin | admin-dashboard.html |
| `signed` | `approved` | Admin | admin-dashboard.html |
| `approved` | `archived` | Admin | admin-dashboard.html |
| Any | `cancelled` | Admin | admin-dashboard.html |
| Any | *(deleted)* | Admin | admin-dashboard.html |

---

## Real-Time Updates

Because `getMemosByDepartment()` and the admin dashboard use Firestore `onSnapshot` listeners, every status change made by an admin is **instantly visible** to the department user without a page refresh.

- Admin changes `pending` → `signed`: User's Pending tab loses the memo; Signed tab gains it — live.
- Admin approves: Approved tab gains the memo — live.
- Admin uploads PDF: The PDF link appears in the user's view — live.
