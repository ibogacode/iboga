'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { ChartContainer } from '../shared/ChartContainer'
import { ResearchEmptyState } from '../shared/EmptyState'

interface CapacityUtilizationChartProps {
  data: { treatment_date: string; slots_used: number; capacity_max: number; utilization_pct: number }[]
  loading: boolean
  error: boolean
  onRetry: () => void
  selectedYear: number
  onYearChange: (year: number) => void
}

export function CapacityUtilizationChart({
  data,
  loading,
  error,
  onRetry,
  selectedYear,
  onYearChange,
}: CapacityUtilizationChartProps) {
  const byMonth = useMemo(() => {
    const map = new Map<string, { util: number[]; dates: number }>()
    data.forEach((r) => {
      const month = r.treatment_date.slice(0, 7)
      const existing = map.get(month)
      if (existing) {
        existing.util.push(Number(r.utilization_pct))
        existing.dates++
      } else map.set(month, { util: [Number(r.utilization_pct)], dates: 1 })
    })
    return Array.from(map.entries())
      .map(([month, v]) => ({
        month,
        label: format(parseISO(month + '-01'), 'MMM yyyy'),
        avgUtil: v.util.length ? Math.round((v.util.reduce((a, b) => a + b, 0) / v.util.length) * 10) / 10 : 0,
        days: v.dates,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
  }, [data])

  const years = useMemo(() => {
    const y = new Date().getFullYear()
    return [y, y - 1, y - 2]
  }, [])

  return (
    <ChartContainer
      title="Capacity utilization"
      subtitle="Average utilization by month"
      loading={loading}
      error={error}
      onRetry={onRetry}
      action={
        <select
          value={selectedYear}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="rounded border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      }
    >
      {!loading && !error && byMonth.length === 0 && (
        <ResearchEmptyState title="No data" description="No capacity data for the selected year." />
      )}
      {!loading && !error && byMonth.length > 0 && (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={byMonth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
              formatter={(value) => [`${value ?? 0}%`, 'Avg utilization']}
            />
            <ReferenceLine y={80} stroke="#f59e0b" strokeDasharray="4 4" />
            <Bar dataKey="avgUtil" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Avg %" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  )
}
