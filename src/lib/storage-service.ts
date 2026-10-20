import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject, getBlob,
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
  const memoRef = doc(db, 'memos', memo.id)
  await updateDoc(memoRef, { pdfUrl: null, pdfUploadedAt: null, pdfFileName: null })
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
