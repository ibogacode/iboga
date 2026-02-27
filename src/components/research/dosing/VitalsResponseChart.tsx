'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ChartContainer } from '../shared/ChartContainer'
import { ResearchEmptyState } from '../shared/EmptyState'

interface VitalsRow {
  metric: string
  dosing: number | null
  nonDosing: number | null
}

interface VitalsResponseChartProps {
  vitals: {
    dosing: { avgHeartRate: number | null; avgSystolic: number | null; avgO2: number | null }
    nonDosing: { avgHeartRate: number | null; avgSystolic: number | null; avgO2: number | null }
  }
  loading: boolean
  error: boolean
  onRetry: () => void
}

export function VitalsResponseChart({ vitals, loading, error, onRetry }: VitalsResponseChartProps) {
  const data: VitalsRow[] = [
    { metric: 'Heart rate (bpm)', dosing: vitals.dosing.avgHeartRate, nonDosing: vitals.nonDosing.avgHeartRate },
    { metric: 'Systolic BP', dosing: vitals.dosing.avgSystolic, nonDosing: vitals.nonDosing.avgSystolic },
    { metric: 'O₂ sat (%)', dosing: vitals.dosing.avgO2, nonDosing: vitals.nonDosing.avgO2 },
  ]
  const hasAny = data.some((r) => r.dosing != null || r.nonDosing != null)

  return (
    <ChartContainer
      title="Vitals: dosing vs non-dosing days"
      subtitle="Average on days when ibogaine was given vs not"
      loading={loading}
      error={error}
      onRetry={onRetry}
    >
      {!loading && !error && !hasAny && (
        <ResearchEmptyState title="No vitals" description="No vitals recorded in dosing records." />
      )}
      {!loading && !error && hasAny && (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} />
            <YAxis type="category" dataKey="metric" width={140} tick={{ fill: '#6b7280', fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }} />
            <Bar dataKey="dosing" fill="#7c3aed" radius={[0, 4, 4, 0]} name="Dosing days" />
            <Bar dataKey="nonDosing" fill="#9ca3af" radius={[0, 4, 4, 0]} name="Non-dosing days" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  )
}
