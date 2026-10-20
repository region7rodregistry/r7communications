import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject, getBlob, listAll, getMetadata,
  type StorageReference,
} from 'firebase/storage'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { storage, auth, db } from './firebase'
import type { Memo } from '@/types'

export interface UploadProgress {
  percent: number
  bytesTransferred: number
  totalBytes: number
}

export interface UploadResult {
  url: string
  fileName: string
}

type MemoPdf = Pick<Memo, 'id' | 'pdfFileName' | 'pdfUrl'>

export interface StoragePdf {
  url: string
  fileName: string
  uploadedAt: Date
}

export interface RelinkResult {
  checked: number
  linked: number
  failed: number
  orphanedFolders: string[]
}

// Resolves the Storage object behind a memo's PDF. Older memos may only have pdfUrl.
function memoPdfRef(memoId: string, fileName?: string | null, url?: string | null): StorageReference | null {
  if (fileName) return ref(storage, `memos/${memoId}/${fileName}`)
  if (url) {
    try {
      return ref(storage, url)
    } catch {
      return null
    }
  }
  return null
}

async function deleteIfExists(fileRef: StorageReference): Promise<void> {
  try {
    await deleteObject(fileRef)
  } catch (err: any) {
    if (err?.code !== 'storage/object-not-found') throw err
  }
}

export async function uploadPDF(
  memoId: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('User not authenticated. Please log in again.')

  // Refresh token
  try {
    await currentUser.getIdToken(true)
  } catch {
    // Continue — token might still be valid
  }

  if (!file || file.type !== 'application/pdf') {
    throw new Error('Only PDF files are allowed.')
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File exceeds 10MB limit.')
  }

  // Check the memo exists before uploading so a mistyped ID doesn't leave an orphaned file
  const memoRef = doc(db, 'memos', memoId)
  const memoSnap = await getDoc(memoRef)
  if (!memoSnap.exists()) throw new Error('Memo not found. Check the memo ID and try again.')
  const previous = memoSnap.data() as Partial<Memo>

  const sanitizedName = file.name
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '')

  const storageRef = ref(storage, `memos/${memoId}/${sanitizedName}`)
  const uploadTask = uploadBytesResumable(storageRef, file)

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        onProgress?.({ percent, bytesTransferred: snapshot.bytesTransferred, totalBytes: snapshot.totalBytes })
      },
      (error) => {
        const messages: Record<string, string> = {
          'storage/unauthorized': 'Access denied. Please check your authentication.',
          'storage/quota-exceeded': 'Storage quota exceeded. Contact administrator.',
          'storage/canceled': 'Upload was canceled.',
          'storage/unknown': 'Unknown error. Check your internet connection.',
          'storage/invalid-checksum': 'File corruption detected. Try uploading again.',
          'storage/retry-limit-exceeded': 'Upload failed after multiple attempts.',
        }
        reject(new Error(messages[error.code] || `Upload failed: ${error.message}`))
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
          await updateDoc(memoRef, {
            pdfUrl: downloadURL,
            pdfUploadedAt: new Date(),
            pdfFileName: sanitizedName,
          })

          // Replacing with a differently named file: remove the old one so it isn't left behind
          const previousRef = memoPdfRef(memoId, previous.pdfFileName, previous.pdfUrl)
          if (previousRef && previousRef.fullPath !== storageRef.fullPath) {
            await deleteIfExists(previousRef).catch(() => {})
          }

          resolve({ url: downloadURL, fileName: sanitizedName })
        } catch (err) {
          reject(err)
        }
      }
    )
  })
}

export async function deletePDF(memo: MemoPdf): Promise<void> {
  const fileRef = memoPdfRef(memo.id, memo.pdfFileName, memo.pdfUrl)
  if (fileRef) await deleteIfExists(fileRef)
  // Clear older copies too, otherwise the Storage fallback would bring one back
  const { items } = await listAll(ref(storage, `memos/${memo.id}`))
  await Promise.all(items.filter((item) => item.name.toLowerCase().endsWith('.pdf')).map(deleteIfExists))
  const memoRef = doc(db, 'memos', memo.id)
  await updateDoc(memoRef, { pdfUrl: null, pdfUploadedAt: null, pdfFileName: null })
}

// The old system sometimes saved the file to Storage without writing pdfUrl to the memo.
// Returns the newest PDF in the memo's folder, or null if there is none.
export async function findStoragePdf(memoId: string): Promise<StoragePdf | null> {
  const { items } = await listAll(ref(storage, `memos/${memoId}`))
  const pdfs = items.filter((item) => item.name.toLowerCase().endsWith('.pdf'))
  if (!pdfs.length) return null

  const withMeta = await Promise.all(pdfs.map(async (item) => ({ item, meta: await getMetadata(item) })))
  withMeta.sort((a, b) => new Date(b.meta.timeCreated).getTime() - new Date(a.meta.timeCreated).getTime())
  const newest = withMeta[0]

  return {
    url: await getDownloadURL(newest.item),
    fileName: newest.item.name,
    uploadedAt: new Date(newest.meta.timeCreated),
  }
}

export async function linkStoragePdf(memoId: string, pdf: StoragePdf): Promise<void> {
  await updateDoc(doc(db, 'memos', memoId), {
    pdfUrl: pdf.url,
    pdfFileName: pdf.fileName,
    pdfUploadedAt: pdf.uploadedAt,
  })
}

// Scans every memo folder in Storage and writes the PDF link onto memos that are missing it.
// Folders whose memo no longer exists are reported, not deleted.
export async function relinkStoragePdfs(
  memos: MemoPdf[],
  onProgress?: (done: number, total: number) => void
): Promise<RelinkResult> {
  const { prefixes } = await listAll(ref(storage, 'memos'))
  const byId = new Map(memos.map((m) => [m.id, m]))

  const orphanedFolders = prefixes.filter((p) => !byId.has(p.name)).map((p) => p.name)
  const toCheck = prefixes.filter((p) => byId.has(p.name) && !byId.get(p.name)!.pdfUrl).map((p) => p.name)

  let done = 0
  let linked = 0
  let failed = 0
  const queue = [...toCheck]
  onProgress?.(0, toCheck.length)

  const worker = async () => {
    while (queue.length) {
      const memoId = queue.shift()!
      try {
        const pdf = await findStoragePdf(memoId)
        if (pdf) {
          await linkStoragePdf(memoId, pdf)
          linked++
        }
      } catch {
        failed++
      }
      onProgress?.(++done, toCheck.length)
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker))

  return { checked: toCheck.length, linked, failed, orphanedFolders }
}

// Saves the PDF under a readable name. If the browser can't fetch it directly
// (e.g. Storage CORS not configured for this origin), opens it in a new tab instead.
export async function downloadPDF(memo: MemoPdf, saveAs: string): Promise<void> {
  const fileRef = memoPdfRef(memo.id, memo.pdfFileName, memo.pdfUrl)
  try {
    if (!fileRef) throw new Error('No PDF attached.')
    const blob = await getBlob(fileRef)
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = saveAs
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  } catch (err) {
    if (!memo.pdfUrl) throw err
    window.open(memo.pdfUrl, '_blank', 'noopener,noreferrer')
  }
}
