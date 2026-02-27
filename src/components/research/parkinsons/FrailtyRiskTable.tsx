'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChartContainer } from '../shared/ChartContainer'
import { ResearchEmptyState } from '../shared/EmptyState'
import type { ParkinsonsCohortRow } from '@/actions/research.action'
import { RISK_COLORS } from '@/lib/research/constants'
import { cn } from '@/lib/utils'

function anonymize(id: string | null | undefined): string {
  if (!id) return 'P-0000'
  return 'P-' + String(id).replace(/-/g, '').slice(-4).toUpperCase()
}

interface FrailtyRiskTableProps {
  cohort: ParkinsonsCohortRow[]
  loading: boolean
  error: boolean
  onRetry: () => void
}

export function FrailtyRiskTable({ cohort, loading, error, onRetry }: FrailtyRiskTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const pageSize = 10

  const filtered = useMemo(() => {
    if (!search.trim()) return cohort
    const s = search.toLowerCase()
    return cohort.filter(
      (r) =>
        anonymize(r.patient_id).toLowerCase().includes(s) ||
        (r.patient_first_name ?? '').toLowerCase().includes(s) ||
        (r.patient_last_name ?? '').toLowerCase().includes(s)
    )
  }, [cohort, search])

  const sorted = useMemo(() => {
    const riskOrder = (r: ParkinsonsCohortRow) => ((r.risk_classification ?? '').toLowerCase() === 'high' ? 0 : (r.risk_classification ?? '').toLowerCase() === 'moderate' ? 1 : 2)
    return [...filtered].sort((a, b) => {
      const ra = riskOrder(a)
      const rb = riskOrder(b)
      if (ra !== rb) return ra - rb
      return (b.mds_updrs_total_score ?? 0) - (a.mds_updrs_total_score ?? 0)
    })
  }, [filtered])

  const pages = Math.ceil(sorted.length / pageSize)
  const rows = sorted.slice(page * pageSize, page * pageSize + pageSize)

  return (
    <ChartContainer
      title="Frailty and risk"
      subtitle="Neurological cohort — click row for profile"
      loading={loading}
      error={error}
      onRetry={onRetry}
    >
      {!loading && !error && cohort.length === 0 && (
        <ResearchEmptyState title="No cohort" description="No neurological patients in the selected period." />
      )}
      {!loading && !error && cohort.length > 0 && (
        <>
          <div className="mb-4">
            <input
              type="search"
              placeholder="Search by client ID or name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
              className="w-full max-w-xs rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-2 pr-2 text-left font-medium text-gray-500">Client</th>
                  <th className="pb-2 pr-2 text-right font-medium text-gray-500">Age</th>
                  <th className="pb-2 pr-2 text-right font-medium text-gray-500">Dis. duration</th>
                  <th className="pb-2 pr-2 text-left font-medium text-gray-500">H&Y</th>
                  <th className="pb-2 pr-2 text-right font-medium text-gray-500">MDS-UPDRS</th>
                  <th className="pb-2 pr-2 text-right font-medium text-gray-500">Frailty</th>
                  <th className="pb-2 pr-2 text-left font-medium text-gray-500">Risk</th>
                  <th className="pb-2 pr-2 text-left font-medium text-gray-500">Falls</th>
                  <th className="pb-2 pr-2 text-right font-medium text-gray-500">Stay</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const riskLabel = (r.risk_classification ?? '').trim() || '—'
                  const riskKey =
                    riskLabel !== '—' ? riskLabel.charAt(0).toUpperCase() + riskLabel.slice(1).toLowerCase() : ''
                  const riskColor = riskKey ? (RISK_COLORS[riskKey] ?? 'gray') : 'gray'
                  const stay = r.actual_departure_date && r.arrival_date ? (r.stay_days ?? '—') : 'Active'
                  return (
                    <tr
                      key={r.patient_id ?? r.arrival_date ?? Math.random()}
                      className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                      onClick={() => r.patient_id && router.push(`/patient-pipeline/patient-profile/${r.patient_id}`)}
                    >
                      <td className="py-2 pr-2 font-medium text-gray-900">{anonymize(r.patient_id)}</td>
                      <td className="py-2 pr-2 text-right text-gray-600">{r.age_years ?? '—'}</td>
                      <td className="py-2 pr-2 text-right text-gray-600">{r.disease_duration_years ?? '—'}y</td>
                      <td className="py-2 pr-2">
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">{r.hoehn_yahr_stage ?? '—'}</span>
                      </td>
                      <td className="py-2 pr-2 text-right text-gray-600">{r.mds_updrs_total_score ?? '—'}</td>
                      <td className="py-2 pr-2 text-right text-gray-600">{r.mds_pd_frailty_total_score ?? '—'}</td>
                      <td className="py-2 pr-2">
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5 text-xs font-medium',
                            riskColor === 'red' && 'bg-red-100 text-red-700',
                            riskColor === 'amber' && 'bg-amber-100 text-amber-700',
                            riskColor === 'emerald' && 'bg-emerald-100 text-emerald-700',
                            riskColor === 'gray' && 'bg-gray-100 text-gray-600'
                          )}
                        >
                          {riskLabel}
                        </span>
                      </td>
                      <td className="py-2 pr-2 text-gray-600">{r.falls_past_6_12_months ?? '—'}</td>
                      <td className="py-2 pr-2 text-right text-gray-600">{String(stay)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <span>
                Page {page + 1} of {pages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded border border-gray-200 bg-white px-2 py-1 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= pages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded border border-gray-200 bg-white px-2 py-1 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </ChartContainer>
  )
}
