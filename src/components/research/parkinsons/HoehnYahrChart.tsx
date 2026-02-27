'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { ChartContainer } from '../shared/ChartContainer'
import { ResearchEmptyState } from '../shared/EmptyState'

const HOEHN_YAHR_ORDER = ['Stage 1', 'Stage 1.5', 'Stage 2', 'Stage 2.5', 'Stage 3', 'Stage 4', 'Stage 5', 'Unknown']

const HY_COLORS: Record<string, string> = {
  'Stage 1': '#c4b5fd',
  'Stage 1.5': '#a78bfa',
  'Stage 2': '#8b5cf6',
  'Stage 2.5': '#7c3aed',
  'Stage 3': '#f97316',
  'Stage 4': '#ef4444',
  'Stage 5': '#dc2626',
  Unknown: '#9ca3af',
}

interface HoehnYahrChartProps {
  hoehnYahrCounts: { name: string; value: number }[]
  schwabBins: { label: string; count: number }[]
  loading: boolean
  error: boolean
  onRetry: () => void
}

export function HoehnYahrChart({ hoehnYahrCounts, schwabBins, loading, error, onRetry }: HoehnYahrChartProps) {
  const hasHoehn = hoehnYahrCounts.some((d) => d.value > 0)
  const hasSchwab = schwabBins.some((d) => d.count > 0)

  const sortedHoehnYahr = useMemo(() => {
    const total = hoehnYahrCounts.reduce((s, d) => s + d.value, 0)
    return [...hoehnYahrCounts]
      .sort((a, b) => HOEHN_YAHR_ORDER.indexOf(a.name) - HOEHN_YAHR_ORDER.indexOf(b.name))
      .map((d) => ({ ...d, pct: total > 0 ? Math.round((d.value / total) * 100) : 0 }))
  }, [hoehnYahrCounts])

  const schwabBinsWithLabel = useMemo(
    () => schwabBins.map((b) => ({ ...b, rangeLabel: `${b.label}%` })),
    [schwabBins]
  )

  return (
    <ChartContainer
      title="Hoehn & Yahr and Schwab-England"
      subtitle="Disease stage distribution and activities of daily living (ADL) score ranges"
      loading={loading}
      error={error}
      onRetry={onRetry}
    >
      {!loading && !error && !hasHoehn && !hasSchwab && (
        <ResearchEmptyState title="No data" description="No Parkinson's scale data in cohort." />
      )}
      {!loading && !error && (hasHoehn || hasSchwab) && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
            <h4 className="mb-3 text-base font-semibold text-gray-900">Hoehn & Yahr stage</h4>
            <p className="mb-3 text-xs text-gray-500">Unilateral (1) → bilateral with increasing disability (5)</p>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={sortedHoehnYahr}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={56}
                  outerRadius={88}
                  paddingAngle={2}
                  label={({ name, value }) => (value > 0 ? `${name}: ${value}` : null)}
                >
                  {sortedHoehnYahr.map((entry, i) => (
                    <Cell key={entry.name} fill={HY_COLORS[entry.name] ?? '#9ca3af'} stroke="#fff" strokeWidth={1.5} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value, name, props) => {
                    const numValue = typeof value === 'number' ? value : 0
                    const pct = (props.payload as { pct?: number })?.pct ?? 0
                    return [`${numValue} client${numValue === 1 ? '' : 's'} (${pct}%)`, name]
                  }}
                />
                <Legend layout="horizontal" align="center" verticalAlign="bottom" wrapperStyle={{ paddingTop: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
            <h4 className="mb-3 text-base font-semibold text-gray-900">Schwab-England ADL</h4>
            <p className="mb-3 text-xs text-gray-500">Score 0–100%: higher = more independent in daily activities</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={schwabBinsWithLabel} margin={{ top: 8, right: 8, left: 8, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="rangeLabel"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  label={{ value: 'Score range (%)', position: 'insideBottom', offset: -8, style: { fill: '#6b7280', fontSize: 11 } }}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  label={{ value: 'Number of clients', angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 11 } }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => {
                    const numValue = typeof value === 'number' ? value : 0
                    return [`${numValue} client${numValue === 1 ? '' : 's'}`, 'Count']
                  }}
                  labelFormatter={(label) => `Score range: ${label}`}
                />
                <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Clients" maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </ChartContainer>
  )
}
