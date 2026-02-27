'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { getResearchOutcomesRaw } from '@/actions/research.action'
import { useResearchFilters } from '@/hooks/research/useResearchFilters'
import { ChartContainer } from '../shared/ChartContainer'
import { ResearchEmptyState } from '../shared/EmptyState'
import { PROGRAM_TYPE_LABELS, PROGRAM_TYPE_COLORS } from '@/lib/research/constants'
import { completionRateColor } from '@/lib/research/formatters'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type ProgramTypeKey = 'neurological' | 'mental_health' | 'addiction'

interface Row {
  programType: string
  total: number
  avgStay: number
  completed: number
  active: number
  completionRate: number
}

export function OutcomesSummaryTable() {
  const { filtersForApi } = useResearchFilters()
  const [rows, setRows] = useState<Row[]>([])
  const [totalRow, setTotalRow] = useState<Row | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<'total' | 'avgStay' | 'completionRate'>('total')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await getResearchOutcomesRaw({
      filters: {
        ...filtersForApi,
        dateFrom: filtersForApi.dateFrom ?? undefined,
        dateTo: filtersForApi.dateTo ?? undefined,
      },
    })
    if (!result?.data?.success || !result.data.data) {
      setError(result?.data?.error ?? 'Failed to load')
      setLoading(false)
      return
    }
    const raw = result.data.data as { program_type: string; status: string; arrival_date: string; actual_departure_date: string | null }[]

    const byProgram = new Map<string, { total: number; completed: number; active: number; stayDays: number[] }>()
    raw.forEach((r) => {
      const pt = r.program_type || 'unknown'
      if (!byProgram.has(pt)) {
        byProgram.set(pt, { total: 0, completed: 0, active: 0, stayDays: [] })
      }
      const row = byProgram.get(pt)!
      row.total += 1
      if (r.status === 'discharged') row.completed += 1
      else row.active += 1
      if (r.actual_departure_date && r.arrival_date) {
        const a = new Date(r.arrival_date).getTime()
        const d = new Date(r.actual_departure_date).getTime()
        row.stayDays.push(Math.round((d - a) / (24 * 60 * 60 * 1000)))
      }
    })

    const sortedPrograms = Array.from(byProgram.entries()).sort((a, b) => b[1].total - a[1].total)
    const tableRows: Row[] = sortedPrograms.map(([programType, v]) => ({
      programType,
      total: v.total,
      avgStay: v.stayDays.length ? Math.round(v.stayDays.reduce((s, d) => s + d, 0) / v.stayDays.length) : 0,
      completed: v.completed,
      active: v.active,
      completionRate: v.total > 0 ? Math.round((v.completed / v.total) * 100) : 0,
    }))

    const allStayDays = raw
      .filter((r) => r.actual_departure_date && r.arrival_date)
      .map((r) => {
        const a = new Date(r.arrival_date).getTime()
        const d = new Date(r.actual_departure_date!).getTime()
        return Math.round((d - a) / (24 * 60 * 60 * 1000))
      })
    const totalCompleted = raw.filter((r) => r.status === 'discharged').length
    const totalActive = raw.filter((r) => r.status === 'active').length
    setTotalRow({
      programType: 'Total',
      total: raw.length,
      avgStay: allStayDays.length ? Math.round(allStayDays.reduce((s, d) => s + d, 0) / allStayDays.length) : 0,
      completed: totalCompleted,
      active: totalActive,
      completionRate: raw.length > 0 ? Math.round((totalCompleted / raw.length) * 100) : 0,
    })
    setRows(tableRows)
    setLoading(false)
  }, [filtersForApi])

  useEffect(() => {
    load()
  }, [load])

  const sortedRows = useMemo(() => {
    const r = [...rows]
    r.sort((a, b) => {
      const va = a[sortKey]
      const vb = b[sortKey]
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))
      return sortDir === 'asc' ? cmp : -cmp
    })
    return r
  }, [rows, sortKey, sortDir])

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  return (
    <ChartContainer title="How clients did" subtitle="By program type" loading={loading} error={!!error} onRetry={load}>
      {!loading && !error && rows.length === 0 && !totalRow && (
        <ResearchEmptyState title="No data" description="No clients match the selected filters." />
      )}
      {!loading && !error && (rows.length > 0 || totalRow) && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-3 pr-4 text-left font-medium text-gray-500">Program</th>
                <th className="pb-3 pr-4 text-right font-medium text-gray-500">
                  <button type="button" onClick={() => toggleSort('total')} className="hover:text-gray-900">
                    Total
                  </button>
                </th>
                <th className="pb-3 pr-4 text-right font-medium text-gray-500">
                  <button type="button" onClick={() => toggleSort('avgStay')} className="hover:text-gray-900">
                    Avg Stay
                  </button>
                </th>
                <th className="pb-3 pr-4 text-right font-medium text-gray-500">Completed</th>
                <th className="pb-3 pr-4 text-right font-medium text-gray-500">Active</th>
                <th className="pb-3 text-right font-medium text-gray-500">
                  <button type="button" onClick={() => toggleSort('completionRate')} className="hover:text-gray-900">
                    % finished
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={row.programType} className="border-b border-gray-100">
                  <td className="py-2 pr-4">
                    {row.programType === 'Total' ? (
                      <span className="font-semibold text-gray-900">Total</span>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="border-transparent text-xs"
                        style={{
                          backgroundColor: `${PROGRAM_TYPE_COLORS[row.programType] ?? '#6b7280'}20`,
                          color: PROGRAM_TYPE_COLORS[row.programType] ?? '#9ca3af',
                        }}
                      >
                        {PROGRAM_TYPE_LABELS[row.programType as ProgramTypeKey] ?? row.programType}
                      </Badge>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-right text-gray-900">{row.total}</td>
                  <td className="py-2 pr-4 text-right text-gray-600">{row.avgStay} days</td>
                  <td className="py-2 pr-4 text-right text-gray-600">{row.completed}</td>
                  <td className="py-2 pr-4 text-right text-gray-600">{row.active}</td>
                  <td className="py-2 text-right">
                    <Badge
                      variant="secondary"
                      className={cn(
                        'border-transparent text-xs',
                        completionRateColor(row.completionRate) === 'emerald' && 'bg-emerald-500/20 text-emerald-600',
                        completionRateColor(row.completionRate) === 'amber' && 'bg-amber-500/20 text-amber-600',
                        completionRateColor(row.completionRate) === 'red' && 'bg-red-500/20 text-red-600'
                      )}
                    >
                      {row.completionRate}%
                    </Badge>
                  </td>
                </tr>
              ))}
              {totalRow && (
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td className="py-2 pr-4 font-semibold text-gray-900">{totalRow.programType}</td>
                  <td className="py-2 pr-4 text-right font-semibold text-gray-900">{totalRow.total}</td>
                  <td className="py-2 pr-4 text-right font-semibold text-gray-600">{totalRow.avgStay} days</td>
                  <td className="py-2 pr-4 text-right font-semibold text-gray-600">{totalRow.completed}</td>
                  <td className="py-2 pr-4 text-right font-semibold text-gray-600">{totalRow.active}</td>
                  <td className="py-2 text-right">
                    <Badge
                      variant="secondary"
                      className={cn(
                        'border-transparent text-xs',
                        completionRateColor(totalRow.completionRate) === 'emerald' && 'bg-emerald-500/20 text-emerald-600',
                        completionRateColor(totalRow.completionRate) === 'amber' && 'bg-amber-500/20 text-amber-600',
                        completionRateColor(totalRow.completionRate) === 'red' && 'bg-red-500/20 text-red-600'
                      )}
                    >
                      {totalRow.completionRate}%
                    </Badge>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </ChartContainer>
  )
}
