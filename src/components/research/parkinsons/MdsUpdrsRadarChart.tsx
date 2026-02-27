'use client'

import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { ChartContainer } from '../shared/ChartContainer'
import { ResearchEmptyState } from '../shared/EmptyState'
import { MDS_UPDRS_PARTS } from '@/lib/research/constants'

interface MdsUpdrsRadarChartProps {
  radarData: { subject: string; value: number; fullMark: number }[]
  cohortAvgTotal: number
  loading: boolean
  error: boolean
  onRetry: () => void
}

export function MdsUpdrsRadarChart({ radarData, cohortAvgTotal, loading, error, onRetry }: MdsUpdrsRadarChartProps) {
  return (
    <ChartContainer
      title="MDS-UPDRS by part (normalized)"
      subtitle="Average per part as % of max"
      loading={loading}
      error={error}
      onRetry={onRetry}
    >
      {!loading && !error && radarData.length === 0 && (
        <ResearchEmptyState title="No data" description="No Parkinson's cohort data in the selected period." />
      )}
      {!loading && !error && radarData.length > 0 && (
        <div className="flex flex-wrap items-start gap-6">
          <ResponsiveContainer width="100%" height={280} className="min-w-[280px] max-w-md">
            <RadarChart data={radarData}>
              <PolarGrid stroke="#374151" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#9ca3af' }} />
              <Radar name="Avg %" dataKey="value" stroke="#a855f7" fill="#a855f7" fillOpacity={0.25} strokeWidth={2} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="min-w-[180px] space-y-2 text-sm">
            {MDS_UPDRS_PARTS.map((part, i) => {
              const point = radarData[i]
              const avg = point ? Math.round((point.value / 100) * part.max) : 0
              return (
                <div key={part.key} className="flex items-center justify-between gap-2">
                  <span className="text-gray-600">{part.label.replace(/\n/g, ' ')}</span>
                  <span className="font-medium text-gray-900">
                    {avg} / {part.max}
                  </span>
                </div>
              )
            })}
            <div className="border-t border-gray-200 pt-2 font-medium text-gray-900">
              Total MDS-UPDRS: {Math.round(cohortAvgTotal)} / 260
            </div>
          </div>
        </div>
      )}
    </ChartContainer>
  )
}
