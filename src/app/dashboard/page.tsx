'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { PlusCircle, Clock, PenLine, CheckCircle, Archive, Inbox } from 'lucide-react'
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
import type { Memo, MemoStatus, AttachmentFilter } from '@/types'

const INACTIVITY_MS = 15 * 60 * 1000

const STATUS_TABS: { value: MemoStatus; label: string; icon: React.ReactNode }[] = [
  { value: 'pending',  label: 'Pending',  icon: <Clock className="h-3.5 w-3.5" /> },
  { value: 'signed',   label: 'Signed',   icon: <PenLine className="h-3.5 w-3.5" /> },
  { value: 'approved', label: 'Approved', icon: <CheckCircle className="h-3.5 w-3.5" /> },
  { value: 'archived', label: 'Archive',  icon: <Archive className="h-3.5 w-3.5" /> },
]

// Staff dashboard. Admins are sent to /overview instead.
export default function DashboardPage() {
  const { user, userData, loading: authLoading, logout } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { memos, loading: memosLoading, stats } = useMemos(userData?.department)

  const isAdmin = userData?.role === 'admin'
  /** Only ROD, FASD and ORD confirm receipt of released documents. */
  const canReceive = ['ROD', 'FASD', 'ORD'].includes(userData?.department ?? '')

  const [search, setSearch]           = useState('')
  const [dateFrom, setDateFrom]       = useState('')
  const [dateTo, setDateTo]           = useState('')
  const [attachment, setAttachment]   = useState<AttachmentFilter>('all')
  const [activeTab, setActiveTab]     = useState<MemoStatus>('pending')
  const [createOpen, setCreateOpen]   = useState(false)

  const displayStats = useMemo(() => ({
    total:    memos.length,
    pending:  memos.filter(m => m.status === 'pending').length,
    signed:   memos.filter(m => m.status === 'signed').length,
    approved: memos.filter(m => m.status === 'approved').length,
    archived: memos.filter(m => m.status === 'archived').length,
  }), [memos])

  /** Approved memos released by admin but not yet acknowledged — user must click Receive and enter a name. */
  const awaitingReceiptCount = useMemo(() => {
    if (!canReceive) return 0
    return memos.filter(
      m =>
        m.status === 'approved' &&
        m.releasedToRodFasd &&
        !m.receivedByRodFasd
    ).length
  }, [memos, canReceive])

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

  /* ── Auth guard — admins use the Overview page instead of this dashboard ── */
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
    else if (!authLoading && isAdmin) router.replace('/overview')
  }, [authLoading, user, isAdmin, router])

  const filterMemos = useCallback((tabStatus: MemoStatus) => {
    return memos.filter((m) => {
      if (m.status !== tabStatus) return false
      if (attachment === 'with' && !m.pdfUrl) return false
      if (attachment === 'without' && m.pdfUrl) return false
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
  }, [memos, search, dateFrom, dateTo, attachment])

  const handleMarkReceived = async (memoId: string, receivedByName: string) => {
    try {
      await updateMemo(memoId, {
        receivedByRodFasd: new Date(),
        receivedByName,
      })
      await logMemoActivity(memoId, 'Received Memo', userData?.username || userData?.email || 'user')
      toast({ title: 'Memo marked as received', variant: 'success' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      toast({ title: 'Error', description: message, variant: 'error' })
    }
  }

  // Admins are being redirected to /overview — render nothing meanwhile
  if (authLoading || isAdmin) return null

  return (
    <DashboardLayout title="Dashboard" fullHeight>
      <div className="h-full flex flex-col gap-2 min-h-0">

        {/* ── Row 1: Title bar ── */}
        <div className="flex items-center justify-between gap-2 shrink-0 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                {userData?.department} Dashboard
              </h1>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{userData?.username}</p>
            </div>
          </div>
          <Button size="sm" className="h-7 text-xs px-2.5" onClick={() => setCreateOpen(true)}>
            <PlusCircle className="h-3.5 w-3.5 mr-1" />
            New Memo
          </Button>
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
            attachment={attachment} onAttachmentChange={setAttachment}
            compact
          />
        </div>

        {/* Released memos waiting for ROD/FASD (or your office) to confirm receipt */}
        {awaitingReceiptCount > 0 && (
          <div
            className="shrink-0 rounded-xl border border-purple-200/90 dark:border-purple-800/70 bg-purple-50/80 dark:bg-purple-950/30 px-3 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
            role="status"
          >
            <div className="flex items-start gap-2 min-w-0">
              <Inbox className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
              <div className="min-w-0 text-xs sm:text-sm text-purple-900 dark:text-purple-100">
                <p className="font-semibold">
                  {awaitingReceiptCount} document{awaitingReceiptCount !== 1 ? 's' : ''} ready to receive
                </p>
                <p className="text-purple-800/90 dark:text-purple-200/90 mt-0.5 leading-snug">
                  Open the <strong>Approved</strong> tab. Use <strong>Receive</strong> on each row, then type who received it.
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="shrink-0 h-8 text-xs border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-900 hover:bg-purple-100/80 dark:hover:bg-purple-900/40"
              onClick={() => setActiveTab('approved')}
            >
              Open Approved tab
            </Button>
          </div>
        )}

        {/* ── Row 4+: Tabs — fills remaining height ── */}
        <Tabs
          value={activeTab}
          onValueChange={v => setActiveTab(v as MemoStatus)}
          className="flex-1 min-h-0 flex flex-col overflow-hidden"
        >
          <TabsList className="shrink-0 w-full justify-start h-8 gap-0.5 bg-gray-100/80 dark:bg-gray-800/80 px-1 overflow-x-auto">
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
                  canReceive={canReceive}
                  defaultReceiverName={userData?.username ?? ''}
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
