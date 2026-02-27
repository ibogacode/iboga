'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
import { getResearchWithdrawalPatientOptions, getResearchPatientWithdrawalScores } from '@/actions/research.action'
import { dayOfStay } from '@/lib/research/calculations'
import type { TrajectoryPoint } from '@/hooks/research/useWithdrawalData'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format, parseISO } from 'date-fns'

interface PatientOption {
  management_id: string
  patient_id: string | null
  first_name: string
  last_name: string
  arrival_date: string
}

interface PatientWithdrawalLookupProps {
  trajectorySows: TrajectoryPoint[]
  trajectoryOows: TrajectoryPoint[]
}

function anonymizeId(uuid: string | null | undefined): string {
  if (!uuid) return 'P-0000'
  return 'P-' + uuid.replace(/-/g, '').slice(-4).toUpperCase()
}

export function PatientWithdrawalLookup({ trajectorySows, trajectoryOows }: PatientWithdrawalLookupProps) {
  const router = useRouter()
  const [options, setOptions] = useState<PatientOption[]>([])
  const [selected, setSelected] = useState<PatientOption | null>(null)
  const [scores, setScores] = useState<{ sows: { form_date: string; total_score: number }[]; oows: { form_date: string; total_score: number }[] } | null>(null)
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [loadingScores, setLoadingScores] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoadingOptions(true)
    getResearchWithdrawalPatientOptions({})
      .then((res) => {
        if (!cancelled && res?.data?.success && res.data.data) setOptions(res.data.data as PatientOption[])
      })
      .finally(() => { if (!cancelled) setLoadingOptions(false) })
    return () => { cancelled = true }
  }, [])

  const loadScores = useCallback((managementId: string) => {
    setLoadingScores(true)
    setScores(null)
    getResearchPatientWithdrawalScores({ managementId })
      .then((res) => {
        if (res?.data?.success && res.data.data) setScores(res.data.data)
      })
      .finally(() => setLoadingScores(false))
  }, [])

  useEffect(() => {
    if (selected) loadScores(selected.management_id)
    else setScores(null)
  }, [selected, loadScores])

  const arrivalDate = selected?.arrival_date ?? ''
  const sowsWithDay = (scores?.sows ?? []).map((r) => ({
    day: dayOfStay(arrivalDate, r.form_date),
    name: `Day ${dayOfStay(arrivalDate, r.form_date)}`,
    score: r.total_score,
    date: r.form_date,
  }))
  const oowsWithDay = (scores?.oows ?? []).map((r) => ({
    day: dayOfStay(arrivalDate, r.form_date),
    name: `Day ${dayOfStay(arrivalDate, r.form_date)}`,
    score: r.total_score,
    date: r.form_date,
  }))

  const cohortSowsByDay = Object.fromEntries(trajectorySows.map((t) => [t.day_of_stay, t.avg_score]))
  const cohortOowsByDay = Object.fromEntries(trajectoryOows.map((t) => [t.day_of_stay, t.avg_score]))

  const sowsChartData = sowsWithDay.map((p) => ({
    ...p,
    cohortAvg: cohortSowsByDay[p.day] ?? null,
  }))
  const oowsChartData = oowsWithDay.map((p) => ({
    ...p,
    cohortAvg: cohortOowsByDay[p.day] ?? null,
  }))

  const detailRows: { date: string; day: number; sows: number; oows: number }[] = []
  const byDate = new Map<string, { day: number; sows?: number; oows?: number }>()
  sowsWithDay.forEach((r) => byDate.set(r.date, { ...byDate.get(r.date), day: r.day, sows: r.score }))
  oowsWithDay.forEach((r) => byDate.set(r.date, { ...byDate.get(r.date), day: r.day, oows: r.score }))
  byDate.forEach((v, date) => detailRows.push({ date, day: v.day, sows: v.sows ?? 0, oows: v.oows ?? 0 }))
  detailRows.sort((a, b) => a.day - b.day)

  return (
    <ChartContainer
      title="Compare one client to the average"
      subtitle="Pick a client to see their scores next to the group average"
      loading={loadingOptions}
      error={false}
    >
      {!loadingOptions && (
        <>
          <div className="mb-4">
            <label className="mb-2 block text-sm text-gray-500">Select patient</label>
            <Select
              value={selected?.management_id ?? ''}
              onValueChange={(id) => setSelected(options.find((o) => o.management_id === id) ?? null)}
            >
              <SelectTrigger className="max-w-md border-gray-200 bg-white text-gray-900">
                <SelectValue placeholder="Choose a client with withdrawal check-ins..." />
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o.management_id} value={o.management_id}>
                    {o.first_name} {o.last_name} — arrived {o.arrival_date ? format(parseISO(o.arrival_date), 'MMM d, yyyy') : o.arrival_date}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selected && (
            <>
              <p className="mb-4 text-sm text-gray-600">
                {selected.first_name} {selected.last_name} ({anonymizeId(selected.patient_id)}) —{' '}
                <button
                  type="button"
                  onClick={() => router.push(`/patient-pipeline/patient-profile/${selected.patient_id}`)}
                  className="text-purple-400 underline hover:text-purple-300"
                >
                  Open profile
                </button>
              </p>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <h4 className="mb-3 text-sm font-medium text-gray-900">Self-report by day</h4>
                  {loadingScores ? (
                    <div className="h-[260px] animate-pulse rounded bg-gray-100" />
                  ) : sowsChartData.length === 0 ? (
                    <ResearchEmptyState title="No self-report data" description="No self-report check-ins for this client." />
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={sowsChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                        <YAxis domain={[0, 64]} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
                          labelStyle={{ color: '#9ca3af' }}
                          formatter={(value, name, props) => [
                            `Score: ${value ?? 0}${(props as { payload?: { cohortAvg?: number } }).payload?.cohortAvg != null ? ` | Cohort avg: ${Number((props as { payload?: { cohortAvg?: number } }).payload!.cohortAvg).toFixed(1)}` : ''}`,
                            String(name),
                          ]}
                        />
                        <ReferenceLine y={10} stroke="#f59e0b" strokeDasharray="4 4" />
                        <ReferenceLine y={20} stroke="#f97316" strokeDasharray="4 4" />
                        <ReferenceLine y={36} stroke="#ef4444" strokeDasharray="4 4" />
                        <Line type="monotone" dataKey="cohortAvg" stroke="#6b7280" strokeDasharray="4 4" strokeWidth={2} dot={false} name="Cohort avg" />
                        <Line type="monotone" dataKey="score" stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7', r: 3 }} name="Patient" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <h4 className="mb-3 text-sm font-medium text-gray-900">Staff-observed by day</h4>
                  {loadingScores ? (
                    <div className="h-[260px] animate-pulse rounded bg-gray-100" />
                  ) : oowsChartData.length === 0 ? (
                    <ResearchEmptyState title="No staff-observed data" description="No staff-observed check-ins for this client." />
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={oowsChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                        <YAxis domain={[0, 13]} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
                          formatter={(value, _name, props) => [
                            `Score: ${value ?? 0}${(props as { payload?: { cohortAvg?: number } }).payload?.cohortAvg != null ? ` | Cohort avg: ${Number((props as { payload?: { cohortAvg?: number } }).payload!.cohortAvg).toFixed(1)}` : ''}`,
                            'Score',
                          ]}
                        />
                        <ReferenceLine y={3} stroke="#f59e0b" strokeDasharray="4 4" />
                        <ReferenceLine y={7} stroke="#f97316" strokeDasharray="4 4" />
                        <ReferenceLine y={10} stroke="#ef4444" strokeDasharray="4 4" />
                        <Line type="monotone" dataKey="cohortAvg" stroke="#6b7280" strokeDasharray="4 4" strokeWidth={2} dot={false} name="Cohort avg" />
                        <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} name="Patient" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {detailRows.length > 0 && (
                <div className="mt-6 overflow-x-auto">
                  <h4 className="mb-2 text-sm font-medium text-gray-900">Assessment detail</h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="pb-2 pr-4 text-left text-gray-500">Date</th>
                        <th className="pb-2 pr-4 text-right text-gray-500">Day</th>
                        <th className="pb-2 pr-4 text-right text-gray-500">Self-report</th>
                        <th className="pb-2 text-right text-gray-500">Observed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailRows.map((row) => (
                        <tr key={row.date} className="border-b border-gray-100">
                          <td className="py-1.5 pr-4 text-gray-600">{format(parseISO(row.date), 'MMM d, yyyy')}</td>
                          <td className="py-1.5 pr-4 text-right text-gray-600">{row.day}</td>
                          <td className="py-1.5 pr-4 text-right text-gray-600">{row.sows}</td>
                          <td className="py-1.5 text-right text-gray-600">{row.oows}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {!loadingOptions && options.length === 0 && (
            <ResearchEmptyState title="No clients with check-in data" description="No withdrawal check-ins found." />
          )}
        </>
      )}
    </ChartContainer>
  )
}
