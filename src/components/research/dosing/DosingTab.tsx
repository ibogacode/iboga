'use client'

import { StatCard } from '../shared/StatCard'
import { DataCompleteness } from '../shared/DataCompleteness'
import { DoseTimelineChart } from './DoseTimelineChart'
import { VitalsResponseChart } from './VitalsResponseChart'
import { FirstDoseDayChart } from './FirstDoseDayChart'
import { MedicationFrequencyTable } from './MedicationFrequencyTable'
import { useDosingData } from '@/hooks/research/useDosingData'
import { Skeleton } from '@/components/ui/skeleton'
import { DATA_COMPLETENESS_TABLES } from '@/lib/research/constants'

export function DosingTab() {
  const {
    kpis,
    doseTimeline,
    vitalsDosingVsNon,
    firstDoseByDay,
    medicationMentions,
    patientsWithDose,
    totalPatients,
    isLoading,
    error,
    refetch,
  } = useDosingData()

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Treatment & dosing at a glance</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl bg-gray-100" />
            ))
          ) : error ? (
            <p className="col-span-full text-sm text-red-500">{error}</p>
          ) : (
            <>
              <StatCard
                title="Avg dosing days per client"
                value={kpis ? String(kpis.avgDosingDays) : '—'}
                subtitle="Among clients who received ibogaine"
              />
              <StatCard
                title="Clients receiving ibogaine"
                value={kpis ? String(kpis.patientsReceiving) : '—'}
                subtitle="In selected period"
              />
              <StatCard
                title="Most common frequency"
                value={kpis?.mostCommonFrequency ?? '—'}
                subtitle="Ibogaine dosing frequency"
              />
            </>
          )}
        </div>
      </section>

      {totalPatients > 0 && (
        <DataCompleteness
          tableName={DATA_COMPLETENESS_TABLES.dosing ?? 'dosing and vitals'}
          count={patientsWithDose}
          total={totalPatients}
        />
      )}

      <DoseTimelineChart data={doseTimeline} loading={isLoading} error={!!error} onRetry={refetch} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <VitalsResponseChart vitals={vitalsDosingVsNon} loading={isLoading} error={!!error} onRetry={refetch} />
        <FirstDoseDayChart
          data={firstDoseByDay}
          loading={isLoading}
          error={!!error}
          onRetry={refetch}
        />
      </div>

      <MedicationFrequencyTable data={medicationMentions} loading={isLoading} error={!!error} onRetry={refetch} />
    </div>
  )
}
