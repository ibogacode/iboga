'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ChartTooltipProps {
  className?: string
  children: ReactNode
}

export function ChartTooltip({ className, children }: ChartTooltipProps) {
  return (
    <div
      className={cn(
        'rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-lg',
        className
      )}
    >
      {children}
    </div>
  )
}
