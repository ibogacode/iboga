'use client'

import { ReactNode } from 'react'
import { FileQuestion } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ResearchEmptyStateProps {
  title?: string
  description?: string
  icon?: ReactNode
  className?: string
}

export function ResearchEmptyState({
  title = 'No data available',
  description = "There's nothing to display for this selection.",
  icon,
  className,
}: ResearchEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <div className="mb-4 text-gray-400">
        {icon ?? <FileQuestion className="h-12 w-12" />}
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500 max-w-sm">{description}</p>
    </div>
  )
}
