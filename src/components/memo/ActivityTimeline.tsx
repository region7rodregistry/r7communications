'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, User, Activity } from 'lucide-react'
import { getActivityLogsForMemo } from '@/lib/memo-service'
import { formatDateTime } from '@/lib/utils'
import type { MemoActivity } from '@/types'

export function ActivityTimeline({ memoId }: { memoId: string }) {
  const [logs, setLogs] = useState<MemoActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getActivityLogsForMemo(memoId)
      .then(setLogs)
      .finally(() => setLoading(false))
  }, [memoId])

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 dark:text-gray-600">
        <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No activity recorded yet.</p>
      </div>
    )
  }

  return (
    <div className="relative pl-6">
      {/* Vertical line */}
      <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-gray-700" />

      <div className="space-y-4">
        {logs.map((log, i) => (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="relative"
          >
            {/* Dot */}
            <div className="absolute -left-4.5 top-1.5 h-2.5 w-2.5 rounded-full bg-blue-500 border-2 border-white dark:border-gray-950 shadow" />

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 ml-2">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{log.action}</p>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {log.username}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDateTime(log.timestamp)}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
