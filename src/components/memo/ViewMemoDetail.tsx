'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Printer, FileDown, Calendar, User, Building, Users, Tag, CheckCircle, Clock, PenLine, Archive, XCircle } from 'lucide-react'
import { getMemoById } from '@/lib/memo-service'
import { formatDate, formatDateTime } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ActivityTimeline } from './ActivityTimeline'
import { STATUS_COLORS } from '@/types'
import type { Memo } from '@/types'

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-yellow-600" />,
  signed: <PenLine className="h-4 w-4 text-blue-600" />,
  approved: <CheckCircle className="h-4 w-4 text-green-600" />,
  cancelled: <XCircle className="h-4 w-4 text-red-600" />,
  archived: <Archive className="h-4 w-4 text-gray-600" />,
}

const APPROVAL_STEPS = ['Created', 'Signed', 'Approved', 'Archived'] as const

function ApprovalTracker({ status }: { status: string }) {
  const stepIndex = {
    pending: 0, signed: 1, approved: 2, archived: 3, cancelled: -1,
  }[status] ?? 0

  if (status === 'cancelled') {
    return (
      <div className="flex items-center justify-center p-4 rounded-lg bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 text-sm font-medium gap-2">
        <XCircle className="h-4 w-4" /> This memo has been cancelled
      </div>
    )
  }

  return (
    <div className="flex items-center">
      {APPROVAL_STEPS.map((step, i) => (
        <div key={step} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i <= stepIndex
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                  : 'bg-gray-200 text-gray-400 dark:bg-gray-700'
              }`}
            >
              {i <= stepIndex ? <CheckCircle className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-xs mt-1 font-medium ${i <= stepIndex ? 'text-blue-600' : 'text-gray-400'}`}>
              {step}
            </span>
          </div>
          {i < APPROVAL_STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mb-5 mx-1 transition-colors ${i < stepIndex ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export function ViewMemoDetail({ memoId }: { memoId: string }) {
  const [memo, setMemo] = useState<Memo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMemoById(memoId)
      .then(setMemo)
      .finally(() => setLoading(false))
  }, [memoId])

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!memo) {
    return (
      <div className="text-center py-20 text-gray-400 dark:text-gray-600">
        <p className="text-lg font-medium mb-4">Memo not found</p>
        <Link href="/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 font-mono">
              {memo.memoNumber}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[memo.status]}`}>
                {statusIcons[memo.status]}
                {memo.status}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{memo.memoType}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">· {memo.department}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {memo.pdfUrl && (
            <a href={memo.pdfUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <FileDown className="h-4 w-4 mr-1.5" />
                PDF
              </Button>
            </a>
          )}
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1.5" />
            Print
          </Button>
        </div>
      </div>

      {/* Print header — only visible when printing */}
      <div className="hidden print:block border-b-2 border-black pb-4 mb-6">
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-gray-600 mb-1">Republic of the Philippines</p>
          <h1 className="text-xl font-bold uppercase">Technical Education and Skills Development Authority</h1>
          <p className="text-sm font-semibold">Region VII — Central Visayas</p>
          <div className="mt-3 inline-block border border-black px-6 py-1">
            <p className="text-xs uppercase tracking-wider">Memo No.</p>
            <p className="font-mono font-bold text-base">{memo.memoNumber}</p>
          </div>
        </div>
        <div className="flex justify-between mt-4 text-sm">
          <div><span className="font-semibold">Type:</span> {memo.memoType}</div>
          <div><span className="font-semibold">Department:</span> {memo.department}</div>
          <div><span className="font-semibold">Date:</span> {formatDate(memo.createdAt)}</div>
          <div><span className="font-semibold">Status:</span> {memo.status.toUpperCase()}</div>
        </div>
      </div>

      {/* Approval Tracker */}
      <Card className="print:hidden">
        <CardContent className="pt-6">
          <ApprovalTracker status={memo.status} />
        </CardContent>
      </Card>

      {/* Main Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Primary Info */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Memo Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{memo.title}</h2>
                {memo.description && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{memo.description}</p>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <InfoRow icon={<Tag className="h-4 w-4" />} label="Type" value={memo.memoType} />
                <InfoRow icon={<Building className="h-4 w-4" />} label="Department" value={memo.department} />
                <InfoRow icon={<User className="h-4 w-4" />} label="Author/Focal" value={memo.authorFocal} />
                <InfoRow icon={<User className="h-4 w-4" />} label="Signatory" value={memo.signatory} />
                <InfoRow icon={<Calendar className="h-4 w-4" />} label="Created" value={formatDate(memo.createdAt)} />
                {memo.isAntedated && memo.antedationDate && (
                  <InfoRow icon={<Calendar className="h-4 w-4" />} label="Antedated" value={memo.antedationDate} />
                )}
                <InfoRow icon={<User className="h-4 w-4" />} label="Created By" value={memo.createdBy} />
                <InfoRow
                  icon={<Users className="h-4 w-4" />}
                  label="Recipients"
                  value={Array.isArray(memo.recipients) ? memo.recipients.join(', ') : memo.recipients}
                />
              </div>

              {/* Timestamps */}
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-xs">
                {memo.releasedToRodFasd && (
                  <InfoRow icon={<CheckCircle className="h-3.5 w-3.5" />} label="Released to ROD/FASD" value={formatDateTime(memo.releasedToRodFasd)} small />
                )}
                {memo.receivedByRodFasd && (
                  <InfoRow icon={<CheckCircle className="h-3.5 w-3.5" />} label="Received" value={`${formatDateTime(memo.receivedByRodFasd)} by ${memo.receivedByName || '—'}`} small />
                )}
                {memo.actionTaken && (
                  <InfoRow icon={<CheckCircle className="h-3.5 w-3.5" />} label="Action Taken" value={`${formatDateTime(memo.actionTakenAt)} by ${memo.actionTakenBy || '—'}`} small />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Activity Log */}
        <div>
          <Card className="print:hidden">
            <CardHeader>
              <CardTitle className="text-base">Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline memoId={memo.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}

function InfoRow({
  icon, label, value, small,
}: {
  icon: React.ReactNode
  label: string
  value: string | undefined | null
  small?: boolean
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className={`font-medium text-gray-900 dark:text-gray-100 ${small ? 'text-xs' : 'text-sm'}`}>
          {value || '—'}
        </p>
      </div>
    </div>
  )
}
