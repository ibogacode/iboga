'use client'

import { StatCard } from '../shared/StatCard'
import { DataCompleteness } from '../shared/DataCompleteness'
import { MdsUpdrsRadarChart } from './MdsUpdrsRadarChart'
import { MotorScoreHistogram } from './MotorScoreHistogram'
import { HoehnYahrChart } from './HoehnYahrChart'
import { PsychologicalBaselineChart } from './PsychologicalBaselineChart'
import { FrailtyRiskTable } from './FrailtyRiskTable'
import { useParkinsonsData } from '@/hooks/research/useParkinsonsData'
import { Skeleton } from '@/components/ui/skeleton'
import { DATA_COMPLETENESS_TABLES } from '@/lib/research/constants'

export function ParkinsonsTab() {
  const {
    cohort,
    kpis,
    radarData,
    motorHistogram,
    hoehnYahrCounts,
    schwabEnglandBins,
    psychBaseline,
    withMdsCount,
    isLoading,
    error,
    refetch,
  } = useParkinsonsData()

  const motorTotal = motorHistogram.reduce((a, r) => a + r.count, 0)

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Parkinson&apos;s program at a glance</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl bg-gray-100" />
            ))
          ) : error ? (
            <p className="col-span-full text-sm text-red-500">{error}</p>
          ) : (
            <>
              <StatCard title="Cohort size" value={String(kpis.totalPatients)} subtitle="Neurological clients in period" />
              <StatCard
                title="Avg MDS-UPDRS total"
                value={kpis.avgMdsUpdrsTotal > 0 ? String(kpis.avgMdsUpdrsTotal) : '—'}
                subtitle="0–260 scale"
              />
              <StatCard
                title="Avg frailty score"
                value={kpis.avgFrailty > 0 ? String(kpis.avgFrailty) : '—'}
                subtitle="MDS-PD frailty"
              />
              <StatCard
                title="High risk"
                value={`${kpis.highRiskCount} (${kpis.highRiskPct}%)`}
                subtitle="Risk classification"
              />
            </>
          )}
        </div>
      </section>

      {cohort.length > 0 && (
        <DataCompleteness
          tableName={DATA_COMPLETENESS_TABLES.parkinsons ?? "Parkinson's assessment data"}
          count={withMdsCount}
          total={cohort.length}
        />
      )}

      <MdsUpdrsRadarChart
        radarData={radarData}
        cohortAvgTotal={kpis.avgMdsUpdrsTotal}
        loading={isLoading}
        error={!!error}
        onRetry={refetch}
      />

      <MotorScoreHistogram
        data={motorHistogram}
        total={motorTotal}
        loading={isLoading}
        error={!!error}
        onRetry={refetch}
      />

      <HoehnYahrChart
        hoehnYahrCounts={hoehnYahrCounts}
        schwabBins={schwabEnglandBins}
        loading={isLoading}
        error={!!error}
        onRetry={refetch}
      />

      <PsychologicalBaselineChart data={psychBaseline} loading={isLoading} error={!!error} onRetry={refetch} />

      <FrailtyRiskTable cohort={cohort} loading={isLoading} error={!!error} onRetry={refetch} />
    </div>
  )
}
