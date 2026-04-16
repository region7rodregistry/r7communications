'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────────

interface OldRecord {
  'Date Logged'?: string | null
  'Date Issued'?: string | null
  'Memo No.'?: string | number | null
  'Memo to'?: string | null
  'Subject'?: string | null
  'Date/Time Released to ROD/FASD'?: string | null
  'Date/Time Received by ROD/FASD'?: string | null
  'Action Taken'?: string | null
  [key: string]: any
}

type YearData = Record<string, OldRecord[]>

// ── Constants ─────────────────────────────────────────────────────────────────

const YEARS = ['2025', '2024', '2023', '2022', '2021', '2020'] as const
const SKIP_SHEETS = new Set(['Sheet1', 'list'])
const PAGE_SIZE = 50

// Friendly display labels for category keys
const CATEGORY_LABELS: Record<string, string> = {
  'Central Office': 'Central Office',
  'Operating Units ': 'Operating Units',
  'Operating Units': 'Operating Units',
  'Acknowledgement ': 'Acknowledgement',
  'Acknowledgement': 'Acknowledgement',
  'Office Order': 'Office Order',
  'RO 7 Advisory&Bulletin ': 'Advisory & Bulletin',
  'RO 7 Advisory&Bulletin': 'Advisory & Bulletin',
  'TESDA Circular': 'TESDA Circular',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCell(val: string | number | null | undefined): string {
  if (val == null) return '—'
  return String(val).replace(/\n/g, ' · ').trim() || '—'
}

function rowMatchesSearch(row: OldRecord, q: string): boolean {
  if (!q) return true
  const lower = q.toLowerCase()
  return Object.values(row).some(
    (v) => v != null && String(v).toLowerCase().includes(lower)
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function OldSystemPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [year, setYear] = useState<string>('2025')
  const [yearData, setYearData] = useState<YearData | null>(null)
  const [fetchLoading, setFetchLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  /* ── Auth guard ── */
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [authLoading, user, router])

  /* ── Load year JSON ── */
  useEffect(() => {
    setFetchLoading(true)
    setFetchError(null)
    setYearData(null)
    setPage(1)
    setSearch('')

    fetch(`/old-records-${year}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load ${year} records (${r.status})`)
        return r.json()
      })
      .then((data: YearData) => {
        setYearData(data)
        // Set first non-skipped category as active
        const firstKey = Object.keys(data).find((k) => !SKIP_SHEETS.has(k))
        setActiveCategory(firstKey || '')
        setFetchLoading(false)
      })
      .catch((err: Error) => {
        setFetchError(err.message)
        setFetchLoading(false)
      })
  }, [year])

  /* ── Reset page on category / search change ── */
  useEffect(() => { setPage(1) }, [activeCategory, search])

  /* ── Derived data ── */
  const categories = useMemo(() => {
    if (!yearData) return []
    return Object.keys(yearData).filter((k) => !SKIP_SHEETS.has(k))
  }, [yearData])

  const rawRows: OldRecord[] = useMemo(() => {
    if (!yearData || !activeCategory) return []
    return yearData[activeCategory] ?? []
  }, [yearData, activeCategory])

  const filteredRows = useMemo(
    () => rawRows.filter((r) => rowMatchesSearch(r, search)),
    [rawRows, search]
  )

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const goPage = useCallback((p: number) => setPage(Math.max(1, Math.min(totalPages, p))), [totalPages])

  if (authLoading) return null

  return (
    <DashboardLayout title="Old Records" fullHeight>
      <div className="h-full flex flex-col gap-3 min-h-0">

        {/* ── Header row ── */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap">
          <Link href="/admin">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">Old Records (Outgoing)</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">Historical memo log — read only</p>
          </div>
          {/* Search */}
          <div className="relative w-full sm:w-52 order-last sm:order-none">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 pl-8 text-xs"
            />
          </div>
        </div>

        {/* ── Year pills ── */}
        <div className="flex gap-1.5 shrink-0 flex-wrap">
          {YEARS.map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-semibold border transition-colors',
                y === year
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-gray-700'
              )}
            >
              {y}
            </button>
          ))}
        </div>

        {/* ── Category tabs ── */}
        {categories.length > 0 && (
          <div className="flex gap-1 flex-wrap shrink-0">
            {categories.map((cat) => {
              const label = CATEGORY_LABELS[cat] ?? cat.trim()
              const count = yearData?.[cat]?.length ?? 0
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors',
                    cat === activeCategory
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  )}
                >
                  {label}
                  <span className={cn(
                    'text-[10px] font-bold rounded-full px-1.5 leading-4',
                    cat === activeCategory
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  )}>
                    {count.toLocaleString()}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* ── Table area ── */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {fetchLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <span className="ml-2 text-sm text-gray-500">Loading {year} records…</span>
            </div>
          ) : fetchError ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-red-500">{fetchError}</p>
            </div>
          ) : (
            <>
              {/* Row count */}
              <div className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-800 shrink-0 flex items-center justify-between">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {filteredRows.length.toLocaleString()} record{filteredRows.length !== 1 ? 's' : ''}
                  {search && ` matching "${search}"`}
                </p>
                {totalPages > 1 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Page {page} of {totalPages}
                  </p>
                )}
              </div>

              {/* Table */}
              <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full text-xs border-collapse" style={{ minWidth: '1100px' }}>
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                      <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap" style={{ minWidth: 90 }}>Date Logged</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap" style={{ minWidth: 90 }}>Date Issued</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap" style={{ minWidth: 70 }}>Memo No.</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400" style={{ minWidth: 160 }}>Memo To</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400" style={{ minWidth: 100 }}>From</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400" style={{ minWidth: 260 }}>Subject</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400" style={{ minWidth: 140 }}>Received by ROD/FASD</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400" style={{ minWidth: 120 }}>Action Taken</th>
                    </tr>
                  </thead>
                  <AnimatePresence mode="wait">
                    <motion.tbody
                      key={`${year}-${activeCategory}-${page}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      {pageRows.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                            No records found.
                          </td>
                        </tr>
                      ) : (
                        pageRows.map((row, i) => (
                          <motion.tr
                            key={i}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.008, duration: 0.15 }}
                            className="border-b border-gray-100 dark:border-gray-800 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors"
                          >
                            {/* Date Logged */}
                            <td className="px-2 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                              {formatCell(row['Date Logged'])}
                            </td>
                            {/* Date Issued */}
                            <td className="px-2 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                              {formatCell(row['Date Issued'])}
                            </td>
                            {/* Memo No. */}
                            <td className="px-2 py-2 font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                              {formatCell(row['Memo No.'])}
                            </td>
                            {/* Memo To (recipient) */}
                            <td className="px-2 py-2 text-gray-700 dark:text-gray-300 max-w-[160px]">
                              <span className="line-clamp-2 text-[11px]" title={String(row['Memo to'] ?? '')}>
                                {formatCell(row['Memo to'])}
                              </span>
                            </td>
                            {/* From — the "Subject" field in JSON holds the signatory name */}
                            <td className="px-2 py-2 text-gray-600 dark:text-gray-400">
                              {formatCell(row['Subject'])}
                            </td>
                            {/* Subject — misleadingly stored in "Date/Time Released to ROD/FASD" field */}
                            <td className="px-2 py-2 text-gray-700 dark:text-gray-300 max-w-[260px]">
                              <span className="line-clamp-3 text-[11px]" title={String(row['Date/Time Released to ROD/FASD'] ?? '')}>
                                {formatCell(row['Date/Time Released to ROD/FASD'])}
                              </span>
                            </td>
                            {/* Received by ROD/FASD */}
                            <td className="px-2 py-2 text-gray-600 dark:text-gray-400 whitespace-pre-wrap text-[11px]">
                              {formatCell(row['Date/Time Received by ROD/FASD'])}
                            </td>
                            {/* Action Taken */}
                            <td className="px-2 py-2 text-gray-500 dark:text-gray-500 italic">
                              {formatCell(row['Action Taken'])}
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </motion.tbody>
                  </AnimatePresence>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="shrink-0 flex items-center justify-center gap-1 py-2 border-t border-gray-100 dark:border-gray-800">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-6 w-6"
                    disabled={page === 1}
                    onClick={() => goPage(page - 1)}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>

                  {(() => {
                    const pages: (number | '…')[] = []
                    const delta = 2
                    const left = page - delta
                    const right = page + delta
                    let last = 0
                    for (let p = 1; p <= totalPages; p++) {
                      if (p === 1 || p === totalPages || (p >= left && p <= right)) {
                        if (last && p - last > 1) pages.push('…')
                        pages.push(p)
                        last = p
                      }
                    }
                    return pages.map((p, i) =>
                      p === '…' ? (
                        <span key={`e${i}`} className="text-xs text-gray-400 px-1">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => goPage(p as number)}
                          className={cn(
                            'h-6 min-w-[1.5rem] px-1.5 rounded text-xs font-medium border transition-colors',
                            p === page
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                          )}
                        >
                          {p}
                        </button>
                      )
                    )
                  })()}

                  <Button
                    variant="outline"
                    size="icon"
                    className="h-6 w-6"
                    disabled={page === totalPages}
                    onClick={() => goPage(page + 1)}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
