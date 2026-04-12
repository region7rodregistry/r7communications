import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: any, fmt = 'MMM dd, yyyy'): string {
  if (!date) return '—'
  try {
    const d = date?.toDate ? date.toDate() : new Date(date)
    return format(d, fmt)
  } catch {
    return '—'
  }
}

export function formatDateTime(date: any): string {
  if (!date) return '—'
  try {
    const d = date?.toDate ? date.toDate() : new Date(date)
    return format(d, 'MMM dd, yyyy h:mm a')
  } catch {
    return '—'
  }
}

export function formatRelative(date: any): string {
  if (!date) return '—'
  try {
    const d = date?.toDate ? date.toDate() : new Date(date)
    return formatDistanceToNow(d, { addSuffix: true })
  } catch {
    return '—'
  }
}

export function padNumber(n: number, digits = 4): string {
  return String(n).padStart(digits, '0')
}

// Antedation suffix logic
export function indexToSuffix(index: number): string {
  if (index < 26) {
    return String.fromCharCode(65 + index) // A-Z
  }
  // AA, AB, ... ZZ, AAA, ...
  const result: string[] = []
  let n = index
  while (n >= 0) {
    result.unshift(String.fromCharCode(65 + (n % 26)))
    n = Math.floor(n / 26) - 1
  }
  return result.join('')
}

export function suffixToIndex(suffix: string): number {
  let result = 0
  for (let i = 0; i < suffix.length; i++) {
    result = result * 26 + (suffix.charCodeAt(i) - 64)
  }
  return result - 1
}

export function buildMemoNumber(
  memoType: string,
  year: number,
  deptCode: string,
  number: number
): string {
  return `${memoType}-${year}-${deptCode}-${padNumber(number)}`
}

export function getMemoTypePrefix(memoType: string): string {
  const prefixes: Record<string, string> = {
    'PO': 'PO',
    'CO': 'CO',
    'Office Order': 'OO',
    'Advisory': 'ADV',
    'AdvisoryBulletin': 'AB',
    'Bulletin': 'BUL',
    'Acknowledgment': 'ACK',
  }
  return prefixes[memoType] || memoType
}

export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n) + '…' : str
}
