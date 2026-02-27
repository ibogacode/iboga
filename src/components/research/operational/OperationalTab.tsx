'use client'

import { useState } from 'react'
import { StatCard } from '../shared/StatCard'
import { DataCompleteness } from '../shared/DataCompleteness'
import { OnboardingFunnel } from './OnboardingFunnel'
import { CapacityUtilizationChart } from './CapacityUtilizationChart'
import { FormCompletionChart } from './FormCompletionChart'
import { DailySubmissionsChart } from './DailySubmissionsChart'
import { useOperationalData } from '@/hooks/research/useOperationalData'
import { useResearchFilters } from '@/hooks/research/useResearchFilters'
import { Skeleton } from '@/components/ui/skeleton'
import { DATA_COMPLETENESS_TABLES } from '@/lib/research/constants'

export function OperationalTab() {
  const { filtersForApi } = useResearchFilters()
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const { funnel, capacity, formRates, dailySubs, kpis, isLoading, error, refetch } = useOperationalData(selectedYear)

  const completionRate =
    funnel && funnel.intakeFormSubmitted > 0
      ? Math.round((funnel.movedToManagement / funnel.intakeFormSubmitted) * 100)
      : 0
  const avgUtil =
    capacity.length > 0
      ? Math.round((capacity.reduce((a, r) => a + Number(r.utilization_pct), 0) / capacity.length) * 10) / 10
      : 0

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Operational at a glance</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl bg-gray-100" />
            ))
          ) : error ? (
            <p className="col-span-full text-sm text-red-500">{error}</p>
          ) : (
            <>
              <StatCard
                title="Onboarding completion rate"
                value={`${completionRate}%`}
                subtitle={funnel ? `${funnel.movedToManagement} of ${funnel.intakeFormSubmitted} moved to program` : undefined}
              />
              <StatCard
                title="Avg onboarding duration"
                value={kpis ? `${kpis.avgOnboardingDays} days` : '—'}
                subtitle="From created to completed"
              />
              <StatCard
                title="Capacity utilization"
                value={`${avgUtil}%`}
                subtitle={selectedYear ? `Avg for ${selectedYear}` : undefined}
              />
              <StatCard
                title="Medical clearance skip rate"
                value={kpis ? `${kpis.skipRate}%` : '—'}
                subtitle="EKG or bloodwork skipped"
              />
            </>
          )}
        </div>
      </section>

      {kpis && (
        <DataCompleteness
          tableName={DATA_COMPLETENESS_TABLES.operational ?? 'onboarding records'}
          count={kpis.onboardingTotal}
          total={kpis.onboardingTotal}
        />
      )}

      <OnboardingFunnel funnel={funnel} loading={isLoading} error={!!error} onRetry={refetch} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CapacityUtilizationChart
          data={capacity}
          loading={isLoading}
          error={!!error}
          onRetry={refetch}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
        />
        <FormCompletionChart data={formRates} loading={isLoading} error={!!error} onRetry={refetch} />
      </div>

      <DailySubmissionsChart data={dailySubs} loading={isLoading} error={!!error} onRetry={refetch} />
    </div>
  )
}
