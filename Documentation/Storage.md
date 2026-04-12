# Firebase Storage — PDF Uploads

**Files involved:** `firebase-config.js`, `admin-dashboard.html`, `upload.html`, `upload-test.html`, `cors.json`  
**Firebase Service:** Firebase Storage (bucket: `ro7mbms.firebasestorage.app`)

---

## Storage Structure

```
Firebase Storage Bucket: ro7mbms.firebasestorage.app
│
└── memos/
    └── {memoId}/
        └── {sanitized_filename}.pdf
```

Each memo has its own folder identified by its Firestore document ID. Only one PDF is expected per memo, but the structure allows for multiple files.

---

## Upload Function — `uploadPDF(memoId, file, onProgress)`

**Location:** `firebase-config.js`, Lines 457–578

### Pre-upload Validation

| Check | Rule | Error if Fails |
|-------|------|---------------|
| File type | Must be `application/pdf` | "Only PDF files are allowed" |
| File size | Must be ≤ 10MB (10 × 1024 × 1024 bytes) | "File size must be less than 10MB" |

### Filename Sanitization

Before upload, the filename is sanitized to avoid path or storage issues:

```javascript
const sanitizedFilename = file.name
  .replace(/\s+/g, '_')              // Replace spaces with underscores
  .replace(/[^a-zA-Z0-9._-]/g, ''); // Remove all non-alphanumeric chars except . _ -
```

**Examples:**
- `My Memo 2025.pdf` → `My_Memo_2025.pdf`
- `PO-2025-ORD-0001 (final).pdf` → `PO-2025-ORD-0001_final.pdf`

### Storage Path

```javascript
const storageRef = ref(storage, `memos/${memoId}/${sanitizedFilename}`);
```

### Upload Method

```javascript
const uploadTask = uploadBytesResumable(storageRef, file);
```

`uploadBytesResumable` is used instead of `uploadBytes` because it:
- Supports real-time progress tracking
- Allows pause/resume if needed
- Handles network interruptions more gracefully

### Progress Callback

```javascript
uploadTask.on('state_changed',
  (snapshot) => {
    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
    onProgress({ progress, state: snapshot.state });
  },
  (error) => { /* handle errors */ },
  async () => {
    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
    // Update Firestore
  }
);
```

The `onProgress` callback receives `{ progress: 0–100, state: 'running' | 'paused' | 'error' }`.

### Firestore Update on Complete

After successful upload, the memo document is updated:

```javascript
updateDoc(doc(db, 'memos', memoId), {
  pdfUrl: downloadURL,
  pdfUploadedAt: serverTimestamp(),
  pdfFileName: sanitizedFilename
})
```

### Error Handling

| Firebase Storage Error Code | Message |
|---------------------------|---------|
| `storage/unauthorized` | "You don't have permission to upload files" |
| `storage/canceled` | "Upload was canceled" |
| `storage/unknown` | "An unknown error occurred during upload" |

### Return Value

On success:
```javascript
{ downloadURL: string, fileName: string }
```

---

## Upload UI (Admin Dashboard)

The admin dashboard includes a full-featured upload UI:

| Element | Description |
|---------|-------------|
| Drag-and-drop zone | Drop PDF onto the dashed border area |
| File input | Hidden `<input type="file" accept=".pdf">` triggered by zone click |
| Progress bar | Fills 0–100% as upload progresses |
| Percentage label | Shows exact progress percentage |
| Cancel button | Cancels in-progress upload |
| Retry button | Appears on error |
| File info | Shows filename and file size |
| Success state | Shows download link after completion |

---

## Upload Test Page — `upload-test.html`

Development tool for testing the upload flow with detailed log output.

**Features:**
- Drag-and-drop zone
- Detailed log console in the page (info / success / error / warning entries)
- Log entries color-coded: blue (info), green (success), red (error), yellow (warning)
- Timestamps on each log entry
- "Clear Logs" button
- Tests the complete `uploadPDF()` flow

---

## Simple Upload Page — `upload.html`

Minimal upload utility:
- File input for PDF selection
- Custom filename input
- Upload button
- Displays resulting download URL
- Optional: creates a Firestore record for the uploaded file

---

## Bulk PDF Download — `download-all-pdfs-example.html`

Downloads all memo PDFs as a single ZIP file.

**Implementation:**

```javascript
// 1. Fetch all memos
const memos = await getAllMemos();

// 2. Filter for memos with PDF
const memosWithPDF = memos.filter(m => m.pdfUrl);

// 3. Create ZIP
const zip = new JSZip();

// 4. Fetch each PDF and add to ZIP
for (const memo of memosWithPDF) {
  const response = await fetch(memo.pdfUrl);
  const blob = await response.blob();
  zip.file(memo.pdfFileName || `${memo.memoNumber}.pdf`, blob);
}

// 5. Generate and download
const zipBlob = await zip.generateAsync({ type: 'blob' });
saveAs(zipBlob, `memos-pdfs-${Date.now()}.zip`);
```

**Requires:** JSZip 3.10.1 (CDN)

---

## CORS Configuration — `cors.json`

Firebase Storage requires CORS rules so browsers can fetch files from the bucket.

### File Location
`cors.json` in the project root.

### CORS Rules

```json
[
  {
    "origin": [
      "https://r7communications.vercel.app",
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "http://localhost:3000"
    ],
    "method": ["GET", "HEAD"],
    "responseHeader": [
      "Content-Type",
      "Content-Length",
      "Content-Disposition"
    ],
    "maxAgeSeconds": 3600
  }
]
```

### Applying CORS Rules

To apply these rules to the Firebase Storage bucket, run:

```bash
gsutil cors set cors.json gs://ro7mbms.firebasestorage.app
```

This requires the Google Cloud SDK (`gsutil`) and appropriate Firebase project permissions.

### CORS Verification — `verify-cors.html`

A verification page (`verify-cors.html`) is included to test whether CORS is correctly configured.

**What it does:**
- Makes a test `fetch()` request to Firebase Storage
- Reports success or failure with status details
- Displays setup instructions if CORS is not configured

---

## CORS Setup Documentation Files

The project includes several CORS setup guides:

| File | Purpose |
|------|---------|
| `CORS_SETUP_INSTRUCTIONS.md` | General CORS setup steps |
| `FIREBASE_STORAGE_CORS_SETUP.md` | Firebase-specific CORS configuration |
| `SETUP_CORS_DETAILED.md` | Detailed step-by-step with screenshots |

These are reference documents, not code — they exist to guide deployment configuration.

---

## Storage Security

- Storage security rules are configured in the Firebase Console (not in this repo)
- The API key is exposed client-side — normal for Firebase web apps
- Access is controlled by Firebase Storage security rules (typically: authenticated users can upload, anyone with the URL can download)
- CORS rules only permit requests from the specified origins (production URL + local dev ports)
