'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'
import { ChartContainer } from '../shared/ChartContainer'
import { ResearchEmptyState } from '../shared/EmptyState'

interface PsychRow {
  label: string
  avg: number
  higherIsBetter?: boolean
}

interface PsychologicalBaselineChartProps {
  data: PsychRow[]
  loading: boolean
  error: boolean
  onRetry: () => void
}

function barColor(row: PsychRow): string {
  const good = row.higherIsBetter ? row.avg >= 3.5 : row.avg <= 2.5
  const bad = row.higherIsBetter ? row.avg <= 2 : row.avg >= 4
  if (good) return '#10b981'
  if (bad) return '#ef4444'
  return '#f59e0b'
}

export function PsychologicalBaselineChart({ data, loading, error, onRetry }: PsychologicalBaselineChartProps) {
  return (
    <ChartContainer
      title="Psychological baseline (cohort average)"
      subtitle="1 = best/none, 5 = worst/severe"
      loading={loading}
      error={error}
      onRetry={onRetry}
    >
      {!loading && !error && data.length === 0 && (
        <ResearchEmptyState title="No data" description="No psych ratings in cohort." />
      )}
      {!loading && !error && data.length > 0 && (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" domain={[1, 5]} tick={{ fill: '#6b7280', fontSize: 11 }} />
            <YAxis type="category" dataKey="label" width={140} tick={{ fill: '#6b7280', fontSize: 11 }} />
            <ReferenceLine x={3} stroke="#9ca3af" strokeDasharray="4 4" />
            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }} />
            <Bar dataKey="avg" radius={[0, 4, 4, 0]} maxBarSize={24}>
              {data.map((entry, i) => (
                <Cell key={i} fill={barColor(entry)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  )
}
