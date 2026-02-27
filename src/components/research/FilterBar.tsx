'use client'

import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download } from 'lucide-react'
import { useResearchFilters } from '@/hooks/research/useResearchFilters'
import { PROGRAM_LABELS } from '@/lib/research/constants'
import { cn } from '@/lib/utils'

const STATUS_LABELS: Record<string, string> = {
  all: 'All',
  active: 'Active',
  discharged: 'Discharged',
  transferred: 'Transferred',
}

interface FilterBarProps {
  onExport?: () => void
  isExporting?: boolean
  className?: string
}

export function FilterBar({ onExport, isExporting, className }: FilterBarProps) {
  const router = useRouter()
  const {
    state,
    setParams,
    datePresets,
    activeFilterCount,
    tabs,
  } = useResearchFilters()

  function updateUrl(updates: Partial<typeof state>) {
    const q = setParams(updates)
    router.push(`/research?${q}`, { scroll: false })
  }

  return (
    <div
      className={cn(
        'sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm sm:gap-4',
        className
      )}
    >
      <Select
        value={state.datePreset}
        onValueChange={(value) => updateUrl({ datePreset: value })}
      >
        <SelectTrigger className="h-9 w-[180px] border-gray-200 bg-white text-gray-900">
          <SelectValue placeholder="Date range" />
        </SelectTrigger>
        <SelectContent className="border-gray-200 bg-white">
          {datePresets.map((preset) => (
            <SelectItem
              key={preset.value}
              value={preset.value}
              className="text-gray-900 focus:bg-gray-50 focus:text-gray-900"
            >
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={state.programTypes.includes('all') ? 'all' : state.programTypes[0] ?? 'all'}
        onValueChange={(value) =>
          updateUrl({ programTypes: value === 'all' ? ['all'] : [value] })
        }
      >
        <SelectTrigger className="h-9 w-[160px] border-gray-200 bg-white text-gray-900">
          <SelectValue placeholder="Program type" />
        </SelectTrigger>
        <SelectContent className="border-gray-200 bg-white">
          <SelectItem value="all" className="text-gray-900 focus:bg-gray-50 focus:text-gray-900">
            All
          </SelectItem>
          {Object.entries(PROGRAM_LABELS).map(([value, label]) => (
            <SelectItem
              key={value}
              value={value}
              className="text-gray-900 focus:bg-gray-50 focus:text-gray-900"
            >
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={state.statuses.includes('all') ? 'all' : state.statuses[0] ?? 'all'}
        onValueChange={(value) =>
          updateUrl({ statuses: value === 'all' ? ['all'] : [value] })
        }
      >
        <SelectTrigger className="h-9 w-[140px] border-gray-200 bg-white text-gray-900">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent className="border-gray-200 bg-white">
          {['all', 'active', 'discharged', 'transferred'].map((value) => (
            <SelectItem
              key={value}
              value={value}
              className="text-gray-900 focus:bg-gray-50 focus:text-gray-900"
            >
              {STATUS_LABELS[value] ?? value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {activeFilterCount > 0 && (
        <Badge variant="secondary" className="border-gray-200 bg-gray-100 text-gray-700">
          {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''}
        </Badge>
      )}

      <div className="ml-auto">
        <Button
          variant="outline"
          size="sm"
          className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
          onClick={onExport}
          disabled={isExporting}
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>
    </div>
  )
}
