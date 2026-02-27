'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ChartContainer } from '../shared/ChartContainer'
import { ResearchEmptyState } from '../shared/EmptyState'
import { PROGRAM_TYPE_COLORS, PROGRAM_TYPE_LABELS } from '@/lib/research/constants'

export interface FirstDoseDayRow {
  day: number
  name: string
  neurological: number
  mental_health: number
  addiction: number
  unknown: number
  total: number
}

interface FirstDoseDayChartProps {
  data: FirstDoseDayRow[]
  loading: boolean
  error: boolean
  onRetry: () => void
}

const PROGRAM_KEYS = ['neurological', 'mental_health', 'addiction', 'unknown'] as const

function FirstDoseTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name: string; value: number; dataKey: string; payload?: FirstDoseDayRow }[]
  label?: number
}) {
  if (!active || !payload?.length || label == null) return null
  const row = payload[0]?.payload
  if (!row) return null
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-md">
      <p className="mb-2 text-sm font-semibold text-gray-900">First dose on Day {label}</p>
      <div className="space-y-1 text-sm">
        {PROGRAM_KEYS.filter((k) => (row[k] ?? 0) > 0).map((key) => (
          <p key={key} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: PROGRAM_TYPE_COLORS[key] ?? '#6b7280' }}
              aria-hidden
            />
            <span className="text-gray-600">{key === 'unknown' ? 'Other' : (PROGRAM_TYPE_LABELS[key] ?? key)}:</span>
            <span className="font-medium text-gray-900">{row[key]}</span>
          </p>
        ))}
        <p className="mt-1.5 border-t border-gray-100 pt-1.5 font-medium text-gray-900">Total: {row.total} clients</p>
      </div>
    </div>
  )
}

export function FirstDoseDayChart({ data, loading, error, onRetry }: FirstDoseDayChartProps) {
  return (
    <ChartContainer
      title="When clients got their first dose"
      subtitle="Number of clients by day of first ibogaine dose, by program."
      loading={loading}
      error={error}
      onRetry={onRetry}
    >
      {!loading && !error && data.length === 0 && (
        <ResearchEmptyState title="No data" description="No ibogaine dosing records in the selected period." />
      )}
      {!loading && !error && data.length > 0 && (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="day"
              type="number"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              label={{ value: 'Day of first dose', position: 'insideBottom', offset: -8, style: { fill: '#6b7280', fontSize: 11 } }}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 11 }}
              label={{ value: 'Number of clients', angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 11 } }}
            />
            <Tooltip content={<FirstDoseTooltip />} />
            <Legend layout="horizontal" align="center" verticalAlign="bottom" wrapperStyle={{ paddingTop: 8 }} />
            {PROGRAM_KEYS.map((key, i) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="a"
                fill={PROGRAM_TYPE_COLORS[key] ?? '#6b7280'}
                radius={i === PROGRAM_KEYS.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                name={key === 'unknown' ? 'Other' : (PROGRAM_TYPE_LABELS[key] ?? key)}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  )
}
