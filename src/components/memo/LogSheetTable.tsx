'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Printer, X, SendHorizonal, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/utils'
import type { Memo } from '@/types'

interface LogSheetTableProps {
  memos: Memo[]
  onRelease?: (id: string) => void
  onClose: () => void
}

const MIN_ROW_H = 180

export function LogSheetTable({ memos, onRelease, onClose }: LogSheetTableProps) {
  const [rowHeights, setRowHeights]     = useState<Record<string, number>>({})
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set())
  const [seriesInput, setSeriesInput]   = useState('')
  const dragRef = useRef<{ id: string; startY: number; startH: number } | null>(null)

  /* ── Force light mode + mark body for print isolation while overlay is open ── */
  useEffect(() => {
    const html = document.documentElement
    const wasDark = html.classList.contains('dark')
    html.classList.remove('dark')
    document.body.classList.add('log-sheet-open')
    return () => {
      if (wasDark) html.classList.add('dark')
      document.body.classList.remove('log-sheet-open')
    }
  }, [])

  /* ── Row resize ── */
  const startResize = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault()
    const startH = rowHeights[id] ?? MIN_ROW_H
    dragRef.current = { id, startY: e.clientY, startH }

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const h = Math.max(MIN_ROW_H, dragRef.current.startH + ev.clientY - dragRef.current.startY)
      setRowHeights(p => ({ ...p, [dragRef.current!.id]: h }))
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [rowHeights])

  /* ── Selection ── */
  const allSelected = memos.length > 0 && memos.every(m => selectedIds.has(m.id))
  const toggleAll   = () => setSelectedIds(allSelected ? new Set() : new Set(memos.map(m => m.id)))
  const toggle      = (id: string) =>
    setSelectedIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })

  const handleApplySeries = () => {
    // Apply series number to selected rows (stored in actionTaken display — read-only visual here)
    // In the original this sets a local display value; we just clear input for now
    setSeriesInput('')
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      className="fixed inset-0 z-50 flex flex-col bg-white"
      style={{ colorScheme: 'light' }}
      data-print-root
    >

      {/* ════════════════════════════════════════
          TOP BAR  (hidden on print)
      ════════════════════════════════════════ */}
      <div className="print:hidden shrink-0 border-b border-gray-200 bg-white shadow-sm">
        {/* Brand row */}
        <div className="flex items-center justify-between gap-2 flex-wrap px-3 sm:px-6 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 shrink-0 bg-white flex items-center justify-center">
              <Image
                src="/tesda-logo.png"
                alt="TESDA"
                width={40}
                height={40}
                className="object-contain w-full h-full p-0.5"
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 leading-tight truncate">TESDA Region VII — Records Unit</p>
              <p className="text-xs text-gray-400 truncate">Outgoing Communications · Log Sheet Preview</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Series Number Input */}
            <div className="flex items-center gap-1.5 flex-1 sm:flex-none min-w-0">
              <input
                type="text"
                value={seriesInput}
                onChange={e => setSeriesInput(e.target.value)}
                placeholder="Enter Series Number…"
                className="h-8 w-full sm:w-52 rounded-lg border border-gray-300 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs px-3"
                onClick={handleApplySeries}
                disabled={!seriesInput}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Apply
              </Button>
            </div>

            <div className="w-px h-5 bg-gray-200 mx-1" />

            <Button
              size="sm"
              className="h-8 text-xs px-3 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              onClick={() => window.print()}
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Print
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs px-3"
              onClick={onClose}
            >
              <X className="h-3.5 w-3.5 mr-1.5" />
              Close Preview
            </Button>
          </div>
        </div>

        {/* Status bar */}
        <div className="px-3 sm:px-6 py-1.5 flex items-center gap-3 flex-wrap">
          <span className="text-[11px] text-gray-400">
            Showing <span className="font-semibold text-gray-600">{memos.length}</span> received memo{memos.length !== 1 ? 's' : ''}
          </span>
          {selectedIds.size > 0 && (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-[11px] text-blue-600 font-medium"
            >
              {selectedIds.size} selected
            </motion.span>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════
          PRINT-ONLY HEADER
      ════════════════════════════════════════ */}
      <div className="hidden print:block px-8 pt-6 pb-4 border-b-2 border-black shrink-0">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-0.5">Republic of the Philippines</p>
          <p className="text-base font-bold uppercase">Technical Education and Skills Development Authority</p>
          <p className="text-sm font-semibold">Region VII — Central Visayas</p>
          <p className="mt-1 text-xs font-semibold tracking-wide uppercase text-gray-600">
            Outgoing Communications — Log Sheet
          </p>
        </div>
        <div className="flex justify-between text-xs text-gray-600 mt-3 border-t pt-2">
          <span>TESDA Region VII · Records Unit</span>
          <span>Date Printed: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* ════════════════════════════════════════
          TABLE AREA
      ════════════════════════════════════════ */}
      <div className="flex-1 overflow-auto px-3 sm:px-6 py-4">
        {memos.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full gap-3 text-gray-400"
          >
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
              <Printer className="h-6 w-6 text-gray-300" />
            </div>
            <p className="text-sm font-medium">No received memos to display</p>
            <p className="text-xs text-gray-400">Mark approved memos as received first to see them here.</p>
          </motion.div>
        ) : (
          <div className="rounded-xl overflow-auto border border-gray-200 shadow-sm bg-white">
            <table className="border-collapse text-sm" style={{ minWidth: '1100px', width: '100%' }}>
              <colgroup>
                {/* checkbox — hidden on print */}
                <col style={{ width: 34 }} className="print:hidden" />
                {/* Memo No: 10% */}
                <col style={{ width: '10%' }} />
                {/* Subject: 22% */}
                <col style={{ width: '22%' }} />
                {/* Dept: 6% */}
                <col style={{ width: '6%' }} />
                {/* Recipients: 12% */}
                <col style={{ width: '12%' }} />
                {/* Created At: 11% */}
                <col style={{ width: '11%' }} />
                {/* Released: 13% */}
                <col style={{ width: '13%' }} />
                {/* Received: 13% */}
                <col style={{ width: '13%' }} />
                {/* Action Taken: 13% */}
                <col style={{ width: '13%' }} />
              </colgroup>

              {/* ── Header ── */}
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {/* Select-all — hidden on print */}
                  <th className="px-2 py-3 text-center print:hidden" style={{ width: 34 }}>
                    <button
                      onClick={toggleAll}
                      className="w-4 h-4 rounded border border-gray-300 flex items-center justify-center mx-auto hover:border-blue-500 transition-colors"
                      style={{ background: allSelected ? '#2563eb' : 'white' }}
                    >
                      {allSelected && <Check className="h-2.5 w-2.5 text-white" />}
                    </button>
                  </th>
                  {[
                    'Memo No.',
                    'Subject',
                    'Dept',
                    'Recipients',
                    'Created At',
                    'Released to ROD/FASD',
                    'Received by (Date + Name)',
                    'Action Taken',
                  ].map(col => (
                    <th
                      key={col}
                      className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* ── Body ── */}
              <tbody>
                <AnimatePresence initial={false}>
                  {memos.map((memo, idx) => {
                    const h = rowHeights[memo.id] ?? MIN_ROW_H
                    const isSelected = selectedIds.has(memo.id)

                    return (
                      <motion.tr
                        key={memo.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04, duration: 0.25 }}
                        className="relative border-b border-gray-100 hover:bg-blue-50/30 transition-colors"
                        style={{ height: h }}
                      >
                        {/* Checkbox */}
                        <td className="px-2 align-top pt-3 print:hidden">
                          <button
                            onClick={() => toggle(memo.id)}
                            className="w-4 h-4 rounded border border-gray-300 flex items-center justify-center mx-auto hover:border-blue-500 transition-colors"
                            style={{ background: isSelected ? '#2563eb' : 'white' }}
                          >
                            {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                          </button>
                        </td>

                        {/* Memo No */}
                        <td className="px-3 py-3 align-top">
                          <span className="font-mono text-xs font-semibold text-blue-700">{memo.memoNumber}</span>
                        </td>

                        {/* Subject */}
                        <td className="px-3 py-3 align-top">
                          <p className="text-xs text-gray-900 break-words whitespace-normal leading-relaxed">{memo.title}</p>
                        </td>

                        {/* Dept */}
                        <td className="px-3 py-3 align-top text-xs text-gray-700">{memo.department}</td>

                        {/* Recipients */}
                        <td className="px-3 py-3 align-top">
                          <p className="text-xs text-gray-700 break-words whitespace-normal">
                            {Array.isArray(memo.recipients) ? memo.recipients.join(', ') : memo.recipients}
                          </p>
                        </td>

                        {/* Date Created */}
                        <td className="px-3 py-3 align-top text-xs text-gray-700 whitespace-normal leading-relaxed">
                          {formatDateTime(memo.createdAt)}
                        </td>

                        {/* Released to ROD/FASD */}
                        <td className="px-3 py-3 align-top">
                          {memo.releasedToRodFasd ? (
                            <span className="text-xs text-gray-700 whitespace-normal leading-relaxed">
                              {formatDateTime(memo.releasedToRodFasd)}
                            </span>
                          ) : (
                            onRelease && (
                              <button
                                onClick={() => onRelease(memo.id)}
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors print:hidden"
                              >
                                <SendHorizonal className="h-3 w-3" />
                                Release now
                              </button>
                            )
                          )}
                        </td>

                        {/* Received by ROD/FASD */}
                        <td className="px-3 py-3 align-top">
                          {memo.receivedByRodFasd ? (
                            <span className="text-xs text-gray-700 whitespace-normal leading-relaxed break-words">
                              {formatDateTime(memo.receivedByRodFasd)}
                              {memo.receivedByName && (
                                <span className="block text-gray-500 mt-0.5">({memo.receivedByName})</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Not received yet</span>
                          )}
                        </td>

                        {/* Action Taken — resize handle lives here so no extra column is added */}
                        <td className="relative px-3 py-3 align-top text-xs text-gray-600">
                          {memo.actionTaken || ''}
                          {/* Resize handle — screen only, no extra <td> so column count stays correct */}
                          <div
                            className="print:hidden absolute bottom-0 left-0 right-0 h-[6px] cursor-row-resize select-none group"
                            onMouseDown={e => startResize(e, memo.id)}
                          >
                            <div className="absolute inset-x-0 bottom-0 h-[2px] bg-transparent group-hover:bg-blue-400 transition-colors duration-150" />
                            <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-8 h-[3px] rounded-full bg-gray-200 group-hover:bg-blue-400 transition-colors duration-150" />
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>,
    document.body
  )
}
