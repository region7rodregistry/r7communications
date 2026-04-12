'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Clock, CheckCircle, Archive, XCircle, PenLine } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatItem {
  label: string
  value: number
  icon: React.ReactNode
  color: string
  bgColor: string
}

function CountUp({ target }: { target: number }) {
  // Start at target so there's no flash of 0 on first paint
  const [count, setCount] = useState(target)
  const fromRef = useRef(target)
  const frame = useRef(0)

  useEffect(() => {
    const from = fromRef.current
    fromRef.current = target
    if (from === target) return

    cancelAnimationFrame(frame.current)

    const duration = 600
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(from + (target - from) * eased))
      if (progress < 1) {
        frame.current = requestAnimationFrame(tick)
      }
    }
    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [target])

  return <span>{count}</span>
}

export function StatsCards({
  stats,
}: {
  stats: {
    total: number
    pending: number
    signed: number
    approved: number
    cancelled?: number
    archived: number
  }
}) {
  const items: StatItem[] = [
    {
      label: 'Total Memos',
      value: stats.total,
      icon: <FileText className="h-5 w-5" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Pending',
      value: stats.pending,
      icon: <Clock className="h-5 w-5" />,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    },
    {
      label: 'Signed',
      value: stats.signed,
      icon: <PenLine className="h-5 w-5" />,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    },
    {
      label: 'Approved',
      value: stats.approved,
      icon: <CheckCircle className="h-5 w-5" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: 'Archived',
      value: stats.archived,
      icon: <Archive className="h-5 w-5" />,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    },
  ]

  if (typeof stats.cancelled === 'number') {
    items.splice(4, 0, {
      label: 'Cancelled',
      value: stats.cancelled,
      icon: <XCircle className="h-5 w-5" />,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
    })
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-2">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div className={cn('p-1.5 rounded-md', item.bgColor, item.color)}>
                  <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{item.icon}</span>
                </div>
                <p className={cn('text-lg font-bold leading-none', item.color)}>
                  <CountUp target={item.value} />
                </p>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">{item.label}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
