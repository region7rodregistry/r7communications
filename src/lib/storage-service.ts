import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { doc, updateDoc } from 'firebase/firestore'
import { storage, auth, db } from './firebase'

export interface UploadProgress {
  percent: number
  bytesTransferred: number
  totalBytes: number
}

export async function uploadPDF(
  memoId: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
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
          const memoRef = doc(db, 'memos', memoId)
          await updateDoc(memoRef, {
            pdfUrl: downloadURL,
            pdfUploadedAt: new Date(),
            pdfFileName: sanitizedName,
          })
          resolve(downloadURL)
        } catch (err) {
          reject(err)
        }
      }
    )
  })
}

export async function deletePDF(memoId: string, fileName: string): Promise<void> {
  const { ref: storageRef, deleteObject } = await import('firebase/storage')
  const fileRef = storageRef(storage, `memos/${memoId}/${fileName}`)
  await deleteObject(fileRef)
  const memoRef = doc(db, 'memos', memoId)
  await updateDoc(memoRef, { pdfUrl: null, pdfUploadedAt: null, pdfFileName: null })
}
