'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ChartContainer } from '../shared/ChartContainer'
import { ResearchEmptyState } from '../shared/EmptyState'

interface DoseTimelineChartProps {
  data: { day: number; clientCount: number; dosingCount: number; avgMg: number }[]
  loading: boolean
  error: boolean
  onRetry: () => void
}

function DosingTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { dataKey: string; value: number; color: string; payload?: { clientCount: number; avgMg: number } }[]
  label?: number
}) {
  if (!active || !payload?.length || label == null) return null
  const point = payload[0]?.payload
  if (!point) return null
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-md">
      <p className="mb-2 text-sm font-semibold text-gray-900">Day {label} of stay</p>
      <div className="space-y-1 text-sm">
        <p className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#7c3aed]" aria-hidden />
          <span className="text-gray-600">Number of clients:</span>
          <span className="font-medium text-gray-900">{point.clientCount}</span>
        </p>
        <p className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#10b981]" aria-hidden />
          <span className="text-gray-600">Average dose:</span>
          <span className="font-medium text-gray-900">{point.avgMg} mg</span>
        </p>
      </div>
    </div>
  )
}

export function DoseTimelineChart({ data, loading, error, onRetry }: DoseTimelineChartProps) {
  return (
    <ChartContainer
      title="Dosing by day of stay"
      subtitle="Purple bars = number of clients with a record that day. Green bars = average ibogaine dose (mg) across those clients (0 mg counted when no dose given)."
      loading={loading}
      error={error}
      onRetry={onRetry}
    >
      {!loading && !error && data.length === 0 && (
        <ResearchEmptyState title="No data" description="No dosing records in the selected period." />
      )}
      {!loading && !error && data.length > 0 && (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="day" type="number" tick={{ fill: '#6b7280', fontSize: 11 }} label={{ value: 'Day of stay', position: 'insideBottom', offset: -8, style: { fill: '#6b7280', fontSize: 11 } }} />
            <YAxis
              yAxisId="left"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              label={{ value: 'Number of clients', angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 11 } }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              label={{ value: 'Average dose (mg)', angle: 90, position: 'insideRight', style: { fill: '#6b7280', fontSize: 11 } }}
            />
            <Tooltip content={<DosingTooltipContent />} />
            <Legend layout="horizontal" align="center" verticalAlign="bottom" wrapperStyle={{ paddingTop: 8 }} />
            <Bar yAxisId="left" dataKey="clientCount" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Number of clients" />
            <Bar yAxisId="right" dataKey="avgMg" fill="#10b981" radius={[4, 4, 0, 0]} name="Average dose (mg)" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  )
}
