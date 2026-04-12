'use client'

import { useRef, useState } from 'react'
import { Upload, FileText, Loader2, CheckCircle, X } from 'lucide-react'
import { uploadPDF } from '@/lib/storage-service'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PdfUploadProps {
  memoId: string
  currentPdfUrl?: string | null
  currentPdfName?: string | null
  onUploaded?: (url: string) => void
  onError?: (err: string) => void
}

export function PdfUpload({
  memoId, currentPdfUrl, currentPdfName, onUploaded, onError
}: PdfUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      onError?.('Only PDF files are allowed.')
      return
    }
    setSelectedFile(file)
    setUploading(true)
    setProgress(0)
    setDone(false)

    try {
      const url = await uploadPDF(memoId, file, ({ percent }) => {
        setProgress(Math.round(percent))
      })
      setDone(true)
      onUploaded?.(url)
    } catch (err: any) {
      onError?.(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        className={cn(
          'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer',
          dragging
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/10'
            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />

        {uploading ? (
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
        ) : done ? (
          <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
        ) : (
          <Upload className="h-8 w-8 text-gray-400 mb-2" />
        )}

        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {uploading ? `Uploading… ${progress}%` : done ? 'Upload complete!' : 'Drop PDF here or click to browse'}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">PDF only · Max 10MB</p>

        {selectedFile && !uploading && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
            <FileText className="h-3.5 w-3.5" />
            {selectedFile.name}
          </div>
        )}
      </div>

      {/* Progress bar */}
      {uploading && (
        <Progress value={progress} className="h-1.5" />
      )}

      {/* Current PDF */}
      {currentPdfUrl && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
          <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <a
            href={currentPdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-700 dark:text-blue-400 hover:underline truncate flex-1"
          >
            {currentPdfName || 'View PDF'}
          </a>
        </div>
      )}
    </div>
  )
}
