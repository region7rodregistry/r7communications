'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Timer, Gauge, Zap, Hourglass, BarChart3, Table2, Info, AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { subscribeToSigningEvents } from '@/lib/memo-service'
import {
  DAY, DURATION_BANDS, average, median, durationAxis, durationBetween, formatDuration, toDate,
} from '@/lib/processing-time'
import { cn } from '@/lib/utils'
import type { Memo, MemoType } from '@/types'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const TYPE_LABELS: Record<MemoType, string> = {
  'PO':               'Provincial Office',
  'CO':               'Central Office',
  'Office Order':     'Office Order',
  'Advisory':         'Advisory',
  'AdvisoryBulletin': 'Advisory Bulletin',
  'Bulletin':         'Bulletin',
  'Acknowledgment':   'Acknowledgment',
}

const typeLabel = (type: string) => TYPE_LABELS[type as MemoType] ?? (type || 'Unspecified')

interface TypeRow {
  type: string
  label: string
  signed: number
  avg: number | null
  median: number | null
  fastest: number | null
  slowest: number | null
  waiting: number
}

const WAITING_LIMIT = 6
// Holds a line's height while the value is still loading
const NBSP = ' '

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/**
 * Admin overview of how long memos take to get signed — created → first
 * "signed" status change — for the memos passed in (the selected year).
 */
export function ProcessingOverview({
  memos,
  year,
  loading,
}: {
  memos: Memo[]
  year: number
  loading: boolean
}) {
  const [signedAt, setSignedAt] = useState<Map<string, Date> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => subscribeToSigningEvents(setSignedAt, (err) => setError(err.message)), [])

  return <ProcessingInsights memos={memos} year={year} loading={loading} signedAt={signedAt} error={error} />
}

/** Renders the overview from a memoId → signed-at map (null while it loads). */
export function ProcessingInsights({
  memos,
  year,
  loading,
  signedAt,
  error,
}: {
  memos: Memo[]
  year: number
  loading: boolean
  signedAt: Map<string, Date> | null
  error: string | null
}) {
  const stats = useMemo(() => {
    const events = signedAt ?? new Map<string, Date>()
    const rows: { memo: Memo; ms: number; createdAt: Date }[] = []
    let antedatedSigned = 0

    for (const memo of memos) {
      const signed = events.get(memo.id)
      if (!signed) continue
      // Antedated memos carry a backdated createdAt, which would inflate the figure
      if (memo.isAntedated) { antedatedSigned++; continue }
      const createdAt = toDate(memo.createdAt)
      const ms = durationBetween(createdAt, signed)
      if (createdAt && ms != null) rows.push({ memo, ms, createdAt })
    }
    const durations = rows.map(r => r.ms)

    const now = new Date()
    const pending = memos.filter(m => m.status === 'pending')
    const waiting = pending
      .filter(m => !m.isAntedated)
      .map(m => ({ memo: m, ms: durationBetween(toDate(m.createdAt), now) }))
      .filter((w): w is { memo: Memo; ms: number } => w.ms != null)
      .sort((a, b) => b.ms - a.ms)

    const byMonth = MONTHS.map((label, i) => {
      const inMonth = rows.filter(r => r.createdAt.getMonth() === i).map(r => r.ms)
      return { key: label, label, full: `${MONTHS_FULL[i]} ${year}`, value: average(inMonth), count: inMonth.length }
    })

    const bands = DURATION_BANDS.map((band, i) => {
      const min = i ? DURATION_BANDS[i - 1].max : 0
      return { label: band.label, count: durations.filter(ms => ms >= min && ms < band.max).length }
    })

    // One row per document type that has memos this year, signed or still waiting
    const types = Array.from(new Set(memos.map(m => m.memoType || '')))
    const byType: TypeRow[] = types.map(type => {
      const list = rows.filter(r => (r.memo.memoType || '') === type).map(r => r.ms)
      return {
        type: type || 'unspecified',
        label: typeLabel(type),
        signed: list.length,
        avg: average(list),
        median: median(list),
        fastest: list.length ? Math.min(...list) : null,
        slowest: list.length ? Math.max(...list) : null,
        waiting: pending.filter(m => (m.memoType || '') === type).length,
      }
    }).sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1) || a.label.localeCompare(b.label))

    return {
      count: rows.length,
      avg: average(durations),
      median: median(durations),
      within24h: durations.filter(ms => ms < DAY).length,
      antedatedSigned,
      pending: pending.length,
      waiting,
      byMonth,
      bands,
      byType,
    }
  }, [memos, signedAt, year])

  const ready = !loading && signedAt !== null
  const hasData = ready && stats.count > 0
  const share = (n: number) => (stats.count ? Math.round((n / stats.count) * 100) : 0)
  const emptyText = `No signed memos with a recorded signing time in ${year} yet.`

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          Processing time
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          How long memos created in {year} took to get signed
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>Couldn&apos;t read signing times from the activity log: {error}</span>
        </div>
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          icon={<Timer />}
          label="Average time to sign"
          value={hasData ? formatDuration(stats.avg, true) : '—'}
          note={hasData ? `Across ${plural(stats.count, 'signed memo')}` : ready ? `None signed in ${year}` : NBSP}
        />
        <StatTile
          icon={<Gauge />}
          label="Typical time (median)"
          value={hasData ? formatDuration(stats.median, true) : '—'}
          note={hasData ? 'Half are signed faster than this' : NBSP}
        />
        <StatTile
          icon={<Zap />}
          label="Signed within 24 hours"
          value={hasData ? `${share(stats.within24h)}%` : '—'}
          note={hasData ? `${stats.within24h} of ${plural(stats.count, 'memo')}` : NBSP}
        />
        <StatTile
          icon={<Hourglass />}
          label="Waiting for signature"
          value={loading ? '—' : String(stats.pending)}
          note={
            loading ? NBSP
              : stats.waiting[0] ? `Longest wait ${formatDuration(stats.waiting[0].ms, true)}`
              : 'Nothing waiting'
          }
        />
      </div>

      <ChartCard
        title="Time to sign, by document type"
        subtitle="Slowest first. Typical is the median: half of that type are signed faster."
      >
        {!ready ? <ChartSkeleton /> : stats.byType.length ? (
          <DocumentTypeTable rows={stats.byType} />
        ) : <Empty text={`No memos created in ${year} yet.`} />}
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ChartCard
          className="lg:col-span-2"
          title="Average time to sign, by month"
          subtitle="Grouped by the month each memo was created"
          table={hasData ? {
            head: ['Month', 'Average time to sign', 'Signed memos'],
            rows: stats.byMonth.map(m => [m.full, formatDuration(m.value), m.count]),
          } : undefined}
        >
          {!ready ? <ChartSkeleton /> : hasData ? <MonthColumns data={stats.byMonth} /> : <Empty text={emptyText} />}
        </ChartCard>

        <ChartCard
          title="How long signing takes"
          subtitle={hasData ? `${plural(stats.count, 'signed memo')}, by time to sign` : 'Signed memos, by time to sign'}
          table={hasData ? {
            head: ['Time to sign', 'Memos', 'Share'],
            rows: stats.bands.map(b => [b.label, b.count, `${share(b.count)}%`]),
          } : undefined}
        >
          {!ready ? <ChartSkeleton /> : hasData ? (
            <BarList
              rows={stats.bands.map(b => ({
                key: b.label,
                label: b.label,
                value: b.count,
                display: String(b.count),
                tip: plural(b.count, 'memo'),
                detail: `${share(b.count)}% of signed memos`,
              }))}
            />
          ) : <Empty text={emptyText} />}
        </ChartCard>

        <ChartCard
          className="lg:col-span-3"
          title="Waiting longest for signature"
          subtitle={loading ? NBSP : `${plural(stats.pending, 'pending memo')} from ${year}`}
        >
          {loading ? <ChartSkeleton /> : stats.waiting.length ? (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {stats.waiting.slice(0, WAITING_LIMIT).map(({ memo, ms }) => (
                <li key={memo.id}>
                  <Link
                    href={`/memo/${memo.id}`}
                    className="flex items-center gap-3 py-2 px-1 -mx-1 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex items-baseline gap-2 min-w-0">
                        <span className="text-xs font-mono font-semibold text-blue-700 dark:text-blue-400 truncate">{memo.memoNumber}</span>
                        <span className="shrink-0 text-[11px] text-gray-400 dark:text-gray-500">{typeLabel(memo.memoType)}</span>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{memo.title}</p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                      {formatDuration(ms)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty text={stats.pending ? 'Waiting times are unavailable for antedated memos.' : 'No memos are waiting for a signature.'} />
          )}
        </ChartCard>
      </div>

      <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-gray-400 dark:text-gray-500">
        <Info className="h-3 w-3 mt-0.5 shrink-0" />
        <span>
          Time to sign runs from when a memo was created to the first time its status changed to Signed, as
          recorded in the activity log. It counts calendar time, including nights and weekends.
          {stats.antedatedSigned > 0 &&
            ` ${plural(stats.antedatedSigned, 'antedated memo')} ${stats.antedatedSigned === 1 ? 'is' : 'are'} left out because ${stats.antedatedSigned === 1 ? 'its' : 'their'} created date is backdated.`}
        </span>
      </p>
    </section>
  )
}

// ─── Pieces ───────────────────────────────────────────────────────────────────

function StatTile({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 min-w-0">
        <span className="h-7 w-7 shrink-0 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center [&>svg]:h-3.5 [&>svg]:w-3.5">
          {icon}
        </span>
        <p className="text-xs font-medium leading-tight text-gray-500 dark:text-gray-400">{label}</p>
      </div>
      <p className="text-2xl font-bold leading-none mt-3 text-gray-900 dark:text-gray-100">{value}</p>
      <p className="text-xs leading-snug text-gray-500 dark:text-gray-400 mt-1.5">{note}</p>
    </Card>
  )
}

function ChartCard({
  title,
  subtitle,
  table,
  className,
  children,
}: {
  title: string
  subtitle?: string
  table?: { head: string[]; rows: (string | number)[][] }
  className?: string
  children: React.ReactNode
}) {
  const [showTable, setShowTable] = useState(false)
  return (
    <Card className={cn('p-4 flex flex-col min-w-0', className)}>
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {table && (
          <button
            type="button"
            onClick={() => setShowTable(v => !v)}
            aria-pressed={showTable}
            className="shrink-0 inline-flex items-center gap-1 h-6 px-2 rounded-md text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {showTable ? <BarChart3 className="h-3 w-3" /> : <Table2 className="h-3 w-3" />}
            {showTable ? 'Chart' : 'Table'}
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0">
        {showTable && table ? <DataTable {...table} /> : children}
      </div>
    </Card>
  )
}

function DataTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-auto max-h-60">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400">
            {head.map((h, i) => (
              <th key={h} className={cn('py-1.5 font-medium', i ? 'text-right pl-3' : 'text-left')}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-50 dark:border-gray-800/60 last:border-0">
              {row.map((cell, j) => (
                <td key={j} className={cn('py-1.5 text-gray-700 dark:text-gray-200', j ? 'text-right pl-3 tabular-nums' : 'text-left')}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Hover/focus readout. Value leads, label follows. */
function Tip({
  value,
  label,
  detail,
  align = 'center',
  className,
  style,
}: {
  value: string
  label: string
  detail?: string
  align?: 'start' | 'center' | 'end'
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      role="tooltip"
      style={style}
      className={cn(
        'pointer-events-none absolute z-20 whitespace-nowrap rounded-lg border border-gray-100 bg-white px-2.5 py-1.5 shadow-lg',
        'opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100',
        'dark:border-gray-700 dark:bg-gray-800',
        align === 'center' && 'left-1/2 -translate-x-1/2',
        align === 'start' && 'left-0',
        align === 'end' && 'right-0',
        className
      )}
    >
      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{value}</p>
      <p className="text-[11px] text-gray-500 dark:text-gray-400">{label}</p>
      {detail && <p className="text-[11px] text-gray-500 dark:text-gray-400">{detail}</p>}
    </div>
  )
}

function MonthColumns({
  data,
}: {
  data: { key: string; label: string; full: string; value: number | null; count: number }[]
}) {
  const max = Math.max(0, ...data.map(d => d.value ?? 0))
  const axis = durationAxis(max)
  const peak = max > 0 ? data.findIndex(d => d.value === max) : -1
  const pct = (ms: number) => `${(ms / axis.top) * 100}%`

  return (
    <div className="flex gap-2">
      {/* Y-axis ticks */}
      <div className="relative h-44 w-7 shrink-0" aria-hidden>
        {axis.ticks.map(t => (
          <span
            key={t}
            className="absolute right-0 translate-y-1/2 text-[10px] leading-none tabular-nums text-gray-400 dark:text-gray-500"
            style={{ bottom: pct(t) }}
          >
            {axis.label(t)}
          </span>
        ))}
      </div>

      <div className="flex-1 min-w-0">
        <div className="relative h-44">
          {/* Gridlines, baseline darker */}
          {axis.ticks.map((t, i) => (
            <div
              key={t}
              aria-hidden
              className={cn('absolute inset-x-0 h-px', i ? 'bg-gray-100 dark:bg-gray-800' : 'bg-gray-200 dark:bg-gray-700')}
              style={{ bottom: pct(t) }}
            />
          ))}

          <div className="absolute inset-0 flex">
            {data.map((d, i) => {
              const align = i < 2 ? 'start' : i > data.length - 3 ? 'end' : 'center'
              return (
                <div
                  key={d.key}
                  tabIndex={d.value != null ? 0 : -1}
                  aria-label={
                    d.value != null
                      ? `${d.full}: average ${formatDuration(d.value)} across ${plural(d.count, 'signed memo')}`
                      : `${d.full}: no signed memos`
                  }
                  className="group relative flex-1 h-full flex items-end justify-center rounded outline-none focus-visible:bg-blue-50/70 dark:focus-visible:bg-blue-900/20"
                >
                  {d.value != null && (
                    <>
                      <div
                        className="w-3/5 max-w-[24px] rounded-t bg-blue-600 dark:bg-blue-500 transition-colors group-hover:bg-blue-500 group-focus-visible:bg-blue-500 dark:group-hover:bg-blue-400 dark:group-focus-visible:bg-blue-400"
                        style={{ height: `max(2px, ${pct(d.value)})` }}
                      />
                      {i === peak && (
                        <span
                          className="absolute left-1/2 -translate-x-1/2 text-[10px] font-semibold whitespace-nowrap text-gray-700 dark:text-gray-200 transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0"
                          style={{ bottom: `calc(${pct(d.value)} + 4px)` }}
                        >
                          {formatDuration(d.value, true)}
                        </span>
                      )}
                      <Tip
                        value={formatDuration(d.value)}
                        label={d.full}
                        detail={plural(d.count, 'signed memo')}
                        align={align}
                        style={{ bottom: `calc(${pct(d.value)} + 8px)` }}
                      />
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* X-axis labels */}
        <div className="flex mt-1.5" aria-hidden>
          {data.map(d => (
            <span key={d.key} className="flex-1 text-center text-[10px] text-gray-400 dark:text-gray-500">{d.label}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function BarList({
  rows,
}: {
  rows: { key: string; label: string; value: number; display: string; tip: string; detail: string }[]
}) {
  const max = Math.max(0, ...rows.map(r => r.value))
  return (
    <ul className="space-y-1">
      {rows.map(r => (
        <li
          key={r.key}
          tabIndex={0}
          aria-label={`${r.label}: ${r.tip}, ${r.detail}`}
          className="group relative flex items-center gap-2 py-1 rounded outline-none focus-visible:bg-blue-50/70 dark:focus-visible:bg-blue-900/20"
        >
          <span className="w-24 sm:w-28 shrink-0 truncate text-xs text-gray-600 dark:text-gray-300" title={r.label}>
            {r.label}
          </span>
          <div className="flex-1 min-w-0 h-3">
            {r.value > 0 && (
              <div
                className="h-full rounded-r bg-blue-600 dark:bg-blue-500 transition-colors group-hover:bg-blue-500 group-focus-visible:bg-blue-500 dark:group-hover:bg-blue-400 dark:group-focus-visible:bg-blue-400"
                style={{ width: `max(2px, ${(r.value / max) * 100}%)` }}
              />
            )}
          </div>
          <span className="w-14 shrink-0 text-right text-xs font-semibold tabular-nums text-gray-900 dark:text-gray-100">
            {r.display}
          </span>
          <Tip value={r.tip} label={r.label} detail={r.detail} className="bottom-full mb-1" />
        </li>
      ))}
    </ul>
  )
}

/** Per-type breakdown. The average carries an inline bar so the slow types stand out. */
function DocumentTypeTable({ rows }: { rows: TypeRow[] }) {
  const max = Math.max(0, ...rows.map(r => r.avg ?? 0))
  const th = 'py-2 px-1.5 sm:px-2 font-medium whitespace-nowrap'
  const td = 'py-2.5 px-1.5 sm:px-2 whitespace-nowrap'
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400">
            <th className={cn(th, 'text-left')}>Document type</th>
            <th className={cn(th, 'text-left sm:w-[40%]')}>
              Average<span className="hidden sm:inline"> time to sign</span>
            </th>
            <th className={cn(th, 'text-right')}>Typical</th>
            <th className={cn(th, 'text-right hidden md:table-cell')}>Fastest</th>
            <th className={cn(th, 'text-right hidden md:table-cell')}>Slowest</th>
            <th className={cn(th, 'text-right')}>Signed</th>
            <th className={cn(th, 'text-right')}>
              Waiting<span className="hidden sm:inline"> now</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.type} className="border-b border-gray-50 dark:border-gray-800/60 last:border-0">
              <td className={cn(td, 'font-medium text-gray-900 dark:text-gray-100')}>{r.label}</td>
              <td className={td}>
                {r.avg != null ? (
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:block flex-1 min-w-[80px] h-2.5" aria-hidden>
                      <div
                        className="h-full rounded-r bg-blue-600 dark:bg-blue-500"
                        style={{ width: `max(2px, ${(r.avg / max) * 100}%)` }}
                      />
                    </div>
                    <span className="sm:w-28 shrink-0 font-semibold text-gray-900 dark:text-gray-100">
                      <span className="sm:hidden">{formatDuration(r.avg, true)}</span>
                      <span className="hidden sm:inline">{formatDuration(r.avg)}</span>
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-400 dark:text-gray-500">None<span className="hidden sm:inline"> signed yet</span></span>
                )}
              </td>
              <td className={cn(td, 'text-right tabular-nums text-gray-700 dark:text-gray-200')}>{formatDuration(r.median, true)}</td>
              <td className={cn(td, 'text-right tabular-nums text-gray-700 dark:text-gray-200 hidden md:table-cell')}>{formatDuration(r.fastest, true)}</td>
              <td className={cn(td, 'text-right tabular-nums text-gray-700 dark:text-gray-200 hidden md:table-cell')}>{formatDuration(r.slowest, true)}</td>
              <td className={cn(td, 'text-right tabular-nums text-gray-700 dark:text-gray-200')}>{r.signed}</td>
              <td className={cn(td, 'text-right tabular-nums', r.waiting ? 'font-semibold text-amber-700 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500')}>
                {r.waiting}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ChartSkeleton() {
  return <div className="h-44 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
}

function Empty({ text }: { text: string }) {
  return (
    <div className="h-full min-h-[8rem] flex items-center justify-center text-center text-xs text-gray-400 dark:text-gray-500 px-4">
      {text}
    </div>
  )
}
