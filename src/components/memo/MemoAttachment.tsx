'use client'

import { useState } from 'react'
import { FileText, ExternalLink, Download, Upload, Trash2, Loader2, Paperclip } from 'lucide-react'
import { deletePDF, downloadPDF } from '@/lib/storage-service'
import { logMemoActivity } from '@/lib/memo-service'
import { formatDateTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/contexts/AuthContext'
import { PdfUpload } from './PdfUpload'
import type { Memo } from '@/types'

interface MemoAttachmentProps {
  memo: Memo
  canManage: boolean
  onChanged: () => void
}

export function MemoAttachment({ memo, canManage, onChanged }: MemoAttachmentProps) {
  const { userData } = useAuth()
  const { toast } = useToast()
  const [replacing, setReplacing] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const hasPdf = !!memo.pdfUrl
  const saveAs = `${memo.memoNumber || 'memo'}.pdf`

  const handleUploaded = () => {
    toast({ title: hasPdf ? 'PDF replaced' : 'PDF attached', variant: 'success' })
    setReplacing(false)
    onChanged()
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await downloadPDF(memo, saveAs)
    } catch {
      toast({ title: 'Could not download the PDF', variant: 'error' })
    } finally {
      setDownloading(false)
    }
  }

  const handleRemove = async () => {
    try {
      await deletePDF(memo)
      await logMemoActivity(memo.id, 'PDF removed', userData?.username || userData?.email || 'admin')
      toast({ title: 'PDF removed', variant: 'success' })
      onChanged()
    } catch (err: any) {
      toast({ title: 'Could not remove the PDF', description: err?.message, variant: 'error' })
    }
  }

  return (
    <>
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-gray-400" />
            Attachment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasPdf && (
            <div className="rounded-lg border border-blue-100 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3 space-y-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-10 w-10 shrink-0 rounded-lg bg-white dark:bg-gray-900 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={memo.pdfFileName || saveAs}>
                    {memo.pdfFileName || saveAs}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {memo.pdfUploadedAt ? `Uploaded ${formatDateTime(memo.pdfUploadedAt)}` : 'PDF document'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button asChild size="sm">
                  <a href={memo.pdfUrl!} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open PDF
                  </a>
                </Button>
                <Button variant="outline" size="sm" onClick={() => void handleDownload()} disabled={downloading}>
                  {downloading
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Download className="h-3.5 w-3.5" />}
                  Download
                </Button>
              </div>
            </div>
          )}

          {!hasPdf && !canManage && (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">No PDF attached yet.</p>
          )}

          {canManage && hasPdf && !replacing && (
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setReplacing(true)}>
                <Upload className="h-3.5 w-3.5" />
                Replace
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                onClick={() => setConfirmRemove(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
            </div>
          )}

          {canManage && (!hasPdf || replacing) && (
            <div className="space-y-2">
              <PdfUpload
                memoId={memo.id}
                onUploaded={handleUploaded}
                onError={(err) => toast({ title: 'Upload failed', description: err, variant: 'error' })}
              />
              {replacing && (
                <Button variant="ghost" size="sm" onClick={() => setReplacing(false)}>
                  Cancel
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmModal
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={handleRemove}
        title="Remove PDF"
        description="The attached PDF will be deleted from storage. You can upload a new one afterwards."
        confirmLabel="Remove"
        variant="danger"
      />
    </>
  )
}
