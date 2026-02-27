'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { ChartContainer } from '../shared/ChartContainer'
import { ResearchEmptyState } from '../shared/EmptyState'

interface FormCompletionChartProps {
  data: { form_name: string; total_onboarding: number; completed: number; completion_rate: number }[]
  loading: boolean
  error: boolean
  onRetry: () => void
}

function barColor(rate: number): string {
  if (rate >= 80) return '#10b981'
  if (rate >= 60) return '#f59e0b'
  if (rate >= 40) return '#f97316'
  return '#ef4444'
}

export function FormCompletionChart({ data, loading, error, onRetry }: FormCompletionChartProps) {
  const chartData = data.map((r) => ({
    name: r.form_name,
    rate: Number(r.completion_rate) || 0,
    completed: r.completed,
    total: r.total_onboarding,
    label: `${r.completed} of ${r.total_onboarding} (${Number(r.completion_rate)?.toFixed(0) ?? 0}%)`,
  }))

  return (
    <ChartContainer
      title="Form completion rates"
      subtitle="Onboarding forms completed in period"
      loading={loading}
      error={error}
      onRetry={onRetry}
    >
      {!loading && !error && chartData.length === 0 && (
        <ResearchEmptyState title="No data" description="No form completion data for the selected period." />
      )}
      {!loading && !error && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fill: '#6b7280', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
              formatter={(_, __, props: { payload?: { label: string } }) => [props.payload?.label ?? '', '']}
            />
            <Bar dataKey="rate" radius={[0, 4, 4, 0]} maxBarSize={24} label={{ position: 'insideRight', fill: '#374151' }}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={barColor(entry.rate)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  )
}
