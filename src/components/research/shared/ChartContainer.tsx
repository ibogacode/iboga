'use client'

import { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChartContainerProps {
  title: string
  subtitle?: string
  action?: ReactNode
  loading?: boolean
  error?: boolean
  onRetry?: () => void
  className?: string
  children: ReactNode
}

export function ChartContainer({
  title,
  subtitle,
  action,
  loading,
  error,
  onRetry,
  className,
  children,
}: ChartContainerProps) {
  return (
    <div className={cn('rounded-xl border border-gray-100 bg-white p-6 shadow-sm', className)}>
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        {action && <div className="mt-2 sm:mt-0">{action}</div>}
      </div>
      {loading && (
        <div className="flex h-[280px] items-center justify-center">
          <Skeleton className="h-full w-full rounded-lg bg-gray-100" />
        </div>
      )}
      {error && (
        <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-gray-600">
          <AlertCircle className="h-10 w-10" />
          <p className="text-sm">Unable to load this section</p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="border-gray-200 text-gray-700 hover:bg-gray-50">
              Retry
            </Button>
          )}
        </div>
      )}
      {!loading && !error && children}
    </div>
  )
}
