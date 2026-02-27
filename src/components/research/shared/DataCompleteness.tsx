'use client'

import { Info as DataCompletenessInfoIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DataCompletenessProps {
  tableName: string
  count: number
  total: number
  className?: string
}

export function DataCompleteness({ tableName, count, total, className }: DataCompletenessProps) {
  const pct = total > 0 ? (count / total) * 100 : 0

  let indicator = 'blue'
  let message = ''
  if (total === 0) {
    indicator = 'amber'
    message = 'No clients in the selected period'
  } else if (pct >= 80) {
    indicator = 'emerald'
    message = `Good coverage — ${count} of ${total} clients have ${tableName}`
  } else if (pct >= 40) {
    indicator = 'blue'
    message = `Partial coverage — ${count} of ${total} clients have ${tableName}`
  } else {
    indicator = 'amber'
    message = `Limited data — ${count} of ${total} clients. Numbers may not reflect everyone.`
  }

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm',
        className
      )}
    >
      <DataCompletenessInfoIcon
        className={cn(
          'mt-0.5 h-4 w-4 shrink-0',
          indicator === 'emerald' && 'text-emerald-500',
          indicator === 'blue' && 'text-blue-400',
          indicator === 'amber' && 'text-amber-500'
        )}
      />
      <p className="text-xs text-gray-600">{message}</p>
    </div>
  )
}
