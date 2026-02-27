'use client'

import { ChartContainer } from '../shared/ChartContainer'
import { ResearchEmptyState } from '../shared/EmptyState'
import type { OperationalFunnel } from '@/hooks/research/useOperationalData'

const STAGES: { key: keyof OperationalFunnel; label: string }[] = [
  { key: 'intakeFormSubmitted', label: 'Intake submitted' },
  { key: 'onboardingCreated', label: 'Onboarding created' },
  { key: 'paymentReceived', label: 'Payment received' },
  { key: 'medicalClearance', label: 'Medical clearance' },
  { key: 'treatmentDateAssigned', label: 'Treatment date set' },
  { key: 'movedToManagement', label: 'Moved to program' },
]

interface OnboardingFunnelProps {
  funnel: OperationalFunnel | null
  loading: boolean
  error: boolean
  onRetry: () => void
}

export function OnboardingFunnel({ funnel, loading, error, onRetry }: OnboardingFunnelProps) {
  const firstCount = funnel?.intakeFormSubmitted ?? 0

  return (
    <ChartContainer
      title="Onboarding funnel"
      subtitle="From intake to program"
      loading={loading}
      error={error}
      onRetry={onRetry}
    >
      {!loading && !error && !funnel && (
        <ResearchEmptyState title="No data" description="No funnel data for the selected period." />
      )}
      {!loading && !error && funnel && (
        <div className="space-y-3">
          {STAGES.map((stage, i) => {
            const count = Number(funnel[stage.key]) || 0
            const pct = firstCount > 0 ? Math.round((count / firstCount) * 100) : 0
            const prevCount = i === 0 ? firstCount : Number(funnel[STAGES[i - 1].key]) || 0
            const conv = prevCount > 0 ? Math.round((count / prevCount) * 100) : 0
            const convColor = conv >= 80 ? 'text-emerald-600' : conv >= 60 ? 'text-amber-600' : 'text-red-500'
            return (
              <div key={stage.key} className="flex flex-col gap-1">
                <div className="flex items-center gap-4">
                  <span className="w-40 shrink-0 text-sm text-gray-600">{stage.label}</span>
                  <div className="h-4 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-emerald-600"
                      style={{ width: firstCount > 0 ? `${(count / firstCount) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="w-16 text-right text-sm font-medium text-gray-900">{count.toLocaleString()}</span>
                  <span className={`w-12 text-right text-xs ${convColor}`}>{i === 0 ? '100%' : `${conv}%`}</span>
                </div>
                {i > 0 && prevCount > count && (
                  <p className="text-xs text-red-500">
                    ▼ {prevCount - count} dropped ({Math.round(((prevCount - count) / prevCount) * 100)}%)
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </ChartContainer>
  )
}
