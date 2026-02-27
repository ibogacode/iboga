'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { ChartContainer } from '../shared/ChartContainer'
import { ResearchEmptyState } from '../shared/EmptyState'

interface MotorScoreHistogramProps {
  data: { label: string; count: number }[]
  total: number
  loading: boolean
  error: boolean
  onRetry: () => void
}

export function MotorScoreHistogram({ data, total, loading, error, onRetry }: MotorScoreHistogramProps) {
  return (
    <ChartContainer
      title="Motor score (Part III) distribution"
      subtitle="MDS-UPDRS Part III"
      loading={loading}
      error={error}
      onRetry={onRetry}
    >
      {!loading && !error && data.every((d) => d.count === 0) && (
        <ResearchEmptyState title="No data" description="No Part III scores in cohort." />
      )}
      {!loading && !error && data.some((d) => d.count > 0) && (
        <>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }} />
              <ReferenceLine x="21–40" stroke="#f59e0b" strokeDasharray="4 4" />
              <ReferenceLine x="41–60" stroke="#f97316" strokeDasharray="4 4" />
              <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Clients" />
            </BarChart>
          </ResponsiveContainer>
          <table className="mt-4 w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="pb-2 text-left">Bin</th>
                <th className="pb-2 text-right">Count</th>
                <th className="pb-2 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.label} className="border-b border-gray-100">
                  <td className="py-1 text-gray-600">{row.label}</td>
                  <td className="py-1 text-right text-gray-900">{row.count}</td>
                  <td className="py-1 text-right text-gray-600">{total > 0 ? Math.round((row.count / total) * 100) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </ChartContainer>
  )
}
