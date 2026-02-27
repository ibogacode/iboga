'use client'

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
import { format, parseISO } from 'date-fns'
import { ChartContainer } from '../shared/ChartContainer'
import { ResearchEmptyState } from '../shared/EmptyState'

interface DailySubmissionsChartProps {
  data: {
    submission_date: string
    medical_updates: number
    psychological_updates: number
    sows_assessments: number
    oows_assessments: number
    total: number
  }[]
  loading: boolean
  error: boolean
  onRetry: () => void
}

export function DailySubmissionsChart({ data, loading, error, onRetry }: DailySubmissionsChartProps) {
  const chartData = data.map((r) => ({
    date: r.submission_date,
    name: format(parseISO(r.submission_date), 'MMM d'),
    medical: r.medical_updates,
    psychological: r.psychological_updates,
    sows: r.sows_assessments,
    oows: r.oows_assessments,
    total: r.total,
  }))

  return (
    <ChartContainer
      title="Daily form submissions"
      subtitle="By form type"
      loading={loading}
      error={error}
      onRetry={onRetry}
    >
      {!loading && !error && chartData.length === 0 && (
        <ResearchEmptyState title="No data" description="No submission activity for the selected period." />
      )}
      {!loading && !error && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.date && format(parseISO(payload[0].payload.date), 'MMM d, yyyy')}
            />
            <Area type="monotone" dataKey="medical" stackId="a" fill="#3b82f6" stroke="#3b82f6" fillOpacity={0.6} name="Medical" />
            <Area type="monotone" dataKey="psychological" stackId="a" fill="#a855f7" stroke="#a855f7" fillOpacity={0.6} name="Psychological" />
            <Area type="monotone" dataKey="sows" stackId="a" fill="#f59e0b" stroke="#f59e0b" fillOpacity={0.6} name="Self-report" />
            <Area type="monotone" dataKey="oows" stackId="a" fill="#10b981" stroke="#10b981" fillOpacity={0.6} name="Staff-observed" />
            <Legend />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  )
}
