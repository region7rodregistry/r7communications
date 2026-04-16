'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, CheckCircle, Calendar, Hash } from 'lucide-react'
import { createMemo, getNextMemoNumber, getNextAntedatedMemoNumber, logMemoActivity } from '@/lib/memo-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/toast'
import { useMemoNumber } from '@/hooks/useMemoNumber'
import { getMemoTypePrefix, padNumber } from '@/lib/utils'
import { DEPARTMENT_CODES, ALL_RECIPIENTS, ALL_SIGNATORIES, ALL_FOCAL } from '@/types'
import type { MemoType, Department } from '@/types'

const MEMO_TYPES: MemoType[] = ['PO', 'CO', 'Office Order', 'Advisory', 'AdvisoryBulletin', 'Bulletin', 'Acknowledgment']

interface Props {
  open: boolean
  onClose: () => void
  onCreated?: (memoNumber: string) => void
}

export function CreateMemoModal({ open, onClose, onCreated }: Props) {
  const { userData } = useAuth()
  const { toast } = useToast()

  const [form, setForm] = useState({
    memoType: '' as MemoType | '',
    title: '',
    description: '',
    recipients: [] as string[],
    authorFocal: '',
    authorFocalCustom: '',
    signatory: 'Gamaliel B. Vicente, Jr. CESO III, ASEAN ENG.',
    signatoryCustom: '',
    isAntedated: false,
    antedationDate: '',
  })
  const [recipientCustom, setRecipientCustom] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setForm({ memoType: '', title: '', description: '', recipients: [], authorFocal: '', authorFocalCustom: '', signatory: 'Gamaliel B. Vicente, Jr. CESO III, ASEAN ENG.', signatoryCustom: '', isAntedated: false, antedationDate: '' })
      setRecipientCustom('')
      setErrors({})
      setDone(null)
    }
  }, [open])

  const department = userData?.department as Department | undefined

  const { previewNumber, loading: numLoading } = useMemoNumber(
    form.memoType as MemoType || null,
    department || null,
    form.isAntedated,
    form.antedationDate
  )

  const setField = <K extends keyof typeof form>(key: K, value: typeof form[K]) => {
    setForm(f => ({ ...f, [key]: value }))
    setErrors(e => { const c = { ...e }; delete c[key]; return c })
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.memoType)      e.memoType    = 'Required'
    if (!form.title.trim())  e.title       = 'Required'
    if (form.title.length > 200) e.title   = 'Max 200 chars'
    if (!form.authorFocal)   e.authorFocal = 'Required'
    if (!form.signatory)     e.signatory   = 'Required'
    if (form.recipients.length === 0 && !recipientCustom) e.recipients = 'Select at least one'
    if (form.isAntedated && !form.antedationDate) e.antedationDate = 'Required'
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    try {
      const currentYear = new Date().getFullYear()
      const year = (form.isAntedated && form.antedationDate)
        ? new Date(form.antedationDate).getFullYear()
        : currentYear
      const dept = department || 'ORD'
      const deptCode = DEPARTMENT_CODES[dept] || dept
      const typePrefix = getMemoTypePrefix(form.memoType as string)

      let memoNumber: string
      let createdAt: Date | null = null

      if (form.isAntedated && form.antedationDate) {
        memoNumber = await getNextAntedatedMemoNumber(form.memoType as MemoType, form.antedationDate, dept, year)
        createdAt = new Date(form.antedationDate)
      } else {
        const num = await getNextMemoNumber(form.memoType as MemoType)
        memoNumber = `${typePrefix}-${year}-${deptCode}-${padNumber(num)}`
      }

      const recipients = [...form.recipients.filter(r => r !== 'Others'), ...(recipientCustom ? [recipientCustom] : [])]
      const authorFocal = form.authorFocal === 'Others' ? form.authorFocalCustom : form.authorFocal
      const signatory   = form.signatory   === 'Others' ? form.signatoryCustom   : form.signatory

      const docRef = await createMemo({
        memoNumber, title: form.title.trim(), description: form.description.trim(),
        department: dept, recipients, authorFocal, signatory,
        createdBy: userData?.username || 'unknown',
        memoType: form.memoType as MemoType,
        isAntedated: form.isAntedated,
        antedationDate: form.isAntedated ? form.antedationDate : null,
        createdAt: createdAt || new Date(), status: 'pending',
      })
      await logMemoActivity(docRef.id, `Memo created: ${memoNumber}`, userData?.username || 'unknown')

      setDone(memoNumber)
      onCreated?.(memoNumber)
      toast({ title: `Memo ${memoNumber} created`, variant: 'success' })
    } catch (err: any) {
      toast({ title: 'Failed to create memo', description: err.message, variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col pointer-events-auto"
              style={{ maxHeight: 'calc(100vh - 2rem)' }}
              initial={{ scale: 0.94, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 16 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 shrink-0">
                <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Create New Memo</h2>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {done ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-10 text-center gap-3"
                  >
                    <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                      <CheckCircle className="h-7 w-7 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Memo Created!</p>
                      <p className="font-mono text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">{done}</p>
                    </div>
                    <Button size="sm" onClick={onClose} className="mt-2">Close</Button>
                  </motion.div>
                ) : (
                  <form id="create-memo-form" onSubmit={handleSubmit} className="space-y-4">

                    {/* Row 1: Type + Department */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Memo Type <span className="text-red-500">*</span></Label>
                        <Select value={form.memoType} onValueChange={v => setField('memoType', v as MemoType)}>
                          <SelectTrigger className={`h-8 text-xs ${errors.memoType ? 'border-red-400' : ''}`}>
                            <SelectValue placeholder="Select type…" />
                          </SelectTrigger>
                          <SelectContent>
                            {MEMO_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        {errors.memoType && <p className="text-[11px] text-red-500">{errors.memoType}</p>}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Department</Label>
                        <div className="flex h-8 w-full items-center rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 text-xs text-gray-500 select-none">
                          {department || '—'}
                        </div>
                      </div>
                    </div>

                    {/* Preview number */}
                    <AnimatePresence>
                      {form.memoType && department && (
                        <motion.div
                          key={previewNumber}
                          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800"
                        >
                          <Hash className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          <div>
                            <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                              {form.isAntedated ? 'Antedated Memo Number' : 'Preview Memo Number'}
                            </p>
                            <p className="font-mono text-xs font-bold text-blue-700 dark:text-blue-300">
                              {numLoading ? 'Loading…' : (previewNumber || '—')}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Antedation */}
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox" checked={form.isAntedated}
                          onChange={e => setField('isAntedated', e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600"
                        />
                        Antedated memo
                      </label>
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    </div>

                    <AnimatePresence>
                      {form.isAntedated && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          className="space-y-1"
                        >
                          <Label className="text-xs">Antedation Date <span className="text-red-500">*</span></Label>
                          <Input type="date" value={form.antedationDate}
                            onChange={e => setField('antedationDate', e.target.value)}
                            max={new Date().toISOString().slice(0, 10)}
                            className={`h-8 text-xs ${errors.antedationDate ? 'border-red-400' : ''}`}
                          />
                          {errors.antedationDate && <p className="text-[11px] text-red-500">{errors.antedationDate}</p>}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Title */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Title <span className="text-red-500">*</span></Label>
                        <span className={`text-[11px] ${form.title.length > 190 ? 'text-red-500' : 'text-gray-400'}`}>{form.title.length}/200</span>
                      </div>
                      <Input placeholder="Enter memo title…" value={form.title}
                        onChange={e => setField('title', e.target.value)}
                        maxLength={200} className={`h-8 text-xs ${errors.title ? 'border-red-400' : ''}`}
                      />
                      {errors.title && <p className="text-[11px] text-red-500">{errors.title}</p>}
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Description</Label>
                        <span className={`text-[11px] ${form.description.length > 480 ? 'text-red-500' : 'text-gray-400'}`}>{form.description.length}/500</span>
                      </div>
                      <Textarea placeholder="Brief description…" value={form.description}
                        onChange={e => setField('description', e.target.value)}
                        maxLength={500} rows={2} className="text-xs resize-none"
                      />
                    </div>

                    {/* Recipients */}
                    <div className="space-y-1">
                      <Label className="text-xs">Recipients <span className="text-red-500">*</span></Label>
                      <div className="flex flex-wrap gap-1.5">
                        {ALL_RECIPIENTS.filter(r => r !== 'Others').map(r => (
                          <button key={r} type="button"
                            onClick={() => setForm(f => ({
                              ...f,
                              recipients: f.recipients.includes(r)
                                ? f.recipients.filter(x => x !== r)
                                : [...f.recipients, r],
                            }))}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                              form.recipients.includes(r)
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-300'
                            }`}
                          >{r}</button>
                        ))}
                      </div>
                      <Input placeholder="Other recipient…" value={recipientCustom}
                        onChange={e => setRecipientCustom(e.target.value)}
                        className="h-7 text-xs mt-1"
                      />
                      {errors.recipients && <p className="text-[11px] text-red-500">{errors.recipients}</p>}
                    </div>

                    {/* Author + Signatory */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Author / Focal <span className="text-red-500">*</span></Label>
                        <Select value={form.authorFocal} onValueChange={v => setField('authorFocal', v)}>
                          <SelectTrigger className={`h-8 text-xs ${errors.authorFocal ? 'border-red-400' : ''}`}>
                            <SelectValue placeholder="Select…" />
                          </SelectTrigger>
                          <SelectContent>
                            {ALL_FOCAL.map(f => <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        {form.authorFocal === 'Others' && (
                          <Input placeholder="Author name…" value={form.authorFocalCustom}
                            onChange={e => setField('authorFocalCustom', e.target.value)}
                            className="h-7 text-xs mt-1"
                          />
                        )}
                        {errors.authorFocal && <p className="text-[11px] text-red-500">{errors.authorFocal}</p>}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Signatory <span className="text-red-500">*</span></Label>
                        <Select value={form.signatory} onValueChange={v => setField('signatory', v)}>
                          <SelectTrigger className={`h-8 text-xs ${errors.signatory ? 'border-red-400' : ''}`}>
                            <SelectValue placeholder="Select…" />
                          </SelectTrigger>
                          <SelectContent>
                            {ALL_SIGNATORIES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        {form.signatory === 'Others' && (
                          <Input placeholder="Signatory name…" value={form.signatoryCustom}
                            onChange={e => setField('signatoryCustom', e.target.value)}
                            className="h-7 text-xs mt-1"
                          />
                        )}
                        {errors.signatory && <p className="text-[11px] text-red-500">{errors.signatory}</p>}
                      </div>
                    </div>

                  </form>
                )}
              </div>

              {/* Footer */}
              {!done && (
                <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit" form="create-memo-form" size="sm" className="h-7 text-xs min-w-[100px]" disabled={loading}>
                    {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />Creating…</> : 'Create Memo'}
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
