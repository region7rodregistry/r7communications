'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Printer,
  FileDown,
  Calendar,
  User,
  Building,
  Users,
  Tag,
  CheckCircle,
  Clock,
  PenLine,
  Archive,
  XCircle,
  Pencil,
} from 'lucide-react'
import { getMemoById, updateMemo, logMemoActivity, validateMemoNumberUniqueness } from '@/lib/memo-service'
import { formatDate, formatDateTime } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/contexts/AuthContext'
import { ActivityTimeline } from './ActivityTimeline'
import { ReceiveMemoDialog } from './ReceiveMemoDialog'
import { STATUS_COLORS } from '@/types'
import type { Memo, Department } from '@/types'

const DEPTS: Department[] = ['ORD', 'ROD', 'FASD', 'Administration']

type EditableKey =
  | 'memoNumber'
  | 'title'
  | 'description'
  | 'department'
  | 'recipients'
  | 'authorFocal'
  | 'signatory'

const FIELD_LABELS: Record<EditableKey, string> = {
  memoNumber: 'Memo Number',
  title: 'Subject',
  description: 'Description',
  department: 'Department',
  recipients: 'Recipients',
  authorFocal: 'Author/Focal',
  signatory: 'Signatory',
}

const DESC_MAX = 2000

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-yellow-600" />,
  signed: <PenLine className="h-4 w-4 text-blue-600" />,
  approved: <CheckCircle className="h-4 w-4 text-green-600" />,
  cancelled: <XCircle className="h-4 w-4 text-red-600" />,
  archived: <Archive className="h-4 w-4 text-gray-600" />,
}

const APPROVAL_STEPS = ['Created', 'Signed', 'Approved', 'Archived'] as const

function ApprovalTracker({ status }: { status: string }) {
  const stepIndex =
    {
      pending: 0,
      signed: 1,
      approved: 2,
      archived: 3,
      cancelled: -1,
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
            <span
              className={`text-[10px] sm:text-xs mt-1 font-medium whitespace-nowrap ${i <= stepIndex ? 'text-blue-600' : 'text-gray-400'}`}
            >
              {step}
            </span>
          </div>
          {i < APPROVAL_STEPS.length - 1 && (
            <div
              className={`flex-1 h-0.5 mb-5 mx-1 transition-colors ${i < stepIndex ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export function ViewMemoDetail({ memoId }: { memoId: string }) {
  const { userData } = useAuth()
  const { toast } = useToast()
  const [memo, setMemo] = useState<Memo | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<EditableKey | null>(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false)

  useEffect(() => {
    getMemoById(memoId)
      .then(setMemo)
      .finally(() => setLoading(false))
  }, [memoId])

  const isAdmin = userData?.role === 'admin'
  const editingLocked = memo?.status === 'archived'
  const showAdminEdit = isAdmin && memo && !editingLocked
  const showReceiveCta =
    !!memo &&
    !isAdmin &&
    memo.status === 'approved' &&
    !!memo.releasedToRodFasd &&
    !memo.receivedByRodFasd

  const cancelEdit = () => {
    setEditing(null)
    setDraft('')
  }

  const startEditing = (key: EditableKey) => {
    if (!memo) return
    if (key === 'memoNumber') {
      if (
        !window.confirm(
          'Warning: Changing the memo number may affect tracking and references. Are you sure you want to proceed?'
        )
      ) {
        return
      }
      setDraft(memo.memoNumber)
    } else if (key === 'title') {
      if (!window.confirm('Are you sure you want to edit the subject of this memo?')) return
      setDraft(memo.title)
    } else if (key === 'description') {
      setDraft(memo.description || '')
    } else if (key === 'department') {
      setDraft(memo.department)
    } else if (key === 'recipients') {
      setDraft((memo.recipients || []).join(', '))
    } else if (key === 'authorFocal') {
      setDraft(memo.authorFocal || '')
    } else if (key === 'signatory') {
      setDraft(memo.signatory || '')
    }
    setEditing(key)
  }

  const commitEdit = async () => {
    if (!memo || !editing || !userData) return

    const key = editing
    const patch: Partial<Memo> = {}

    if (key === 'memoNumber') {
      const v = draft.trim()
      if (!v) {
        toast({ title: 'Memo number cannot be empty', variant: 'error' })
        return
      }
      if (!v.includes('-')) {
        toast({
          title: 'Use the full memo number with hyphens (e.g. PO-2025-ORD-0001)',
          variant: 'error',
        })
        return
      }
      const unique = await validateMemoNumberUniqueness(v, memo.id)
      if (!unique) {
        toast({ title: 'This memo number is already in use', variant: 'error' })
        return
      }
      patch.memoNumber = v
    } else if (key === 'title') {
      const v = draft.trim()
      if (!v) {
        toast({ title: 'Subject cannot be empty', variant: 'error' })
        return
      }
      patch.title = v
    } else if (key === 'description') {
      if (draft.length > DESC_MAX) {
        toast({ title: `Description must be ${DESC_MAX} characters or less`, variant: 'error' })
        return
      }
      patch.description = draft.trim()
    } else if (key === 'department') {
      if (!DEPTS.includes(draft as Department)) {
        toast({ title: 'Invalid department', variant: 'error' })
        return
      }
      patch.department = draft as Department
    } else if (key === 'recipients') {
      const list = draft
        .split(/[,\n]/)
        .map((r) => r.trim())
        .filter(Boolean)
      if (!list.length) {
        toast({ title: 'Add at least one recipient', variant: 'error' })
        return
      }
      patch.recipients = list
    } else if (key === 'authorFocal') {
      const v = draft.trim()
      if (!v) {
        toast({ title: 'Author/Focal cannot be empty', variant: 'error' })
        return
      }
      patch.authorFocal = v
    } else if (key === 'signatory') {
      const v = draft.trim()
      if (!v) {
        toast({ title: 'Signatory cannot be empty', variant: 'error' })
        return
      }
      patch.signatory = v
    }

    setSaving(true)
    try {
      await updateMemo(memo.id, patch)
      await logMemoActivity(
        memo.id,
        `Updated ${FIELD_LABELS[key]}`,
        userData.username || userData.email
      )
      setMemo((m) => (m ? { ...m, ...patch } : null))
      setEditing(null)
      setDraft('')
      toast({ title: `${FIELD_LABELS[key]} updated`, variant: 'success' })
    } catch {
      toast({ title: 'Could not save changes', variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleReceiveConfirm = async (receivedByName: string) => {
    if (!memo) return
    await updateMemo(memo.id, {
      receivedByRodFasd: new Date(),
      receivedByName,
    })
    await logMemoActivity(
      memo.id,
      'Received Memo',
      userData?.username || userData?.email || 'user'
    )
    setMemo((m) =>
      m
        ? {
            ...m,
            receivedByRodFasd: new Date(),
            receivedByName,
          }
        : null
    )
    toast({ title: 'Memo marked as received', variant: 'success' })
  }

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

  const editActions = (k: EditableKey) =>
    showAdminEdit && editing !== k ? (
      <button
        type="button"
        onClick={() => startEditing(k)}
        className="shrink-0 p-1 rounded-md text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        title={`Edit ${FIELD_LABELS[k]}`}
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    ) : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {isAdmin && editingLocked && (
        <div className="rounded-lg border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-200 print:hidden">
          <strong>Memo archived:</strong> This memo cannot be edited.
        </div>
      )}

      {showAdminEdit && (
        <div className="print:hidden">
          <Badge variant="outline" className="text-xs font-medium border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-300">
            Admin — you can correct memo fields below
          </Badge>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap print:hidden">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            {editing === 'memoNumber' ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-0.5">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="font-mono text-base max-w-xl"
                  disabled={saving}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') cancelEdit()
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void commitEdit()
                    }
                  }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => void commitEdit()} disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1 min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 font-mono truncate">
                  {memo.memoNumber}
                </h1>
                {editActions('memoNumber')}
              </div>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[memo.status]}`}
              >
                {statusIcons[memo.status]}
                {memo.status}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{memo.memoType}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">· {memo.department}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
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
        <div className="flex flex-wrap justify-between gap-2 mt-4 text-sm">
          <div>
            <span className="font-semibold">Type:</span> {memo.memoType}
          </div>
          <div>
            <span className="font-semibold">Department:</span> {memo.department}
          </div>
          <div>
            <span className="font-semibold">Date:</span> {formatDate(memo.createdAt)}
          </div>
          <div>
            <span className="font-semibold">Status:</span> {memo.status.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Approval Tracker */}
      <Card className="print:hidden">
        <CardContent className="pt-6">
          <ApprovalTracker status={memo.status} />
        </CardContent>
      </Card>

      {showReceiveCta && (
        <Card className="print:hidden border-purple-200/90 dark:border-purple-800/70 bg-purple-50/70 dark:bg-purple-950/25">
          <CardContent className="pt-4 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-purple-900 dark:text-purple-100 leading-relaxed">
              This memo has been <strong>released to ROD/FASD</strong>. When your office receives it, confirm here and
              enter who received it.
            </p>
            <Button
              type="button"
              className="shrink-0 bg-purple-600 hover:bg-purple-700 text-white"
              size="sm"
              onClick={() => setReceiveDialogOpen(true)}
            >
              Mark as received
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Memo Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                {editing === 'title' ? (
                  <div className="space-y-2">
                    <Input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      disabled={saving}
                      className="text-lg font-semibold"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') cancelEdit()
                      }}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => void commitEdit()} disabled={saving}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex-1">{memo.title}</h2>
                    {editActions('title')}
                  </div>
                )}

                {editing === 'description' ? (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      disabled={saving}
                      rows={6}
                      className="text-sm"
                      autoFocus
                    />
                    <p className="text-xs text-gray-500 text-right">
                      {draft.length}/{DESC_MAX}
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => void commitEdit()} disabled={saving}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 flex items-start gap-2">
                    {memo.description ? (
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed flex-1">{memo.description}</p>
                    ) : (
                      <p className="text-sm text-gray-400 italic flex-1">No description</p>
                    )}
                    {editActions('description')}
                  </div>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <InfoRow icon={<Tag className="h-4 w-4" />} label="Type" value={memo.memoType} />
                  </div>
                </div>

                {editing === 'department' ? (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Building className="h-4 w-4" /> Department
                    </p>
                    <Select value={draft} onValueChange={setDraft} disabled={saving}>
                      <SelectTrigger className="max-w-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPTS.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => void commitEdit()} disabled={saving}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <InfoRow icon={<Building className="h-4 w-4" />} label="Department" value={memo.department} />
                    </div>
                    {editActions('department')}
                  </div>
                )}

                {editing === 'recipients' ? (
                  <div className="sm:col-span-2 space-y-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Users className="h-4 w-4" /> Recipients (comma-separated)
                    </p>
                    <Textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      disabled={saving}
                      rows={3}
                      placeholder="e.g. ROD, FASD, Central Office"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => void commitEdit()} disabled={saving}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 sm:col-span-2">
                    <div className="flex-1 min-w-0">
                      <InfoRow
                        icon={<Users className="h-4 w-4" />}
                        label="Recipients"
                        value={
                          Array.isArray(memo.recipients)
                            ? memo.recipients.join(', ')
                            : String(memo.recipients ?? '—')
                        }
                      />
                    </div>
                    {editActions('recipients')}
                  </div>
                )}

                {editing === 'authorFocal' ? (
                  <div className="sm:col-span-2 space-y-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <User className="h-4 w-4" /> Author/Focal
                    </p>
                    <Input value={draft} onChange={(e) => setDraft(e.target.value)} disabled={saving} autoFocus />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => void commitEdit()} disabled={saving}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <InfoRow icon={<User className="h-4 w-4" />} label="Author/Focal" value={memo.authorFocal} />
                    </div>
                    {editActions('authorFocal')}
                  </div>
                )}

                {editing === 'signatory' ? (
                  <div className="sm:col-span-2 space-y-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <User className="h-4 w-4" /> Signatory
                    </p>
                    <Input value={draft} onChange={(e) => setDraft(e.target.value)} disabled={saving} autoFocus />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => void commitEdit()} disabled={saving}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <InfoRow icon={<User className="h-4 w-4" />} label="Signatory" value={memo.signatory} />
                    </div>
                    {editActions('signatory')}
                  </div>
                )}

                <InfoRow icon={<Calendar className="h-4 w-4" />} label="Created" value={formatDate(memo.createdAt)} />
                {memo.isAntedated && memo.antedationDate && (
                  <InfoRow icon={<Calendar className="h-4 w-4" />} label="Antedated" value={memo.antedationDate} />
                )}
                <InfoRow icon={<User className="h-4 w-4" />} label="Created By" value={memo.createdBy} />
              </div>

              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {memo.releasedToRodFasd && (
                  <InfoRow
                    icon={<CheckCircle className="h-3.5 w-3.5" />}
                    label="Released to ROD/FASD"
                    value={formatDateTime(memo.releasedToRodFasd)}
                    small
                  />
                )}
                {memo.receivedByRodFasd && (
                  <InfoRow
                    icon={<CheckCircle className="h-3.5 w-3.5" />}
                    label="Received"
                    value={`${formatDateTime(memo.receivedByRodFasd)} by ${memo.receivedByName || '—'}`}
                    small
                  />
                )}
                {memo.actionTaken && (
                  <InfoRow
                    icon={<CheckCircle className="h-3.5 w-3.5" />}
                    label="Action Taken"
                    value={`${formatDateTime(memo.actionTakenAt)} by ${memo.actionTakenBy || '—'}`}
                    small
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

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

      {!isAdmin && (
        <ReceiveMemoDialog
          open={receiveDialogOpen}
          onOpenChange={setReceiveDialogOpen}
          defaultName={userData?.username ?? ''}
          title="Received by"
          description="Enter the name of the person who received this memo (focal or receiving staff)."
          onConfirm={handleReceiveConfirm}
        />
      )}
    </motion.div>
  )
}

function InfoRow({
  icon,
  label,
  value,
  small,
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
