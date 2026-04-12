'use client'

import { Search, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { MemoStatus } from '@/types'

interface MemoFiltersProps {
  search: string
  onSearchChange: (v: string) => void
  status: MemoStatus | 'all'
  onStatusChange: (v: MemoStatus | 'all') => void
  dateFrom?: string
  onDateFromChange?: (v: string) => void
  dateTo?: string
  onDateToChange?: (v: string) => void
  showTypeFilter?: boolean
  memoType?: string
  onMemoTypeChange?: (v: string) => void
  compact?: boolean
}

const statusOptions: { label: string; value: MemoStatus | 'all' }[] = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Signed', value: 'signed' },
  { label: 'Approved', value: 'approved' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Archived', value: 'archived' },
]

const typeOptions = [
  { label: 'All Types', value: 'all' },
  { label: 'PO', value: 'PO' },
  { label: 'CO', value: 'CO' },
  { label: 'Office Order', value: 'Office Order' },
  { label: 'Advisory', value: 'Advisory' },
  { label: 'Advisory Bulletin', value: 'AdvisoryBulletin' },
  { label: 'Bulletin', value: 'Bulletin' },
  { label: 'Acknowledgment', value: 'Acknowledgment' },
]

export function MemoFilters({
  search, onSearchChange,
  status, onStatusChange,
  dateFrom, onDateFromChange,
  dateTo, onDateToChange,
  showTypeFilter, memoType, onMemoTypeChange,
  compact,
}: MemoFiltersProps) {
  const h = compact ? 'h-8 text-xs' : ''
  const iconSize = compact ? 'h-3.5 w-3.5' : 'h-4 w-4'

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px]">
        <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${iconSize} text-gray-400`} />
        <Input
          placeholder="Search by number, title, dept…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`pl-8 ${h}`}
        />
      </div>

      {/* Type filter */}
      {showTypeFilter && onMemoTypeChange && (
        <Select value={memoType || 'all'} onValueChange={onMemoTypeChange}>
          <SelectTrigger className={`w-[130px] ${h}`}>
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Date range */}
      {onDateFromChange && (
        <Input
          type="date"
          value={dateFrom || ''}
          onChange={(e) => onDateFromChange(e.target.value)}
          className={`w-[130px] ${h}`}
          title="From date"
        />
      )}
      {onDateToChange && (
        <Input
          type="date"
          value={dateTo || ''}
          onChange={(e) => onDateToChange(e.target.value)}
          className={`w-[130px] ${h}`}
          title="To date"
        />
      )}

      {/* Clear filters */}
      {(search || dateFrom || dateTo || (memoType && memoType !== 'all')) && (
        <button
          onClick={() => {
            onSearchChange('')
            onDateFromChange?.('')
            onDateToChange?.('')
            onMemoTypeChange?.('all')
          }}
          className={`flex items-center gap-1 px-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${compact ? 'h-8 text-xs' : 'h-10 text-sm'}`}
        >
          <Filter className={iconSize} />
          Clear
        </button>
      )}
    </div>
  )
}
