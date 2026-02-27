'use client'

import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from 'recharts'
import { ChartContainer } from '../shared/ChartContainer'
import { ResearchEmptyState } from '../shared/EmptyState'

interface Point {
  x: number
  y: number
  managementId: string
}

interface DoseWithdrawalScatterProps {
  scatterData: Point[]
  regression: { slope: number; intercept: number; r2: number }
  loading: boolean
  error: boolean
  onRetry: () => void
}

export function DoseWithdrawalScatter({ scatterData, regression, loading, error, onRetry }: DoseWithdrawalScatterProps) {
  return (
    <ChartContainer
      title="Average dose on dosing days only (trend)"
      subtitle="Among clients who received ibogaine that day only (0 mg excluded). One point per day; trend line in caption."
      loading={loading}
      error={error}
      onRetry={onRetry}
    >
      {!loading && !error && scatterData.length === 0 && (
        <ResearchEmptyState title="No dosing points" description="No ibogaine dosing records in the selected period." />
      )}
      {!loading && !error && scatterData.length > 0 && (
        <>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" dataKey="x" name="Day of stay" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis type="number" dataKey="y" name="Avg dose (mg)" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <ZAxis range={[50, 400]} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={scatterData} fill="#7c3aed" fillOpacity={0.7} />
            </ScatterChart>
          </ResponsiveContainer>
          {scatterData.length >= 2 && (
            <p className="mt-2 text-xs text-gray-500">
              R² = {regression.r2.toFixed(3)} · slope = {regression.slope.toFixed(2)} mg/day
            </p>
          )}
        </>
      )}
    </ChartContainer>
  )
}
