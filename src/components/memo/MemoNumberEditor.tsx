'use client'

import { useState, useEffect } from 'react'
import { Edit2, Save, X, RefreshCw } from 'lucide-react'
import { getCurrentMemoNumber, updateMemoNumberCounter } from '@/lib/memo-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import type { MemoType } from '@/types'

const MEMO_TYPES: MemoType[] = ['PO', 'CO', 'Office Order', 'Advisory', 'AdvisoryBulletin', 'Bulletin', 'Acknowledgment']

export function MemoNumberEditor() {
  const { toast } = useToast()
  const [counters, setCounters] = useState<Partial<Record<MemoType, number>>>({})
  const [editing, setEditing] = useState<MemoType | null>(null)
  const [editValue, setEditValue] = useState('')
  const [loading, setLoading] = useState(false)

  const loadCounters = async () => {
    setLoading(true)
    try {
      const entries = await Promise.all(
        MEMO_TYPES.map(async (t) => [t, await getCurrentMemoNumber(t)] as [MemoType, number])
      )
      setCounters(Object.fromEntries(entries))
    } catch (err) {
      toast({ title: 'Error loading counters', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadCounters() }, [])

  const startEdit = (type: MemoType) => {
    setEditing(type)
    setEditValue(String(counters[type] ?? 0))
  }

  const cancelEdit = () => { setEditing(null); setEditValue('') }

  const saveEdit = async () => {
    if (!editing) return
    const num = parseInt(editValue)
    if (isNaN(num) || num < 0) {
      toast({ title: 'Invalid number', variant: 'error' })
      return
    }
    try {
      await updateMemoNumberCounter(editing, num)
      setCounters((prev) => ({ ...prev, [editing]: num }))
      toast({ title: `${editing} counter updated to ${num}`, variant: 'success' })
      setEditing(null)
    } catch {
      toast({ title: 'Failed to update counter', variant: 'error' })
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Memo Number Counters</h3>
        <Button variant="ghost" size="sm" onClick={loadCounters} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {MEMO_TYPES.map((type) => (
          <div
            key={type}
            className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50"
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-32">{type}</span>

            {editing === type ? (
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-24 h-7 text-sm"
                  min="0"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit()
                    if (e.key === 'Escape') cancelEdit()
                  }}
                  autoFocus
                />
                <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={saveEdit}>
                  <Save className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={cancelEdit}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">
                  {loading ? '…' : counters[type] ?? '—'}
                </span>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(type)}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
