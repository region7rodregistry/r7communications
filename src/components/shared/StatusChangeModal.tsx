'use client'

import { useState } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import type { Memo, MemoStatus } from '@/types'

interface StatusChangeModalProps {
  open: boolean
  memo: Memo | null
  onClose: () => void
  onConfirm: (memoId: string, status: MemoStatus) => Promise<void>
}

const STATUS_OPTIONS: { value: MemoStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'signed', label: 'Signed' },
  { value: 'approved', label: 'Approved' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'archived', label: 'Archived' },
]

export function StatusChangeModal({ open, memo, onClose, onConfirm }: StatusChangeModalProps) {
  const { user } = useAuth()
  const [newStatus, setNewStatus] = useState<MemoStatus>('pending')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!memo || !user?.email) return
    setError('')
    setLoading(true)

    try {
      // Re-authenticate with password
      await signInWithEmailAndPassword(auth, user.email, password)
      await onConfirm(memo.id, newStatus)
      setPassword('')
      onClose()
    } catch (err: any) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Incorrect password. Please try again.')
      } else {
        setError(err.message || 'Authentication failed.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle>Change Memo Status</DialogTitle>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">
                {memo?.memoNumber}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>New Status</Label>
            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as MemoStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.filter((s) => s.value !== memo?.status).map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Confirm your password</Label>
            <Input
              type="password"
              placeholder="Enter your password…"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !password}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Change Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
