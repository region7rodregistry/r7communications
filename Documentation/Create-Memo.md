# Create Memo — `create-memo.html`

**File:** `create-memo.html`  
**Lines:** ~1,481  
**Access:** All authenticated users  
**Purpose:** Create new memos with auto-generated memo numbers, with optional antedation support.

---

## Page Load Sequence

1. Read `currentUser` from `localStorage` — redirect to `index.html` if missing
2. Determine department code from user's department
3. Set up real-time memo number preview via Firestore `onSnapshot`
4. Initialize form field character counters
5. Attach all form event handlers

---

## Form Fields

| Field | Type | Required | Constraints |
|-------|------|----------|------------|
| Memo Type | Select | Yes | PO, CO, Office Order, Advisory, Advisory Bulletin, Bulletin, Acknowledgment |
| Antedation Toggle | Checkbox | No | Reveals date picker when enabled |
| Antedation Date | Date Picker | Conditional | Required if antedation enabled; max date = yesterday |
| Memo Number | Display (read-only) | — | Auto-generated and displayed live |
| Title | Text Input | Yes | Max 200 characters |
| Description | Textarea | No | Max 500 characters |
| Recipients | Select / Text | Yes | Predefined options or custom "Others" entry |
| Signatory | Select / Text | Yes | Predefined options or custom entry |
| Author / Focal Person | Select / Text | Yes | Predefined options or custom entry |

---

## Memo Number Preview

The memo number preview updates **in real-time** as the user selects a memo type.

**Firestore Query (via `onSnapshot`):**
```javascript
onSnapshot(doc(db, 'memoNumbers', docId), (snap) => {
  const number = snap.exists() ? snap.data().number : 0;
  displayMemoNumber(number);
});
```

**Number Format:**
```
{MemoType}-{Year}-{DeptCode}-{PaddedNumber}
e.g. PO-2025-ORD-0042
```

The preview shows only the last two segments (`ORD-0042`) in the form UI.  
The full formatted string is used in the Firestore document.

---

## Memo Type to Firestore Document Mapping

| Memo Type in Form | Firestore `memoNumbers` Doc ID |
|------------------|-------------------------------|
| PO | `current` |
| CO | `coCurrent` |
| Office Order | `officeOrder` |
| Advisory | `advisory` |
| Advisory Bulletin | `advisoryBulletin` |
| Bulletin | `bulletin` |
| Acknowledgment | `acknowledgment` |

---

## Character Counters

Both `title` and `description` fields show live character counts:

- **Title:** max 200 chars — counter turns red at 190+
- **Description:** max 500 chars — counter turns red at 490+

```javascript
titleInput.addEventListener('input', () => {
  const remaining = 200 - titleInput.value.length;
  titleCounter.textContent = `${remaining} characters remaining`;
  titleCounter.classList.toggle('text-red-500', remaining < 10);
});
```

---

## Recipients / Signatory / Author Fields

These three fields share the same pattern:

1. Default: A `<select>` dropdown with predefined names
2. If user selects "Others": The select is replaced with a `<input type="text">` for free-form entry
3. A "Back to Select" button reverts to the dropdown

```javascript
if (recipientsSelect.value === 'Others') {
  recipientsSelect.classList.add('hidden');
  recipientsText.classList.remove('hidden');
  backToSelectBtn.classList.remove('hidden');
}
```

---

## Antedation System

### What Is Antedation?

Antedated memos are memos created today but assigned a **past date**. The memo number reflects the historical date and includes a letter suffix to distinguish it from other memos on that date.

### Toggle Behavior

When the antedation checkbox is checked:
- The date picker appears (max = yesterday)
- The memo number preview switches to antedated numbering logic
- On form submit, `isAntedated` is stored as `true` and `createdAt` is set to the antedation date

---

### `getNextAntedatedMemoNumber(memoType, selectedDate)` — Lines 668–762

Determines the correct antedated memo number by examining existing memos.

**Steps:**
1. Query all memos of the selected type:
```javascript
query(collection(db, 'memos'), where('memoType', '==', memoType))
```
2. Filter for memos that match the selected antedation date
3. **If memos exist for that date** → call `getNextSuffixForExistingDate()`
4. **If no memos for that date** → call `findLatestPreviousMemo()` to get the base number, then call `generateNextSuffixFromBase()`
5. **If no previous memos at all** → use `0001A` as the starting number

---

### `findLatestPreviousMemo(allMemos, selectedDate)` — Line 765

Scans all memos and returns the one with the highest `createdAt` that is still **before** the selected antedation date.

```javascript
// Finds: max(memo.createdAt) where createdAt < selectedDate
```

Used to establish the base number for the antedated memo.

---

### `generateNextSuffixFromBase(baseMemoNumber, memoType, year, departmentCode)` — Line 823

Given a base memo number (e.g. `PO-2025-ORD-0041`), generates the next available suffixed version (e.g. `PO-2025-ORD-0041A`, `PO-2025-ORD-0041B`, etc.).

1. Queries all memos to find existing suffixed versions of the base number
2. Finds the highest existing suffix
3. Returns next suffix using `indexToSuffix(highestIndex + 1)`

---

### `getNextSuffixForExistingDate(memosForDate, memoType, year, departmentCode)` — Line 901

Handles the case where memos already exist for the antedation date.

1. Extracts all base numbers and suffixes from memos on that date
2. Groups by base number
3. Finds the latest base number and its highest suffix
4. Returns the next available suffix

---

### Suffix Conversion Helpers

#### `suffixToIndex(suffix)` — Line 645

Converts letter suffixes to zero-based index:
```
A → 0
B → 1
Z → 25
AA → 26
AB → 27
```

#### `indexToSuffix(index)` — Line 655

Inverse of the above:
```
0 → A
25 → Z
26 → AA
27 → AB
```

Uses base-26 encoding with letters A–Z.

---

### `validateMemoNumberUniqueness(generatedMemoNumber, memoType)` — Line 966

Final safety check before form submission:

```javascript
query(
  collection(db, 'memos'),
  where('memoNumber', '==', generatedMemoNumber),
  where('memoType', '==', memoType)
)
```

If the query returns any results, the generated number is already taken and an error is shown.

---

## Form Submission — Lines 1033–1207

### Pre-submit Checks
1. Validate all required fields are filled
2. Check `auth.currentUser` is not null (session still valid)
3. Validate memo number uniqueness (antedated only)

### Memo Object Assembled

```javascript
{
  title: titleInput.value.trim(),
  description: descriptionInput.value.trim(),
  department: currentUser.department,
  recipients: recipientsValue,
  authorFocal: authorFocalValue,
  signatory: signatoryValue,
  createdBy: auth.currentUser.email,
  memoType: memoTypeSelect.value,
  memoNumber: generatedMemoNumber,
  isAntedated: isAntedated,
  antedationDate: isAntedated ? antedationDateInput.value : null,
  status: 'pending'
}
```

### Memo Counter Increment

- For **normal memos**: `getNextMemoNumber(memoType)` is called — atomically increments the counter
- For **antedated memos**: Counter is **NOT incremented** — antedated numbers use suffix logic instead

### Firestore Write

```javascript
createMemo(memoObject)
// → addDoc(collection(db, 'memos'), { ...memoObject, createdAt: ... })
```

### Activity Log

```javascript
addDoc(collection(db, 'memoActivities'), {
  memoId: newMemo.id,
  action: 'Memo created',
  username: auth.currentUser.email,
  timestamp: serverTimestamp()
})
```

---

## Success Modal — Lines 1213–1301

After successful memo creation, a modal displays:

- The generated memo number (large, bold)
- A 10-second countdown before auto-redirect
- "Continue to Dashboard" button — immediate redirect
- "Create Another" button — resets and closes modal

**Auto-redirect countdown:**
```javascript
let countdown = 10;
const timer = setInterval(() => {
  countdownEl.textContent = countdown--;
  if (countdown < 0) {
    clearInterval(timer);
    redirectToDashboard();
  }
}, 1000);
```

**Keyboard support:** `Escape` key closes the modal.  
**Click outside:** Clicking the modal backdrop closes it.

---

## Redirect Logic — Lines 1272–1275

After memo creation:

| Department | Redirect |
|-----------|---------|
| ORD | `ord-dashboard.html` |
| ROD, FASD, Administration | `user-dashboard.html` |

---

## Firestore Queries Summary

| Operation | Collection | Method | When |
|-----------|-----------|--------|------|
| Read memo number (preview) | `memoNumbers` | `onSnapshot` | On page load + memo type change |
| Read all memos of a type (antedation) | `memos` | `getDocs` | When antedation date is selected |
| Check memo number uniqueness | `memos` | `getDocs` | On form submit (antedated only) |
| Increment memo counter | `memoNumbers` | `runTransaction` | On form submit (non-antedated) |
| Create memo | `memos` | `addDoc` | On form submit |
| Log activity | `memoActivities` | `addDoc` | After successful memo creation |
