'use client'

import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: string
  badge?: { label: string; variant: 'emerald' | 'amber' | 'red' | 'default' }
  className?: string
}

const badgeClass: Record<string, string> = {
  emerald: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30',
  amber: 'bg-amber-500/20 text-amber-600 border-amber-500/30',
  red: 'bg-red-500/20 text-red-600 border-red-500/30',
  default: 'bg-gray-100 text-gray-600 border-gray-200',
}

export function StatCard({ title, value, subtitle, trend, badge, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-100 bg-white p-6 shadow-sm',
        className
      )}
    >
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
      {trend && (
        <p className="mt-1 text-xs text-gray-600">
          {trend}
        </p>
      )}
      {badge && (
        <span
          className={cn(
            'mt-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
            badgeClass[badge.variant] ?? badgeClass.default
          )}
        >
          {badge.label}
        </span>
      )}
    </div>
  )
}
