'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { PlusCircle, Clock, PenLine, CheckCircle, Archive } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { StatsCards } from '@/components/memo/StatsCards'
import { MemoFilters } from '@/components/memo/MemoFilters'
import { MemoTable } from '@/components/memo/MemoTable'
import { CreateMemoModal } from '@/components/memo/CreateMemoModal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useMemos } from '@/hooks/useMemos'
import { updateMemo, logMemoActivity } from '@/lib/memo-service'
import { useToast } from '@/components/ui/toast'
import type { Memo, MemoStatus } from '@/types'

const INACTIVITY_MS = 15 * 60 * 1000

const ALL_STATUS_TABS: { value: MemoStatus; label: string; icon: React.ReactNode }[] = [
  { value: 'pending',  label: 'Pending',  icon: <Clock className="h-3.5 w-3.5" /> },
  { value: 'signed',   label: 'Signed',   icon: <PenLine className="h-3.5 w-3.5" /> },
  { value: 'approved', label: 'Approved', icon: <CheckCircle className="h-3.5 w-3.5" /> },
  { value: 'archived', label: 'Archive',  icon: <Archive className="h-3.5 w-3.5" /> },
]

const ADMIN_STATUS_TABS: { value: MemoStatus; label: string; icon: React.ReactNode }[] = [
  { value: 'archived', label: 'Archive',  icon: <Archive className="h-3.5 w-3.5" /> },
]

export default function DashboardPage() {
  const { user, userData, loading: authLoading, logout } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { memos, loading: memosLoading, stats } = useMemos(userData?.department)

  const isAdmin = userData?.role === 'admin'
  const STATUS_TABS = isAdmin ? ADMIN_STATUS_TABS : ALL_STATUS_TABS

  const currentYear = new Date().getFullYear()
  const [search, setSearch]           = useState('')
  const [dateFrom, setDateFrom]       = useState('')
  const [dateTo, setDateTo]           = useState('')
  const [activeTab, setActiveTab]     = useState<MemoStatus>(isAdmin ? 'archived' : 'pending')
  const [createOpen, setCreateOpen]   = useState(false)
  const [selectedYear, setSelectedYear] = useState(currentYear)

  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear])
    memos.forEach(m => {
      const d = m.createdAt?.toDate ? m.createdAt.toDate() : new Date(m.createdAt)
      if (!isNaN(d.getTime())) years.add(d.getFullYear())
    })
    return Array.from(years).sort((a, b) => b - a)
  }, [memos, currentYear])

  const yearMemos = useMemo(() => {
    if (!isAdmin) return memos
    return memos.filter(m => {
      const d = m.createdAt?.toDate ? m.createdAt.toDate() : new Date(m.createdAt)
      return !isNaN(d.getTime()) && d.getFullYear() === selectedYear
    })
  }, [memos, isAdmin, selectedYear])

  const displayStats = useMemo(() => ({
    total:    yearMemos.length,
    pending:  yearMemos.filter(m => m.status === 'pending').length,
    signed:   yearMemos.filter(m => m.status === 'signed').length,
    approved: yearMemos.filter(m => m.status === 'approved').length,
    archived: yearMemos.filter(m => m.status === 'archived').length,
  }), [yearMemos])

  /* ── Inactivity timeout ──
     Keep refs to the latest logout/toast so the effect never needs to
     re-run when those function references change. The timer is set up
     exactly once (empty dep array), preventing overlapping timers. */
  const logoutRef = useRef(logout)
  const toastRef  = useRef(toast)
  useEffect(() => { logoutRef.current = logout }, [logout])
  useEffect(() => { toastRef.current  = toast  }, [toast])

  useEffect(() => {
    let timer: NodeJS.Timeout
    const reset = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        toastRef.current({ title: 'Session expired', description: 'You have been logged out due to inactivity.', variant: 'warning' })
        logoutRef.current()
      }, INACTIVITY_MS)
    }
    reset()
    window.addEventListener('mousemove', reset)
    window.addEventListener('keydown', reset)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('mousemove', reset)
      window.removeEventListener('keydown', reset)
    }
  }, []) // intentionally empty — refs keep the callbacks current

  /* ── Auth guard ── */
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [authLoading, user, router])

  const filterMemos = useCallback((tabStatus: MemoStatus) => {
    return yearMemos.filter((m) => {
      if (m.status !== tabStatus) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !m.memoNumber?.toLowerCase().includes(q) &&
          !m.title?.toLowerCase().includes(q) &&
          !m.authorFocal?.toLowerCase().includes(q)
        ) return false
      }
      if (dateFrom) {
        const d = m.createdAt?.toDate ? m.createdAt.toDate() : new Date(m.createdAt)
        if (d < new Date(dateFrom)) return false
      }
      if (dateTo) {
        const d = m.createdAt?.toDate ? m.createdAt.toDate() : new Date(m.createdAt)
        if (d > new Date(dateTo + 'T23:59:59')) return false
      }
      return true
    })
  }, [yearMemos, search, dateFrom, dateTo])

  const handleMarkReceived = async (memoId: string) => {
    try {
      await updateMemo(memoId, {
        receivedByRodFasd: new Date(),
        receivedByName: userData?.username || 'unknown',
      })
      await logMemoActivity(memoId, 'Marked as received', userData?.username || 'unknown')
      toast({ title: 'Memo marked as received', variant: 'success' })
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'error' })
    }
  }

  if (authLoading) return null

  return (
    <DashboardLayout title="Dashboard" fullHeight>
      <div className="h-full flex flex-col gap-2 min-h-0">

        {/* ── Row 1: Title bar ── */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div>
              <h1 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {userData?.department} Dashboard
              </h1>
              <p className="text-xs text-gray-400 dark:text-gray-500">{userData?.username}</p>
            </div>
            {isAdmin && (
              <>
                <span className="h-3.5 w-px bg-gray-200 dark:bg-gray-700" />
                <div className="flex items-center gap-1">
                  {availableYears.map(year => (
                    <button
                      key={year}
                      onClick={() => setSelectedYear(year)}
                      className={[
                        'h-6 px-2.5 rounded-md text-xs font-semibold transition-colors',
                        selectedYear === year
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
                      ].join(' ')}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {!isAdmin && (
            <Button size="sm" className="h-7 text-xs px-2.5" onClick={() => setCreateOpen(true)}>
              <PlusCircle className="h-3.5 w-3.5 mr-1" />
              New Memo
            </Button>
          )}
        </div>

        {/* ── Row 2: Stats cards ── */}
        <div className="shrink-0">
          <StatsCards stats={displayStats} />
        </div>

        {/* ── Row 3: Filters ── */}
        <div className="shrink-0">
          <MemoFilters
            search={search} onSearchChange={setSearch}
            status="all" onStatusChange={() => {}}
            dateFrom={dateFrom} onDateFromChange={setDateFrom}
            dateTo={dateTo} onDateToChange={setDateTo}
            compact
          />
        </div>

        {/* ── Row 4+: Tabs — fills remaining height ── */}
        <Tabs
          value={activeTab}
          onValueChange={v => setActiveTab(v as MemoStatus)}
          className="flex-1 min-h-0 flex flex-col overflow-hidden"
        >
          <TabsList className="shrink-0 w-full justify-start h-8 gap-0.5 bg-gray-100/80 dark:bg-gray-800/80 px-1">
            {STATUS_TABS.map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex items-center gap-1.5 h-6 px-3 text-xs data-[state=active]:shadow-sm"
              >
                {tab.icon}
                {tab.label}
                {(displayStats as any)[tab.value] > 0 && (
                  <span className="ml-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold rounded-full px-1.5 leading-4">
                    {(displayStats as any)[tab.value]}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {STATUS_TABS.map(tab => (
            <TabsContent
              key={tab.value}
              value={tab.value}
              className="flex-1 min-h-0 flex flex-col mt-2 data-[state=inactive]:hidden overflow-hidden"
            >
              {/* Count row */}
              <p className="text-xs text-gray-400 dark:text-gray-500 shrink-0 mb-1.5">
                {filterMemos(tab.value).length} memo{filterMemos(tab.value).length !== 1 ? 's' : ''}
              </p>

              {/* Table */}
              <div className="flex-1 min-h-0">
                <MemoTable
                  fluid
                  memos={filterMemos(tab.value)}
                  loading={memosLoading}
                  onMarkReceived={handleMarkReceived}
                  emptyMessage={`No ${tab.label.toLowerCase()} memos.`}
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>

      </div>
      <CreateMemoModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </DashboardLayout>
  )
}
