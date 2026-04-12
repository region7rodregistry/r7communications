'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAllMemosRealtime } from '@/lib/memo-service'
import type { Memo, MemoStatus } from '@/types'

export function useMemos(_department?: string) {
  const [memos, setMemos] = useState<Memo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    const onData = (data: Memo[]) => {
      setMemos(data)
      setLoading(false)
    }

    const onErr = (err: Error) => {
      console.error('[useMemos]', err)
      setError(err.message)
      setLoading(false)
    }

    let unsubscribe: () => void
    try {
      // All users see all memos — department context only affects available actions,
      // not visibility. ROD/FASD are recipients, not creators, so filtering by
      // department field would return 0 results for them.
      unsubscribe = getAllMemosRealtime(onData, onErr)
    } catch (err: any) {
      onErr(err)
    }

    return () => { unsubscribe?.() }
  }, [])

  const filterByStatus = useCallback(
    (status: MemoStatus | 'all') => {
      if (status === 'all') return memos
      return memos.filter((m) => m.status === status)
    },
    [memos]
  )

  const stats = {
    total: memos.length,
    pending: memos.filter((m) => m.status === 'pending').length,
    signed: memos.filter((m) => m.status === 'signed').length,
    approved: memos.filter((m) => m.status === 'approved').length,
    cancelled: memos.filter((m) => m.status === 'cancelled').length,
    archived: memos.filter((m) => m.status === 'archived').length,
  }

  return { memos, loading, error, filterByStatus, stats }
}
