'use client'

import { useState, useEffect, useRef } from 'react'
import { getCurrentMemoNumber, getNextAntedatedMemoNumber } from '@/lib/memo-service'
import { padNumber, getMemoTypePrefix } from '@/lib/utils'
import type { MemoType, Department } from '@/types'
import { DEPARTMENT_CODES } from '@/types'

export function useMemoNumber(
  memoType: MemoType | null,
  department: Department | null,
  isAntedated: boolean = false,
  antedationDate: string = ''
) {
  const [previewNumber, setPreviewNumber] = useState<string>('')
  const [loading, setLoading] = useState(false)

  // Debounce antedation lookups — scanning all memos is expensive
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!memoType || !department) {
      setPreviewNumber('')
      return
    }

    // Antedated path requires a date too
    if (isAntedated && !antedationDate) {
      setPreviewNumber('')
      return
    }

    let cancelled = false

    const run = async () => {
      setLoading(true)
      try {
        let preview: string

        if (isAntedated && antedationDate) {
          const year = new Date(antedationDate).getFullYear()
          preview = await getNextAntedatedMemoNumber(
            memoType,
            antedationDate,
            department,
            year
          )
        } else {
          const current = await getCurrentMemoNumber(memoType)
          const prefix = getMemoTypePrefix(memoType)
          const year = new Date().getFullYear()
          const deptCode = DEPARTMENT_CODES[department] || department
          preview = `${prefix}-${year}-${deptCode}-${padNumber(current + 1)}`
        }

        if (!cancelled) setPreviewNumber(preview)
      } catch {
        if (!cancelled) setPreviewNumber('Error loading number')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    // Debounce antedation calls (user is still typing the date)
    if (isAntedated) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(run, 400)
    } else {
      run()
    }

    return () => {
      cancelled = true
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [memoType, department, isAntedated, antedationDate])

  return { previewNumber, loading }
}
