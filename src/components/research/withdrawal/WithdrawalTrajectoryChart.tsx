'use client'

import { useRef, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { ChartContainer } from '../shared/ChartContainer'
import { ResearchEmptyState } from '../shared/EmptyState'
import { SOWS_THRESHOLDS, OOWS_THRESHOLDS } from '@/lib/research/constants'
import { PROGRAM_TYPE_COLORS } from '@/lib/research/constants'
import type { AssessmentType } from '@/hooks/research/useWithdrawalData'

interface WithdrawalTrajectoryChartProps {
  data: { day_of_stay: number; avg_score: number; patient_count: number }[]
  assessmentType: AssessmentType
  loading: boolean
  error: boolean
  onRetry: () => void
  onAssessmentChange: (type: AssessmentType) => void
}

export function WithdrawalTrajectoryChart({
  data,
  assessmentType,
  loading,
  error,
  onRetry,
  onAssessmentChange,
}: WithdrawalTrajectoryChartProps) {
  const hasAnimated = useRef(false)
  useEffect(() => {
    if (!loading && data.length > 0) hasAnimated.current = true
  }, [loading, data.length])

  const chartData = data
    .filter((r) => r.day_of_stay >= 1)
    .map((r) => ({
      day: r.day_of_stay,
      name: `Day ${r.day_of_stay}`,
      score: Number(r.avg_score),
      patients: r.patient_count,
    }))

  const isSOWS = assessmentType === 'sows'
  const yMax = isSOWS ? 64 : 13
  const sowsThresholds = SOWS_THRESHOLDS
  const oowsThresholds = OOWS_THRESHOLDS

  return (
    <ChartContainer
      title="How withdrawal changes day by day"
      subtitle="Average score across clients. Lower = less withdrawal (feeling better)."
      loading={loading}
      error={error}
      onRetry={onRetry}
      action={
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onAssessmentChange('sows')}
            className={`rounded px-2 py-1 text-sm ${isSOWS ? 'bg-emerald-600 text-white' : 'border border-gray-200 bg-white text-gray-600'}`}
          >
            Self-report
          </button>
          <button
            type="button"
            onClick={() => onAssessmentChange('oows')}
            className={`rounded px-2 py-1 text-sm ${!isSOWS ? 'bg-emerald-600 text-white' : 'border border-gray-200 bg-white text-gray-600'}`}
          >
            Staff-observed
          </button>
        </div>
      }
    >
      {!loading && !error && chartData.length === 0 && (
        <ResearchEmptyState title="No data yet" description="No withdrawal check-ins in this period." />
      )}
      {!loading && !error && chartData.length > 0 && (
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tick={{ fill: '#374151' }} />
              <YAxis stroke="#6b7280" fontSize={12} domain={[0, yMax]} tick={{ fill: '#374151' }} label={{ value: 'Score', angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 11 } }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                labelStyle={{ color: '#111827', fontWeight: 600 }}
                formatter={(value, _name, props) => {
                  const payload = props?.payload as { day: number; patients: number } | undefined
                  const n = payload?.patients ?? 0
                  return [`Score: ${Number(value ?? 0).toFixed(1)} · ${n} client${n === 1 ? '' : 's'}`, 'Average']
                }}
                labelFormatter={(label) => (label ? `Day ${String(label).replace(/^Day /, '')}` : '')}
              />
              {isSOWS && (
                <>
                  <ReferenceLine y={sowsThresholds.mild} stroke="#f59e0b" strokeDasharray="4 4" label="Mild" />
                  <ReferenceLine y={sowsThresholds.moderate} stroke="#f97316" strokeDasharray="4 4" label="Moderate" />
                  <ReferenceLine y={sowsThresholds.significant} stroke="#ef4444" strokeDasharray="4 4" label="Severe" />
                </>
              )}
              {!isSOWS && (
                <>
                  <ReferenceLine y={oowsThresholds.mild} stroke="#f59e0b" strokeDasharray="4 4" label="Mild" />
                  <ReferenceLine y={oowsThresholds.moderate} stroke="#f97316" strokeDasharray="4 4" label="Moderate" />
                  <ReferenceLine y={oowsThresholds.severe} stroke="#ef4444" strokeDasharray="4 4" label="Severe" />
                </>
              )}
              <Line
                type="monotone"
                dataKey="score"
                stroke="#a855f7"
                strokeWidth={2}
                dot={{ fill: '#a855f7', r: 3 }}
                isAnimationActive={!hasAnimated.current}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartContainer>
  )
}
