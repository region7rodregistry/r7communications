'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { BarChart3, ChevronRight, Hash, Award, Building2 } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { StatsCards } from '@/components/memo/StatsCards'
import { ProcessingOverview } from '@/components/admin/ProcessingOverview'
import { useAuth } from '@/contexts/AuthContext'
import { useMemos } from '@/hooks/useMemos'
import { subscribeToMemoCounters } from '@/lib/memo-service'
import { cn } from '@/lib/utils'
import type { MemoType } from '@/types'

const COUNTER_TYPES: { type: MemoType; label: string }[] = [
  { type: 'PO',              label: 'Provincial Office'    },
  { type: 'CO',              label: 'Central Office'       },
  { type: 'Office Order',    label: 'Office Order'         },
  { type: 'Advisory',        label: 'Advisory'             },
  { type: 'AdvisoryBulletin',label: 'Advisory Bulletin'   },
  { type: 'Bulletin',        label: 'Bulletin'             },
  { type: 'Acknowledgment',  label: 'Acknowledgment'       },
]

// Gradient palette for the KPI cards — mirrors the dashboard StatsCards design.
const KPI_PALETTE = [
  { gradient: 'from-blue-100 to-blue-300 dark:from-blue-900/40 dark:to-blue-800/40',       text: 'text-blue-900 dark:text-blue-100',     icon: 'text-blue-600' },
  { gradient: 'from-indigo-100 to-indigo-300 dark:from-indigo-900/40 dark:to-indigo-800/40', text: 'text-indigo-900 dark:text-indigo-100', icon: 'text-indigo-600' },
  { gradient: 'from-pink-100 to-pink-300 dark:from-pink-900/40 dark:to-pink-800/40',       text: 'text-pink-900 dark:text-pink-100',     icon: 'text-pink-600' },
  { gradient: 'from-amber-100 to-amber-300 dark:from-amber-900/40 dark:to-amber-800/40',    text: 'text-amber-900 dark:text-amber-100',   icon: 'text-amber-600' },
  { gradient: 'from-emerald-100 to-emerald-300 dark:from-emerald-900/40 dark:to-emerald-800/40', text: 'text-emerald-900 dark:text-emerald-100', icon: 'text-emerald-600' },
  { gradient: 'from-purple-100 to-purple-300 dark:from-purple-900/40 dark:to-purple-800/40', text: 'text-purple-900 dark:text-purple-100', icon: 'text-purple-600' },
  { gradient: 'from-orange-100 to-orange-300 dark:from-orange-900/40 dark:to-orange-800/40', text: 'text-orange-900 dark:text-orange-100', icon: 'text-orange-600' },
  { gradient: 'from-cyan-100 to-cyan-300 dark:from-cyan-900/40 dark:to-cyan-800/40',       text: 'text-cyan-900 dark:text-cyan-100',     icon: 'text-cyan-600' },
  { gradient: 'from-rose-100 to-rose-300 dark:from-rose-900/40 dark:to-rose-800/40',       text: 'text-rose-900 dark:text-rose-100',     icon: 'text-rose-600' },
  { gradient: 'from-teal-100 to-teal-300 dark:from-teal-900/40 dark:to-teal-800/40',       text: 'text-teal-900 dark:text-teal-100',     icon: 'text-teal-600' },
]

const CURRENT_YEAR = new Date().getFullYear()

// Admin home: replaces the Dashboard for admins (non-admins keep /dashboard).
export default function OverviewPage() {
  const { user, userData, loading: authLoading } = useAuth()
  const router = useRouter()
  const { memos, loading: memosLoading } = useMemos()

  const [counters, setCounters]         = useState<Partial<Record<MemoType, number>>>({})
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR)

  useEffect(() => {
    if (!authLoading && !user) { router.replace('/login'); return }
    if (!authLoading && userData && userData.role !== 'admin') { router.replace('/dashboard') }
  }, [authLoading, user, userData, router])

  // Subscribe to memo number counters in real time
  useEffect(() => {
    const types = COUNTER_TYPES.map(c => c.type)
    const unsubscribe = subscribeToMemoCounters(types, setCounters)
    return unsubscribe
  }, [])

  // Available years from memo data (+ current year always included)
  const availableYears = useMemo(() => {
    const years = new Set<number>([CURRENT_YEAR])
    memos.forEach(m => {
      const d = m.createdAt?.toDate ? m.createdAt.toDate() : new Date(m.createdAt)
      if (!isNaN(d.getTime())) years.add(d.getFullYear())
    })
    return Array.from(years).sort((a, b) => b - a)
  }, [memos])

  // Memos filtered to the selected year
  const yearMemos = useMemo(() => {
    return memos.filter(m => {
      const d = m.createdAt?.toDate ? m.createdAt.toDate() : new Date(m.createdAt)
      return !isNaN(d.getTime()) && d.getFullYear() === selectedYear
    })
  }, [memos, selectedYear])

  const stats = useMemo(() => ({
    total:    yearMemos.length,
    pending:  yearMemos.filter(m => m.status === 'pending').length,
    signed:   yearMemos.filter(m => m.status === 'signed').length,
    approved: yearMemos.filter(m => m.status === 'approved').length,
    archived: yearMemos.filter(m => m.status === 'archived').length,
  }), [yearMemos])

  const deptStats = useMemo(() => (
    ['ORD', 'ROD', 'FASD'].map(d => ({
      dept: d,
      total: yearMemos.filter(m => m.department === d).length,
    }))
  ), [yearMemos])

  if (authLoading) return null

  return (
    <DashboardLayout title="Overview">
      <div className="space-y-5">

        {/* ── Title bar ── */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <BarChart3 className="h-4 w-4 text-blue-600 shrink-0" />
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Overview</span>
          <ChevronRight className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600 hidden sm:inline" />
          <span className="hidden sm:inline text-xs text-gray-400 dark:text-gray-500 truncate">{userData?.username}</span>
          <span className="hidden sm:inline h-3.5 w-px bg-gray-200 dark:bg-gray-700 mx-0.5" />
          {/* Year selector */}
          <div className="flex items-center gap-1 flex-wrap">
            {availableYears.map(year => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={cn(
                  'h-6 px-2.5 rounded-md text-xs font-semibold transition-colors',
                  selectedYear === year
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                )}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        <StatsCards stats={stats} />

        {/* ── Memo number counters + department totals ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            Memo numbers and department totals
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {[
              ...COUNTER_TYPES.map(({ type, label }) => ({
                key: type,
                label,
                value: counters[type] ?? '—',
                icon: type === 'Acknowledgment' ? <Award /> : <Hash />,
              })),
              ...deptStats.map(d => ({
                key: d.dept,
                label: `${d.dept} Total`,
                value: memosLoading ? '—' : d.total,
                icon: <Building2 />,
              })),
            ].map((card, i) => {
              const c = KPI_PALETTE[i % KPI_PALETTE.length]
              return (
                <motion.div
                  key={card.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }}
                  whileHover={{ scale: 1.04, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className={cn(
                    'rounded-2xl bg-gradient-to-br shadow-sm hover:shadow-lg transition-shadow duration-300 cursor-default',
                    c.gradient
                  )}
                >
                  <div className="p-4 flex items-center gap-3">
                    <div className="h-11 w-11 shrink-0 rounded-full bg-white/90 shadow-sm flex items-center justify-center">
                      <span className={cn('[&>svg]:h-5 [&>svg]:w-5', c.icon)}>{card.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <p className={cn('text-xs font-semibold leading-tight truncate', c.text)}>{card.label}</p>
                      <p className={cn('text-2xl font-extrabold leading-none mt-1 font-mono', c.text)}>
                        {card.value}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </section>

        <ProcessingOverview memos={yearMemos} year={selectedYear} loading={memosLoading} />
      </div>
    </DashboardLayout>
  )
}
