'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { ChartContainer } from '../shared/ChartContainer'
import { ResearchEmptyState } from '../shared/EmptyState'
import { getResearchAdmissionsByMonth } from '@/actions/research.action'
import { useResearchFilters } from '@/hooks/research/useResearchFilters'
import { PROGRAM_TYPE_COLORS, PROGRAM_TYPE_LABELS, type ProgramType } from '@/lib/research/constants'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function PatientVolumeChart() {
  const { filtersForApi } = useResearchFilters()
  const [data, setData] = useState<{ month: string; neurological: number; mental_health: number; addiction: number; total: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stacked, setStacked] = useState(true)
  const hasAnimated = useRef(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await getResearchAdmissionsByMonth({
      filters: {
        ...filtersForApi,
        dateFrom: filtersForApi.dateFrom ?? undefined,
        dateTo: filtersForApi.dateTo ?? undefined,
      },
    })
    if (result?.data?.success && result.data.data) {
      setData(
        (result.data.data as { month: string; neurological: number; mental_health: number; addiction: number; total: number }[]).map((r) => ({
          month: r.month,
          neurological: Number(r.neurological) || 0,
          mental_health: Number(r.mental_health) || 0,
          addiction: Number(r.addiction) || 0,
          total: Number(r.total) || 0,
        }))
      )
    } else {
      setError(result?.data?.error ?? 'Failed to load')
    }
    setLoading(false)
  }, [filtersForApi])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!loading && data.length > 0) hasAnimated.current = true
  }, [loading, data.length])

  return (
    <ChartContainer
      title="New clients over time"
      subtitle="By month and program type"
      loading={loading}
      error={!!error}
      onRetry={load}
      action={
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'border-gray-200 text-gray-700',
              stacked && 'bg-emerald-600 text-white border-emerald-600'
            )}
            onClick={() => setStacked(true)}
          >
            Stacked
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'border-gray-200 text-gray-700',
              !stacked && 'bg-emerald-600 text-white border-emerald-600'
            )}
            onClick={() => setStacked(false)}
          >
            Grouped
          </Button>
        </div>
      }
    >
      {!loading && !error && data.length === 0 && (
        <ResearchEmptyState
          title="No data yet"
          description="Pick a date range above to see new clients by month."
        />
      )}
      {!loading && !error && data.length > 0 && (
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                {(Object.keys(PROGRAM_TYPE_LABELS) as ProgramType[]).map((key) => (
                  <linearGradient key={key} id={`fill-vol-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PROGRAM_TYPE_COLORS[key]} stopOpacity={stacked ? 0.8 : 0.3} />
                    <stop offset="100%" stopColor={PROGRAM_TYPE_COLORS[key]} stopOpacity={0.1} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                }}
                labelStyle={{ color: '#374151' }}
                formatter={(value, name) => [value ?? 0, PROGRAM_TYPE_LABELS[name as string] ?? name]}
                labelFormatter={(label) => label}
              />
              <Legend />
              {(Object.keys(PROGRAM_TYPE_LABELS) as ProgramType[]).map((key) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={PROGRAM_TYPE_LABELS[key]}
                  stroke={PROGRAM_TYPE_COLORS[key]}
                  fill={`url(#fill-vol-${key})`}
                  stackId={stacked ? 'a' : undefined}
                  isAnimationActive={!hasAnimated.current}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartContainer>
  )
}
