'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Loader2, CheckCircle, Calendar, Hash } from 'lucide-react'
import Link from 'next/link'
import { createMemo, getNextMemoNumber, getNextAntedatedMemoNumber } from '@/lib/memo-service'
import { logMemoActivity } from '@/lib/memo-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/toast'
import { useMemoNumber } from '@/hooks/useMemoNumber'
import { getMemoTypePrefix, padNumber } from '@/lib/utils'
import { DEPARTMENT_CODES, ALL_RECIPIENTS, ALL_SIGNATORIES, FOCAL_GROUPS } from '@/types'
import type { MemoType, Department } from '@/types'

const MEMO_TYPES: MemoType[] = ['PO', 'CO', 'Office Order', 'Advisory', 'AdvisoryBulletin', 'Bulletin', 'Acknowledgment']

export function CreateMemoForm() {
  const router = useRouter()
  const { userData } = useAuth()
  const { toast } = useToast()

  const [form, setForm] = useState({
    memoType: '' as MemoType | '',
    title: '',
    description: '',
    department: (userData?.department || '') as Department | '',
    recipients: [] as string[],
    authorFocal: '',
    authorFocalCustom: '',
    signatory: '',
    signatoryCustom: '',
    isAntedated: false,
    antedationDate: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<{ memoNumber: string } | null>(null)
  const [countdown, setCountdown] = useState(10)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [recipientCustom, setRecipientCustom] = useState('')

  const { previewNumber, loading: numLoading } = useMemoNumber(
    form.memoType as MemoType || null,
    form.department as Department || null,
    form.isAntedated,
    form.antedationDate
  )

  useEffect(() => {
    if (userData?.department) {
      setForm((f) => ({ ...f, department: userData.department }))
    }
  }, [userData])

  // Countdown redirect
  useEffect(() => {
    if (!success) return
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(t)
          router.push('/dashboard')
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [success, router])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.memoType) e.memoType = 'Memo type is required'
    if (!form.title.trim()) e.title = 'Title is required'
    if (form.title.length > 200) e.title = 'Title max 200 chars'
    if (form.description.length > 500) e.description = 'Description max 500 chars'
    if (!form.department) e.department = 'Department is required'
    if (form.recipients.length === 0 && !recipientCustom) e.recipients = 'At least one recipient required'
    if (!form.authorFocal) e.authorFocal = 'Author/Focal is required'
    if (!form.signatory) e.signatory = 'Signatory is required'
    if (form.isAntedated && !form.antedationDate) e.antedationDate = 'Antedation date is required'
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
      // For antedated memos the year comes from the selected date, not today
      const year = (form.isAntedated && form.antedationDate)
        ? new Date(form.antedationDate).getFullYear()
        : currentYear
      const deptCode = DEPARTMENT_CODES[form.department as Department] || form.department
      const typePrefix = getMemoTypePrefix(form.memoType as string)

      let memoNumber: string
      let createdAt: Date | null = null

      if (form.isAntedated && form.antedationDate) {
        memoNumber = await getNextAntedatedMemoNumber(
          form.memoType as MemoType,
          form.antedationDate,
          form.department as string,
          year
        )
        createdAt = new Date(form.antedationDate)
      } else {
        const num = await getNextMemoNumber(form.memoType as MemoType)
        memoNumber = `${typePrefix}-${year}-${deptCode}-${padNumber(num)}`
      }

      const recipients = [
        ...form.recipients.filter((r) => r !== 'Others'),
        ...(recipientCustom ? [recipientCustom] : []),
      ]

      const authorFocal = form.authorFocal === 'Others' ? form.authorFocalCustom : form.authorFocal
      const signatory = form.signatory === 'Others' ? form.signatoryCustom : form.signatory

      const docRef = await createMemo({
        memoNumber,
        title: form.title.trim(),
        description: form.description.trim(),
        department: form.department as Department,
        recipients,
        authorFocal,
        signatory,
        createdBy: userData?.username || 'unknown',
        memoType: form.memoType as MemoType,
        isAntedated: form.isAntedated,
        antedationDate: form.isAntedated ? form.antedationDate : null,
        createdAt: createdAt || new Date(),
        status: 'pending',
      })

      await logMemoActivity(
        docRef.id,
        `Memo created: ${memoNumber}`,
        userData?.username || 'unknown'
      )

      setSuccess({ memoNumber })
    } catch (err: any) {
      toast({ title: 'Failed to create memo', description: err.message, variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const setField = <K extends keyof typeof form>(key: K, value: typeof form[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => { const c = { ...e }; delete c[key]; return c })
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
          className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-6"
        >
          <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
        </motion.div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Memo Created!</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-3">Your memo number is:</p>
        <p className="font-mono text-2xl font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-6 py-3 rounded-xl mb-6">
          {success.memoNumber}
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-600">
          Redirecting to dashboard in {countdown}s…
        </p>
        <Button variant="outline" onClick={() => router.push('/dashboard')} className="mt-4">
          Go to Dashboard now
        </Button>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      {/* Back */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Create New Memo</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Fill in the details below</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Memo Type */}
        <Card>
          <CardContent className="pt-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Memo Type <span className="text-red-500">*</span></Label>
                <Select value={form.memoType} onValueChange={(v) => setField('memoType', v as MemoType)}>
                  <SelectTrigger className={errors.memoType ? 'border-red-400' : ''}>
                    <SelectValue placeholder="Select type…" />
                  </SelectTrigger>
                  <SelectContent>
                    {MEMO_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.memoType && <p className="text-xs text-red-500">{errors.memoType}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Department</Label>
                <div className="flex h-10 w-full items-center rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 text-sm text-gray-500 dark:text-gray-400 select-none">
                  {form.department || '—'}
                </div>
                <p className="text-xs text-gray-400">Assigned from your account</p>
              </div>
            </div>

            {/* Preview Number */}
            {(previewNumber || numLoading) && form.memoType && form.department && (
              <motion.div
                key={previewNumber}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800"
              >
                <Hash className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    {form.isAntedated ? 'Antedated Memo Number' : 'Preview Memo Number'}
                  </p>
                  <p className="font-mono text-sm font-bold text-blue-700 dark:text-blue-300">
                    {numLoading ? 'Loading…' : previewNumber}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Antedation */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isAntedated}
                  onChange={(e) => setField('isAntedated', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Antedated memo</span>
              </label>
              <Calendar className="h-4 w-4 text-gray-400" />
            </div>

            <AnimatePresence>
              {form.isAntedated && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5"
                >
                  <Label>Antedation Date <span className="text-red-500">*</span></Label>
                  <Input
                    type="date"
                    value={form.antedationDate}
                    onChange={(e) => setField('antedationDate', e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    className={errors.antedationDate ? 'border-red-400' : ''}
                  />
                  {errors.antedationDate && <p className="text-xs text-red-500">{errors.antedationDate}</p>}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Title & Description */}
        <Card>
          <CardContent className="pt-6 space-y-5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Title <span className="text-red-500">*</span></Label>
                <span className={`text-xs ${form.title.length > 190 ? 'text-red-500' : 'text-gray-400'}`}>
                  {form.title.length}/200
                </span>
              </div>
              <Input
                placeholder="Enter memo title…"
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                maxLength={200}
                className={errors.title ? 'border-red-400' : ''}
              />
              {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Description</Label>
                <span className={`text-xs ${form.description.length > 480 ? 'text-red-500' : 'text-gray-400'}`}>
                  {form.description.length}/500
                </span>
              </div>
              <Textarea
                placeholder="Brief description of the memo…"
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                maxLength={500}
                rows={4}
                className={errors.description ? 'border-red-400' : ''}
              />
              {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Recipients, Author, Signatory */}
        <Card>
          <CardContent className="pt-6 space-y-5">
            {/* Recipients */}
            <div className="space-y-1.5">
              <Label>Recipients <span className="text-red-500">*</span></Label>
              <div className="flex flex-wrap gap-2">
                {ALL_RECIPIENTS.filter((r) => r !== 'Others').map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setForm((f) => ({
                        ...f,
                        recipients: f.recipients.includes(r)
                          ? f.recipients.filter((x) => x !== r)
                          : [...f.recipients, r],
                      }))
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      form.recipients.includes(r)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-200 text-gray-600 hover:border-blue-300 dark:border-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <Input
                placeholder="Other recipient (optional)…"
                value={recipientCustom}
                onChange={(e) => setRecipientCustom(e.target.value)}
                className="mt-2"
              />
              {errors.recipients && <p className="text-xs text-red-500">{errors.recipients}</p>}
            </div>

            {/* Author/Focal */}
            <div className="space-y-1.5">
              <Label>Author / Focal <span className="text-red-500">*</span></Label>
              <Select value={form.authorFocal} onValueChange={(v) => setField('authorFocal', v)}>
                <SelectTrigger className={errors.authorFocal ? 'border-red-400' : ''}>
                  <SelectValue placeholder="Select author/focal…" />
                </SelectTrigger>
                <SelectContent>
                  {FOCAL_GROUPS.map((group) => (
                    <SelectGroup key={group.label}>
                      <SelectLabel>{group.label}</SelectLabel>
                      {group.options.map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                  <SelectItem value="Others">Other (Please specify)</SelectItem>
                </SelectContent>
              </Select>
              <AnimatePresence>
                {form.authorFocal === 'Others' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <Input
                      placeholder="Enter author/focal name…"
                      value={form.authorFocalCustom}
                      onChange={(e) => setField('authorFocalCustom', e.target.value)}
                      className="mt-2"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              {errors.authorFocal && <p className="text-xs text-red-500">{errors.authorFocal}</p>}
            </div>

            {/* Signatory */}
            <div className="space-y-1.5">
              <Label>Signatory <span className="text-red-500">*</span></Label>
              <Select value={form.signatory} onValueChange={(v) => setField('signatory', v)}>
                <SelectTrigger className={errors.signatory ? 'border-red-400' : ''}>
                  <SelectValue placeholder="Select signatory…" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_SIGNATORIES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <AnimatePresence>
                {form.signatory === 'Others' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <Input
                      placeholder="Enter signatory name…"
                      value={form.signatoryCustom}
                      onChange={(e) => setField('signatoryCustom', e.target.value)}
                      className="mt-2"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              {errors.signatory && <p className="text-xs text-red-500">{errors.signatory}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button type="button" variant="outline" className="w-full sm:w-auto">Cancel</Button>
          </Link>
          <Button type="submit" disabled={loading} className="w-full sm:w-auto sm:min-w-[120px]">
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Creating…</>
            ) : (
              'Create Memo'
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  )
}
