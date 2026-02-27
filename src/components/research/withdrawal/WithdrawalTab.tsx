'use client'

import { useState, useEffect, useCallback } from 'react'
import { StatCard } from '../shared/StatCard'
import { DataCompleteness } from '../shared/DataCompleteness'
import { WithdrawalTrajectoryChart } from './WithdrawalTrajectoryChart'
import { SymptomHeatmap } from './SymptomHeatmap'
import { PatientWithdrawalLookup } from './PatientWithdrawalLookup'
import { WithdrawalBySubstanceTable } from './WithdrawalBySubstanceTable'
import { useWithdrawalData, type AssessmentType } from '@/hooks/research/useWithdrawalData'
import { getResearchWithdrawalCompleteness } from '@/actions/research.action'
import { getSOWSSeverityLabel, getOOWSSeverityLabel, DATA_COMPLETENESS_TABLES, RESEARCH_PLAIN } from '@/lib/research/constants'
import { useResearchFilters } from '@/hooks/research/useResearchFilters'
import { Skeleton } from '@/components/ui/skeleton'

function severityBadgeVariant(label: string): 'emerald' | 'amber' | 'red' | 'default' {
  if (label === 'Mild') return 'emerald'
  if (label === 'Moderate') return 'amber'
  return 'red'
}

export function WithdrawalTab() {
  const { filtersForApi } = useResearchFilters()
  const [activeAssessment, setActiveAssessment] = useState<AssessmentType>('sows')
  const { kpis, trajectory, trajectorySows, trajectoryOows, heatmapData, bySubstance, isLoading, error, refetch } = useWithdrawalData(activeAssessment)
  const [completeness, setCompleteness] = useState<{ total: number; withAssessmentData: number } | null>(null)

  const loadCompleteness = useCallback(async () => {
    const res = await getResearchWithdrawalCompleteness({ filters: { ...filtersForApi, dateFrom: filtersForApi.dateFrom ?? undefined, dateTo: filtersForApi.dateTo ?? undefined } })
    if (res?.data?.success && res.data.data) setCompleteness(res.data.data)
  }, [filtersForApi])

  useEffect(() => {
    loadCompleteness()
  }, [loadCompleteness])

  return (
    <div className="space-y-8">
      {/* KPI cards */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">{RESEARCH_PLAIN.withdrawal.sectionTitle}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl bg-gray-100" />
            ))
          ) : error ? (
            <p className="col-span-full text-sm text-red-500">{error}</p>
          ) : kpis ? (
            <>
              <StatCard
                title={RESEARCH_PLAIN.withdrawal.selfReportScore}
                value={`${kpis.avgPeakSows?.toFixed(1) ?? '—'}`}
                subtitle={RESEARCH_PLAIN.withdrawal.selfReportScale}
                badge={{ label: getSOWSSeverityLabel(kpis.avgPeakSows ?? 0), variant: severityBadgeVariant(getSOWSSeverityLabel(kpis.avgPeakSows ?? 0)) }}
              />
              <StatCard
                title={RESEARCH_PLAIN.withdrawal.staffObservedScore}
                value={`${kpis.avgPeakOows?.toFixed(1) ?? '—'}`}
                subtitle={RESEARCH_PLAIN.withdrawal.staffObservedScale}
                badge={{ label: getOOWSSeverityLabel(kpis.avgPeakOows ?? 0), variant: severityBadgeVariant(getOOWSSeverityLabel(kpis.avgPeakOows ?? 0)) }}
              />
              <StatCard
                title={RESEARCH_PLAIN.withdrawal.daysFeelingBetter}
                value={kpis.avgDaysToResolution?.toFixed(1) ?? '—'}
                subtitle={RESEARCH_PLAIN.withdrawal.daysFeelingBetterSub}
              />
              <StatCard
                title={RESEARCH_PLAIN.withdrawal.severeCases}
                value={`${kpis.severePct?.toFixed(1) ?? 0}%`}
                subtitle={RESEARCH_PLAIN.withdrawal.severeCasesSub}
                badge={{
                  label: (kpis.severePct ?? 0) > 20 ? 'High' : (kpis.severePct ?? 0) > 10 ? 'Moderate' : 'Low',
                  variant: (kpis.severePct ?? 0) > 20 ? 'red' : (kpis.severePct ?? 0) > 10 ? 'amber' : 'emerald',
                }}
              />
            </>
          ) : null}
        </div>
      </section>

      {completeness && (
        <DataCompleteness
          tableName={DATA_COMPLETENESS_TABLES.withdrawal ?? 'withdrawal assessments'}
          count={completeness.withAssessmentData}
          total={completeness.total}
        />
      )}

      <div className="space-y-6">
        <SymptomHeatmap
          data={heatmapData}
          assessmentType={activeAssessment}
          loading={isLoading}
          error={!!error}
          onRetry={refetch}
          onAssessmentChange={setActiveAssessment}
        />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-1">
          <WithdrawalTrajectoryChart
            data={trajectory}
            assessmentType={activeAssessment}
            loading={isLoading}
            error={!!error}
            onRetry={refetch}
            onAssessmentChange={setActiveAssessment}
          />
        </div>
      </div>

      <PatientWithdrawalLookup trajectorySows={trajectorySows} trajectoryOows={trajectoryOows} />

      <WithdrawalBySubstanceTable
        data={bySubstance}
        loading={isLoading}
        error={!!error}
        onRetry={refetch}
      />
    </div>
  )
}
