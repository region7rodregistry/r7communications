'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Eye, Trash2, ArrowUpDown, FileDown, CheckSquare, Square, Printer, SendHorizonal } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, formatDate, truncate } from '@/lib/utils'
import { STATUS_COLORS } from '@/types'
import type { Memo } from '@/types'

interface MemoTableProps {
  memos: Memo[]
  loading?: boolean
  isAdmin?: boolean
  fluid?: boolean
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  onToggleSelectAll?: (ids: string[]) => void
  onDelete?: (id: string) => void
  onStatusChange?: (memo: Memo) => void
  onMarkReceived?: (id: string) => void
  onMarkActionTaken?: (id: string, value: boolean) => void
  onRelease?: (id: string) => void
  emptyMessage?: string
}

const PAGE_SIZE = 10

export function MemoTable({
  memos, loading, isAdmin, fluid,
  selectedIds, onToggleSelect, onToggleSelectAll,
  onDelete, onStatusChange, onMarkReceived, onMarkActionTaken, onRelease,
  emptyMessage = 'No memos found.',
}: MemoTableProps) {
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState<keyof Memo>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const sorted = [...memos].sort((a, b) => {
    const av = a[sortField]
    const bv = b[sortField]
    if (!av && !bv) return 0
    if (!av) return 1
    if (!bv) return -1
    const aStr = av?.toDate ? av.toDate().toISOString() : String(av)
    const bStr = bv?.toDate ? bv.toDate().toISOString() : String(bv)
    return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
  })

  const total = sorted.length
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const toggleSort = (field: keyof Memo) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
    setPage(1)
  }

  const allSelected = paginated.length > 0 && paginated.every((m) => selectedIds?.has(m.id))

  if (loading) {
    return (
      <div className={cn('space-y-2', fluid && 'h-full')}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className={cn(fluid ? 'flex flex-col h-full min-h-0' : 'space-y-3')}>
      <div className={cn(
        'rounded-xl border border-gray-100 dark:border-gray-800',
        fluid ? 'flex-1 min-h-0 overflow-auto' : 'overflow-hidden'
      )}>
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80 dark:bg-gray-900/80">
              {isAdmin && onToggleSelectAll && (
                <TableHead className="w-10">
                  <button
                    onClick={() => onToggleSelectAll(paginated.map((m) => m.id))}
                    className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    {allSelected ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4" />}
                  </button>
                </TableHead>
              )}
              <TableHead>
                <button onClick={() => toggleSort('memoNumber')} className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100">
                  Memo No <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="hidden md:table-cell">
                <button onClick={() => toggleSort('memoType')} className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100">
                  Type <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="hidden sm:table-cell">
                <button onClick={() => toggleSort('createdAt')} className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100">
                  Date <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead className="hidden lg:table-cell">Dept</TableHead>}
              {onMarkActionTaken && isAdmin && <TableHead className="hidden xl:table-cell">Action Taken</TableHead>}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12 text-gray-400 dark:text-gray-600">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((memo, i) => (
                <motion.tr
                  key={memo.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={cn(
                    'border-b transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/50',
                    selectedIds?.has(memo.id) && 'bg-blue-50/50 dark:bg-blue-900/10'
                  )}
                >
                  {isAdmin && onToggleSelect && (
                    <TableCell className="w-10">
                      <button onClick={() => onToggleSelect(memo.id)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                        {selectedIds?.has(memo.id)
                          ? <CheckSquare className="h-4 w-4 text-blue-600" />
                          : <Square className="h-4 w-4" />}
                      </button>
                    </TableCell>
                  )}
                  <TableCell className="font-mono text-xs font-medium text-blue-700 dark:text-blue-400 whitespace-nowrap">
                    {memo.memoNumber}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {truncate(memo.title || '—', 50)}
                    </p>
                    {memo.pdfUrl && (
                      <a
                        href={memo.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline mt-0.5"
                      >
                        <FileDown className="h-3 w-3" />PDF
                      </a>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{memo.memoType}</span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {formatDate(memo.createdAt)}
                  </TableCell>
                  <TableCell>
                    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_COLORS[memo.status])}>
                      {memo.status}
                    </span>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="hidden lg:table-cell text-xs text-gray-500 dark:text-gray-400">
                      {memo.department}
                    </TableCell>
                  )}
                  {onMarkActionTaken && isAdmin && (
                    <TableCell className="hidden xl:table-cell">
                      <button
                        onClick={() => onMarkActionTaken(memo.id, !memo.actionTaken)}
                        className={cn(
                          'text-xs font-medium px-2 py-1 rounded-md transition-colors',
                          memo.actionTaken
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        )}
                      >
                        {memo.actionTaken ? 'Done' : 'Pending'}
                      </button>
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {/* View */}
                      <Link href={`/memo/${memo.id}`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="View">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </Link>

                      {/* Print — opens memo in new tab and triggers print */}
                      {isAdmin && (
                        <a href={`/memo/${memo.id}?print=1`} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800" title="Print">
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                      )}

                      {/* Release to ROD/FASD — approved memos not yet released */}
                      {isAdmin && onRelease && memo.status === 'approved' && !memo.releasedToRodFasd && (
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 text-xs px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                          onClick={() => onRelease(memo.id)}
                          title="Release to ROD/FASD"
                        >
                          <SendHorizonal className="h-3 w-3 mr-1" />
                          Release now
                        </Button>
                      )}

                      {/* Released indicator */}
                      {isAdmin && memo.status === 'approved' && memo.releasedToRodFasd && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/20 whitespace-nowrap">
                          Released
                        </span>
                      )}

                      {/* Change Status */}
                      {isAdmin && onStatusChange && (
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 text-xs px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                          onClick={() => onStatusChange(memo)}
                        >
                          Status
                        </Button>
                      )}

                      {/* Mark as Received */}
                      {onMarkReceived && memo.status === 'approved' && !memo.receivedByRodFasd && (
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 text-xs px-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                          onClick={() => onMarkReceived(memo.id)}
                        >
                          Received
                        </Button>
                      )}

                      {/* Delete */}
                      {isAdmin && onDelete && (
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => onDelete(memo.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className={cn('flex items-center justify-between text-sm', fluid ? 'shrink-0 pt-2' : '')}>
          <p className="text-gray-500 dark:text-gray-400">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              Prev
            </Button>
            {Array.from({ length: Math.min(5, pages) }, (_, i) => {
              const p = page <= 3 ? i + 1 : page - 2 + i
              if (p < 1 || p > pages) return null
              return (
                <Button
                  key={p} variant={p === page ? 'default' : 'outline'} size="sm"
                  onClick={() => setPage(p)}
                  className="w-8 h-8 p-0"
                >
                  {p}
                </Button>
              )
            })}
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
