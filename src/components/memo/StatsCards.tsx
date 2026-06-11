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
  gradient: string
  text: string
  iconColor: string
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
      label: 'Total Documents',
      value: stats.total,
      icon: <FileText />,
      gradient: 'from-blue-100 to-blue-300 dark:from-blue-900/40 dark:to-blue-800/40',
      text: 'text-blue-900 dark:text-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Pending Memos',
      value: stats.pending,
      icon: <Clock />,
      gradient: 'from-yellow-100 to-yellow-300 dark:from-yellow-900/40 dark:to-yellow-800/40',
      text: 'text-yellow-900 dark:text-yellow-100',
      iconColor: 'text-yellow-600',
    },
    {
      label: 'Signed Memos',
      value: stats.signed,
      icon: <PenLine />,
      gradient: 'from-red-100 to-red-300 dark:from-red-900/40 dark:to-red-800/40',
      text: 'text-red-900 dark:text-red-100',
      iconColor: 'text-red-600',
    },
    {
      label: 'Approved Memos',
      value: stats.approved,
      icon: <CheckCircle />,
      gradient: 'from-green-100 to-green-300 dark:from-green-900/40 dark:to-green-800/40',
      text: 'text-green-900 dark:text-green-100',
      iconColor: 'text-green-600',
    },
    {
      label: 'Archived Memos',
      value: stats.archived,
      icon: <Archive />,
      gradient: 'from-gray-100 to-gray-300 dark:from-gray-800/60 dark:to-gray-700/60',
      text: 'text-gray-800 dark:text-gray-100',
      iconColor: 'text-gray-600',
    },
  ]

  if (typeof stats.cancelled === 'number') {
    items.splice(4, 0, {
      label: 'Cancelled Memos',
      value: stats.cancelled,
      icon: <XCircle />,
      gradient: 'from-rose-100 to-rose-300 dark:from-rose-900/40 dark:to-rose-800/40',
      text: 'text-rose-900 dark:text-rose-100',
      iconColor: 'text-rose-600',
    })
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
          whileHover={{ scale: 1.04, y: -4 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <Card className={cn(
            'border-0 rounded-2xl bg-gradient-to-br shadow-sm hover:shadow-lg transition-shadow duration-300 cursor-default',
            item.gradient
          )}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-14 w-14 shrink-0 rounded-full bg-white/90 shadow-sm flex items-center justify-center">
                <span className={cn('[&>svg]:h-7 [&>svg]:w-7', item.iconColor)}>{item.icon}</span>
              </div>
              <div className="min-w-0">
                <p className={cn('text-sm font-semibold leading-tight truncate', item.text)}>{item.label}</p>
                <p className={cn('text-4xl font-extrabold leading-none mt-1.5', item.text)}>
                  <CountUp target={item.value} />
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
