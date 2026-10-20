import type { Memo, MemoActivity } from '@/types'

// ─── Processing time ──────────────────────────────────────────────────────────
// Memos carry no "signedAt" field — the moment a memo was signed only exists as
// a status-change entry in `memoActivities`. These helpers read it from there.
// All durations are calendar time (nights and weekends included).

export const MINUTE = 60 * 1000
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR

export function toDate(value: any): Date | null {
  if (!value) return null
  const d: Date = value?.toDate ? value.toDate() : value instanceof Date ? value : new Date(value)
  return isNaN(d.getTime()) ? null : d
}

// Exact wording of a "signed" status change. The admin portal writes the first
// form; the pre-Next.js system wrote `Status changed from "<old>" to "<new>"`.
// Kept as exact strings so Firestore can match them with an `in` query.
export const SIGNED_ACTIONS = [
  'Status changed to signed',
  ...['pending', 'approved', 'cancelled', 'archived'].map(
    (from) => `Status changed from "${from}" to "signed"`
  ),
]

// "Memo created: …" (current) or "Created Memo …" / "Created Antedated Memo …" (legacy)
const CREATED_RE = /^(Memo created\b|Created (Antedated )?Memo\b)/i

/** First time the memo's status changed to signed, or null if it never was. */
export function getSignedAt(logs: MemoActivity[]): Date | null {
  let first: Date | null = null
  for (const log of logs) {
    if (!SIGNED_ACTIONS.includes(log.action)) continue
    const t = toDate(log.timestamp)
    if (t && (!first || t < first)) first = t
  }
  return first
}

/**
 * When the memo entered the system. Antedated memos store the backdated date in
 * `createdAt`, so their creation entry in the activity log is used instead.
 */
export function getStartedAt(memo: Memo, logs?: MemoActivity[]): Date | null {
  if (!memo.isAntedated) return toDate(memo.createdAt)
  const created = logs?.find((l) => CREATED_RE.test(l.action))
  return created ? toDate(created.timestamp) : null
}

export function durationBetween(start: Date | null, end: Date | null): number | null {
  if (!start || !end) return null
  const ms = end.getTime() - start.getTime()
  return ms >= 0 ? ms : null
}

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`

/**
 * "2 days 6 hours", "5 hours 12 minutes", "40 minutes" — or, with `short`,
 * "2d 6h", "5h 12m", "40m". Shows the two largest units only.
 */
export function formatDuration(ms: number | null | undefined, short = false): string {
  if (ms == null || isNaN(ms)) return '—'
  if (ms < MINUTE) return short ? '<1m' : 'less than a minute'

  const days = Math.floor(ms / DAY)
  const hours = Math.floor((ms % DAY) / HOUR)
  const minutes = Math.floor((ms % HOUR) / MINUTE)

  if (short) {
    if (days) return hours ? `${days}d ${hours}h` : `${days}d`
    if (hours) return minutes ? `${hours}h ${minutes}m` : `${hours}h`
    return `${minutes}m`
  }
  if (days) return hours ? `${plural(days, 'day')} ${plural(hours, 'hour')}` : plural(days, 'day')
  if (hours) return minutes ? `${plural(hours, 'hour')} ${plural(minutes, 'minute')}` : plural(hours, 'hour')
  return plural(minutes, 'minute')
}

export function average(values: number[]): number | null {
  if (!values.length) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function median(values: number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** Ordered bands for the "how long signing takes" distribution. */
export const DURATION_BANDS: { label: string; max: number }[] = [
  { label: 'Under 1 day',  max: DAY },
  { label: '1–2 days',     max: 2 * DAY },
  { label: '2–4 days',     max: 4 * DAY },
  { label: '4–7 days',     max: 7 * DAY },
  { label: '1–2 weeks',    max: 14 * DAY },
  { label: 'Over 2 weeks', max: Infinity },
]

/**
 * Clean axis ticks for a duration scale: hours when the largest value is under
 * two days, whole days otherwise. Returns the ticks (in ms) and the axis top.
 */
export function durationAxis(maxMs: number): { ticks: number[]; top: number; label: (ms: number) => string } {
  const useHours = maxMs < 2 * DAY
  const unit = useHours ? HOUR : DAY
  const steps = useHours ? [1, 2, 3, 6, 12, 24] : [1, 2, 5, 10, 20, 50, 100]
  const target = Math.max(maxMs / unit, 1) / 3
  const step = steps.find((s) => s >= target) ?? steps[steps.length - 1]
  const count = Math.max(1, Math.ceil(maxMs / unit / step))
  const ticks = Array.from({ length: count + 1 }, (_, i) => i * step * unit)
  return {
    ticks,
    top: ticks[ticks.length - 1],
    label: (ms) => `${Math.round(ms / unit)}${useHours ? 'h' : 'd'}`,
  }
}
