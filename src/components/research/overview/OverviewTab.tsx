'use client'

import { useEffect, useState, useCallback } from 'react'
import { getResearchOverviewStats } from '@/actions/research.action'
import { StatCard } from '../shared/StatCard'
import { DataCompleteness } from '../shared/DataCompleteness'
import { PatientVolumeChart } from './PatientVolumeChart'
import { OutcomesSummaryTable } from './OutcomesSummaryTable'
import { RecentActivityFeed } from './RecentActivityFeed'
import { completionRateColor } from '@/lib/research/formatters'
import { RESEARCH_PLAIN } from '@/lib/research/constants'
import { useResearchFilters } from '@/hooks/research/useResearchFilters'
import { Skeleton } from '@/components/ui/skeleton'

export function OverviewTab() {
  const { filtersForApi } = useResearchFilters()
  const [stats, setStats] = useState<{
    totalPatients: number
    activePatients: number
    avgLengthOfStay: number
    completionRate: number
    medicalClearanceRate: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await getResearchOverviewStats({
      filters: {
        ...filtersForApi,
        dateFrom: filtersForApi.dateFrom ?? undefined,
        dateTo: filtersForApi.dateTo ?? undefined,
      },
    })
    if (result?.data?.success && result.data.data) {
      setStats(result.data.data)
    } else {
      setError(result?.data?.error ?? 'Failed to load stats')
    }
    setLoading(false)
  }, [filtersForApi])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  return (
    <div className="space-y-8">
      {/* Section A: KPI Stat Cards */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">{RESEARCH_PLAIN.overview.sectionTitle}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl bg-gray-100" />
            ))
          ) : error ? (
            <p className="col-span-full text-sm text-red-500">{error}</p>
          ) : stats ? (
            <>
              <StatCard
                title={RESEARCH_PLAIN.overview.totalTreated}
                value={stats.totalPatients}
              />
              <StatCard
                title={RESEARCH_PLAIN.overview.activePatients}
                value={stats.activePatients}
              />
              <StatCard
                title={RESEARCH_PLAIN.overview.avgStay}
                value={`${stats.avgLengthOfStay} ${RESEARCH_PLAIN.overview.days}`}
              />
              <StatCard
                title={RESEARCH_PLAIN.overview.completionRate}
                value={`${stats.completionRate}%`}
                badge={{
                  label:
                    completionRateColor(stats.completionRate) === 'emerald'
                      ? RESEARCH_PLAIN.overview.completionGood
                      : completionRateColor(stats.completionRate) === 'amber'
                        ? RESEARCH_PLAIN.overview.completionFair
                        : RESEARCH_PLAIN.overview.completionLow,
                  variant: completionRateColor(stats.completionRate),
                }}
              />
              <StatCard
                title={RESEARCH_PLAIN.overview.medicalClearance}
                value={`${stats.medicalClearanceRate}%`}
              />
            </>
          ) : null}
        </div>
      </section>

      {/* Data completeness banner */}
      {stats && (
        <DataCompleteness
          tableName="clients in selected period"
          count={stats.totalPatients}
          total={stats.totalPatients}
        />
      )}

      {/* Section B: Patient Volume Chart */}
      <section>
        <PatientVolumeChart />
      </section>

      {/* Section C placeholder / Section D: Outcomes table */}
      <section>
        <OutcomesSummaryTable />
      </section>

      {/* Section E: Recent Activity */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2" />
        <RecentActivityFeed />
      </section>
    </div>
  )
}
