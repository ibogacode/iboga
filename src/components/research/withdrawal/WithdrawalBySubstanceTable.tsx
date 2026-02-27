'use client'

import { ChartContainer } from '../shared/ChartContainer'
import { ResearchEmptyState } from '../shared/EmptyState'
import { cn } from '@/lib/utils'

interface WithdrawalBySubstanceTableProps {
  data: {
    substance_category: string
    patient_count: number
    avg_peak_sows: number
    avg_peak_oows: number
    severe_cases_count: number
    severe_cases_pct: number
  }[]
  loading: boolean
  error: boolean
  onRetry: () => void
}

const SUBSTANCE_COLORS: Record<string, string> = {
  Opioids: '#ef4444',
  Alcohol: '#f59e0b',
  Benzodiazepines: '#8b5cf6',
  Stimulants: '#06b6d4',
  Cannabis: '#22c55e',
  Polysubstance: '#a855f7',
  Other: '#6b7280',
  Unknown: '#4b5563',
}

export function WithdrawalBySubstanceTable({
  data,
  loading,
  error,
  onRetry,
}: WithdrawalBySubstanceTableProps) {
  const sorted = [...data].sort((a, b) => (b.avg_peak_sows ?? 0) - (a.avg_peak_sows ?? 0))

  return (
    <ChartContainer title="Withdrawal by primary substance" subtitle="How intense withdrawal was by substance type" loading={loading} error={error} onRetry={onRetry}>
      {!loading && !error && sorted.length === 0 && (
        <ResearchEmptyState title="No data" description="No withdrawal check-ins linked to substance info in this period." />
      )}
      {!loading && !error && sorted.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-3 pr-4 text-left font-medium text-gray-500">Primary Substance</th>
                <th className="pb-3 pr-4 text-right font-medium text-gray-500">Clients</th>
                <th className="pb-3 pr-4 text-right font-medium text-gray-500">Peak self-report</th>
                <th className="pb-3 pr-4 text-right font-medium text-gray-500">Peak observed</th>
                <th className="pb-3 pr-4 text-right font-medium text-gray-500">Severe cases</th>
                <th className="pb-3 text-right font-medium text-gray-500">% severe</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.substance_category} className="border-b border-gray-100">
                  <td className="py-2 pr-4">
                    <span
                      className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: `${SUBSTANCE_COLORS[row.substance_category] ?? '#6b7280'}20`,
                        color: SUBSTANCE_COLORS[row.substance_category] ?? '#9ca3af',
                      }}
                    >
                      {row.substance_category}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-right text-gray-900">{row.patient_count}</td>
                  <td className="py-2 pr-4 text-right text-gray-600">{row.avg_peak_sows?.toFixed(1) ?? '—'}</td>
                  <td className="py-2 pr-4 text-right text-gray-600">{row.avg_peak_oows?.toFixed(1) ?? '—'}</td>
                  <td className="py-2 pr-4 text-right text-gray-600">{row.severe_cases_count}</td>
                  <td className="py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-800">
                        <div
                          className={cn('h-full rounded-full', row.severe_cases_pct > 20 ? 'bg-red-500' : row.severe_cases_pct > 10 ? 'bg-amber-500' : 'bg-emerald-500')}
                          style={{ width: `${Math.min(100, row.severe_cases_pct)}%` }}
                        />
                      </div>
                      <span className="text-gray-600">{row.severe_cases_pct?.toFixed(1) ?? 0}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ChartContainer>
  )
}
