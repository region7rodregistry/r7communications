'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trash2, Download, RefreshCw, Shield,
  Settings2, X, Clock, CheckCircle,
  Archive, XCircle, PenLine, ChevronRight, FolderOpen
} from 'lucide-react'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { MemoFilters } from '@/components/memo/MemoFilters'
import { MemoTable } from '@/components/memo/MemoTable'
import { LogSheetTable } from '@/components/memo/LogSheetTable'
import { MemoNumberEditor } from '@/components/memo/MemoNumberEditor'
import { PdfUpload } from '@/components/memo/PdfUpload'
import { StatusChangeModal } from '@/components/shared/StatusChangeModal'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useMemos } from '@/hooks/useMemos'
import {
  updateMemoStatus, updateMemo, deleteMemoFromFirestore,
  deleteActivityLogsForMemos, cleanupOrphanedActivityLogs,
  logMemoActivity, getCurrentMemoNumber,
} from '@/lib/memo-service'
import { useToast } from '@/components/ui/toast'
import { formatDate, cn } from '@/lib/utils'
import type { Memo, MemoStatus, MemoType } from '@/types'

const COUNTER_TYPES: { type: MemoType; label: string }[] = [
  { type: 'PO',              label: 'Provincial Office'    },
  { type: 'CO',              label: 'Central Office'       },
  { type: 'Office Order',    label: 'Office Order'         },
  { type: 'Advisory',        label: 'Advisory'             },
  { type: 'AdvisoryBulletin',label: 'Advisory Bulletin'   },
  { type: 'Bulletin',        label: 'Bulletin'             },
  { type: 'Acknowledgment',  label: 'Acknowledgment'       },
]

const STATUS_TABS: { value: MemoStatus; label: string; icon: React.ReactNode }[] = [
  { value: 'pending',   label: 'Pending',   icon: <Clock className="h-3.5 w-3.5" /> },
  { value: 'signed',    label: 'Signed',    icon: <PenLine className="h-3.5 w-3.5" /> },
  { value: 'approved',  label: 'Approved',  icon: <CheckCircle className="h-3.5 w-3.5" /> },
  { value: 'cancelled', label: 'Cancelled', icon: <XCircle className="h-3.5 w-3.5" /> },
  { value: 'archived',  label: 'Archive',   icon: <Archive className="h-3.5 w-3.5" /> },
]

const CURRENT_YEAR = new Date().getFullYear()

export default function AdminPage() {
  const { user, userData, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { memos, loading: memosLoading } = useMemos()

  const [search, setSearch]               = useState('')
  const [memoTypeFilter, setMemoTypeFilter] = useState('all')
  const [dateFrom, setDateFrom]           = useState('')
  const [dateTo, setDateTo]               = useState('')
  const [activeTab, setActiveTab]         = useState<MemoStatus>('pending')
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set())
  const [logSheetMode, setLogSheetMode]   = useState(false)
  const [toolsOpen, setToolsOpen]         = useState(false)
  const [pdfMemoId, setPdfMemoId]         = useState('')
  const [counters, setCounters]           = useState<Partial<Record<MemoType, number>>>({})
  const [selectedYear, setSelectedYear]   = useState(CURRENT_YEAR)

  // Load memo number counters
  useEffect(() => {
    Promise.all(
      COUNTER_TYPES.map(async ({ type }) => [type, await getCurrentMemoNumber(type)] as [MemoType, number])
    ).then(entries => setCounters(Object.fromEntries(entries))).catch(() => {})
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

  // Stats derived from year-filtered memos
  const stats = useMemo(() => ({
    total:     yearMemos.length,
    pending:   yearMemos.filter(m => m.status === 'pending').length,
    signed:    yearMemos.filter(m => m.status === 'signed').length,
    approved:  yearMemos.filter(m => m.status === 'approved').length,
    cancelled: yearMemos.filter(m => m.status === 'cancelled').length,
    archived:  yearMemos.filter(m => m.status === 'archived').length,
  }), [yearMemos])

  // Modals
  const [statusModal, setStatusModal] = useState<{ open: boolean; memo: Memo | null }>({ open: false, memo: null })
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; memoId: string | null }>({ open: false, memoId: null })
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false)
  const [cleanupModal, setCleanupModal]   = useState(false)

  useEffect(() => {
    if (!authLoading && !user) { router.replace('/login'); return }
    if (!authLoading && userData && userData.role !== 'admin') { router.replace('/dashboard') }
  }, [authLoading, user, userData, router])

  // Clear selection and exit log sheet mode when tab changes
  useEffect(() => {
    setSelectedIds(new Set())
    if (activeTab !== 'approved') setLogSheetMode(false)
  }, [activeTab])

  const filterMemos = useCallback((tabStatus: MemoStatus) => {
    return yearMemos.filter((m) => {
      if (m.status !== tabStatus) return false
      if (memoTypeFilter !== 'all' && m.memoType !== memoTypeFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !m.memoNumber?.toLowerCase().includes(q) &&
          !m.title?.toLowerCase().includes(q) &&
          !m.department?.toLowerCase().includes(q) &&
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
  }, [yearMemos, search, memoTypeFilter, dateFrom, dateTo])

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleToggleSelectAll = (ids: string[]) => {
    setSelectedIds(prev => {
      const allSelected = ids.every(id => prev.has(id))
      const next = new Set(prev)
      if (allSelected) ids.forEach(id => next.delete(id))
      else ids.forEach(id => next.add(id))
      return next
    })
  }

  const handleStatusChange = async (memoId: string, newStatus: MemoStatus) => {
    await updateMemoStatus(memoId, newStatus)
    await logMemoActivity(memoId, `Status changed to ${newStatus}`, userData?.username || 'admin')
    toast({ title: `Status updated to "${newStatus}"`, variant: 'success' })
  }

  const handleDelete = async (memoId: string) => {
    await deleteMemoFromFirestore(memoId)
    toast({ title: 'Memo deleted', variant: 'success' })
  }

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds)
    await deleteActivityLogsForMemos(ids)
    await Promise.all(ids.map(id => deleteMemoFromFirestore(id)))
    setSelectedIds(new Set())
    toast({ title: `${ids.length} memo(s) deleted`, variant: 'success' })
  }

  const handleMarkActionTaken = async (memoId: string, value: boolean) => {
    await updateMemo(memoId, {
      actionTaken: value,
      actionTakenAt: value ? new Date() : undefined,
      actionTakenBy: value ? (userData?.username ?? undefined) : undefined,
    } as any)
    if (value) await logMemoActivity(memoId, 'Action taken', userData?.username || 'admin')
    toast({ title: value ? 'Marked as action taken' : 'Cleared', variant: 'success' })
  }

  const handleMarkReceived = async (memoId: string) => {
    await updateMemo(memoId, {
      receivedByRodFasd: new Date(),
      receivedByName: userData?.username || 'admin',
    })
    await logMemoActivity(memoId, 'Marked as received', userData?.username || 'admin')
    toast({ title: 'Marked as received', variant: 'success' })
  }

  const handleRelease = async (memoId: string) => {
    await updateMemo(memoId, { releasedToRodFasd: new Date() })
    await logMemoActivity(memoId, `Released to ROD/FASD by ${userData?.username || 'admin'}`, userData?.username || 'admin')
    toast({ title: 'Memo released to ROD/FASD successfully', variant: 'success' })
  }

  const handleExportExcel = () => {
    const archived = filterMemos('archived')
    if (!archived.length) { toast({ title: 'No archived memos to export', variant: 'warning' }); return }
    const data = archived.map(m => ({
      'Memo No': m.memoNumber, Title: m.title, Type: m.memoType,
      Department: m.department, Status: m.status, Author: m.authorFocal,
      Signatory: m.signatory, 'Created At': formatDate(m.createdAt),
      Antedated: m.isAntedated ? 'Yes' : 'No', PDF: m.pdfUrl || '',
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Archived Memos')
    XLSX.writeFile(wb, `archived-memos-${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast({ title: 'Excel exported', variant: 'success' })
  }

  const handleCleanupLogs = async () => {
    const count = await cleanupOrphanedActivityLogs()
    toast({ title: `Cleaned up ${count} orphaned log(s)`, variant: 'success' })
  }

  const deptStats = useMemo(() => (
    ['ORD', 'ROD', 'FASD'].map(d => ({
      dept: d,
      total: yearMemos.filter(m => m.department === d).length,
    }))
  ), [yearMemos])


  if (authLoading) return null

  const logSheetMemos = filterMemos('approved').filter(m => m.receivedByRodFasd)

  return (
    <DashboardLayout title="Admin Portal" fullHeight>
      {/* Root: fills the entire main content area */}
      <div className="h-full flex flex-col gap-2 min-h-0">

        {/* ── Row 1: Title bar ── */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Shield className="h-4 w-4 text-blue-600 shrink-0" />
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Admin Portal</span>
            <ChevronRight className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
            <span className="text-xs text-gray-400 dark:text-gray-500">{userData?.username}</span>
            <span className="h-3.5 w-px bg-gray-200 dark:bg-gray-700 mx-0.5" />
            {/* Year selector */}
            <div className="flex items-center gap-1">
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
          <div className="flex items-center gap-1.5">
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <Button variant="destructive" size="sm" className="h-7 text-xs px-2.5"
                  onClick={() => setBulkDeleteModal(true)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Delete {selectedIds.size}
                </Button>
              </motion.div>
            )}
            <Link href="/old-system">
              <Button variant="outline" size="sm" className="h-7 text-xs px-2.5">
                <FolderOpen className="h-3.5 w-3.5 mr-1" />
                Old Records
              </Button>
            </Link>
            <Button variant="outline" size="sm" className="h-7 text-xs px-2.5"
              onClick={() => setToolsOpen(true)}>
              <Settings2 className="h-3.5 w-3.5 mr-1" />
              Tools
            </Button>
          </div>
        </div>

        {/* ── Row 2: Memo number counters ── */}
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          {COUNTER_TYPES.map(({ type, label }) => (
            <div
              key={type}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
            >
              <span className="text-gray-400 dark:text-gray-500 font-normal">{label}</span>
              <span className="font-bold font-mono text-blue-600 dark:text-blue-400">
                {counters[type] ?? '—'}
              </span>
            </div>
          ))}
          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5" />
          {deptStats.map(d => (
            <span key={d.dept}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
              <span className="font-semibold text-gray-700 dark:text-gray-300">{memosLoading ? '—' : d.total}</span>
              {d.dept}
            </span>
          ))}
        </div>

        {/* ── Row 3: Filters ── */}
        <div className="shrink-0">
          <MemoFilters
            search={search} onSearchChange={setSearch}
            status="all" onStatusChange={() => {}}
            dateFrom={dateFrom} onDateFromChange={setDateFrom}
            dateTo={dateTo} onDateToChange={setDateTo}
            showTypeFilter memoType={memoTypeFilter} onMemoTypeChange={setMemoTypeFilter}
            compact
          />
        </div>

        {/* ── Row 4+: Tabs — fills all remaining height ── */}
        <Tabs
          value={activeTab}
          onValueChange={v => setActiveTab(v as MemoStatus)}
          className="flex-1 min-h-0 flex flex-col overflow-hidden"
        >
          {/* Tab list */}
          <TabsList className="shrink-0 w-full justify-start h-8 gap-0.5 bg-gray-100/80 dark:bg-gray-800/80 px-1">
            {STATUS_TABS.map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex items-center gap-1.5 h-6 px-3 text-xs data-[state=active]:shadow-sm"
              >
                {tab.icon}
                {tab.label}
                {(stats as any)[tab.value] > 0 && (
                  <span className="ml-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold rounded-full px-1.5 leading-4">
                    {(stats as any)[tab.value]}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Each status tab */}
          {STATUS_TABS.map(tab => (
            <TabsContent
              key={tab.value}
              value={tab.value}
              className="flex-1 min-h-0 flex flex-col mt-2 data-[state=inactive]:hidden overflow-hidden"
            >
              {/* Tab toolbar row */}
              <div className="flex items-center justify-between mb-1.5 shrink-0 min-h-[28px]">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {filterMemos(tab.value).length} memo{filterMemos(tab.value).length !== 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-2">
                  {selectedIds.size > 0 && (
                    <Button variant="destructive" size="sm" className="h-6 text-xs px-2"
                      onClick={() => setBulkDeleteModal(true)}>
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete {selectedIds.size}
                    </Button>
                  )}
                  {tab.value === 'archived' && (
                    <Button variant="outline" size="sm" className="h-6 text-xs px-2"
                      onClick={handleExportExcel}>
                      <Download className="h-3 w-3 mr-1" />
                      Export
                    </Button>
                  )}
                  {/* Print Preview toggle — approved tab only */}
                  {tab.value === 'approved' && (
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Print Preview</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={logSheetMode}
                        onClick={() => setLogSheetMode(v => !v)}
                        className={cn(
                          'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none',
                          logSheetMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                        )}
                      >
                        <span
                          className={cn(
                            'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                            logSheetMode ? 'translate-x-4' : 'translate-x-0'
                          )}
                        />
                      </button>
                    </label>
                  )}
                </div>
              </div>

              {/* Table — fills remaining height, scrolls internally */}
              <div className="flex-1 min-h-0">
                <MemoTable
                  fluid
                  memos={filterMemos(tab.value)}
                  loading={memosLoading}
                  isAdmin
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onToggleSelectAll={handleToggleSelectAll}
                  onDelete={id => setDeleteModal({ open: true, memoId: id })}
                  onStatusChange={memo => setStatusModal({ open: true, memo })}
                  onMarkReceived={handleMarkReceived}
                  onMarkActionTaken={handleMarkActionTaken}
                  onRelease={tab.value === 'approved' ? handleRelease : undefined}
                  emptyMessage={`No ${tab.label.toLowerCase()} memos.`}
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* ── Tools slide-over panel ── */}
      <AnimatePresence>
        {toolsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 backdrop-blur-sm"
              onClick={() => setToolsOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed right-0 top-0 h-full w-[380px] bg-white dark:bg-gray-950 shadow-2xl border-l border-gray-100 dark:border-gray-800 z-50 flex flex-col"
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Admin Tools</span>
                </div>
                <button
                  onClick={() => setToolsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Panel content — scrollable */}
              <div className="flex-1 overflow-auto p-4 space-y-5">

                {/* Memo Number Management */}
                <section>
                  <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                    Memo Number Counters
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-3">
                    <MemoNumberEditor />
                  </div>
                </section>

                {/* PDF Upload */}
                <section>
                  <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                    Attach PDF to Memo
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-3 space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1.5">
                        Memo Document ID
                      </label>
                      <input
                        type="text"
                        placeholder="Paste memo ID here…"
                        value={pdfMemoId}
                        onChange={e => setPdfMemoId(e.target.value)}
                        className="flex h-8 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                      />
                    </div>
                    {pdfMemoId && (
                      <PdfUpload
                        memoId={pdfMemoId}
                        onUploaded={() => {
                          toast({ title: 'PDF uploaded', variant: 'success' })
                          setPdfMemoId('')
                        }}
                        onError={err => toast({ title: 'Upload failed', description: err, variant: 'error' })}
                      />
                    )}
                  </div>
                </section>

                {/* System Tools */}
                <section>
                  <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                    System Maintenance
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs justify-start"
                      onClick={() => { setCleanupModal(true); setToolsOpen(false) }}
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-2" />
                      Cleanup Orphaned Activity Logs
                    </Button>
                  </div>
                </section>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Modals ── */}
      <StatusChangeModal
        open={statusModal.open}
        memo={statusModal.memo}
        onClose={() => setStatusModal({ open: false, memo: null })}
        onConfirm={handleStatusChange}
      />
      <ConfirmModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, memoId: null })}
        onConfirm={() => handleDelete(deleteModal.memoId!)}
        title="Delete Memo"
        description="This cannot be undone. All activity logs for this memo will also be deleted."
        confirmLabel="Delete"
        variant="danger"
      />
      <ConfirmModal
        open={bulkDeleteModal}
        onClose={() => setBulkDeleteModal(false)}
        onConfirm={handleBulkDelete}
        title={`Delete ${selectedIds.size} Memo(s)`}
        description="All selected memos and their activity logs will be permanently deleted."
        confirmLabel={`Delete ${selectedIds.size}`}
        variant="danger"
      />
      <ConfirmModal
        open={cleanupModal}
        onClose={() => setCleanupModal(false)}
        onConfirm={handleCleanupLogs}
        title="Cleanup Orphaned Logs"
        description="This will scan and delete all activity logs that reference deleted memos."
        confirmLabel="Cleanup"
      />

      {/* ── Log Sheet / Print Preview overlay ── */}
      <AnimatePresence>
        {logSheetMode && activeTab === 'approved' && (
          <LogSheetTable
            memos={logSheetMemos}
            onRelease={handleRelease}
            onClose={() => setLogSheetMode(false)}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  )
}
