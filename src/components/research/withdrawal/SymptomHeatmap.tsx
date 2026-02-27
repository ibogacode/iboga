'use client'

import { useMemo, Fragment, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChartContainer } from '../shared/ChartContainer'
import { ResearchEmptyState } from '../shared/EmptyState'
import {
  SOWS_SYMPTOM_LABELS,
  OOWS_SYMPTOM_LABELS,
  HEATMAP_COLOR_SCALE,
  OOWS_HEATMAP_COLOR_SCALE,
} from '@/lib/research/constants'
import type { AssessmentType } from '@/hooks/research/useWithdrawalData'
import { cn } from '@/lib/utils'
import { getResearchWithdrawalPatientOptions, getResearchPatientSymptomHeatmap } from '@/actions/research.action'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface HeatmapRow {
  day_of_stay: number
  symptom_index: number
  avg_value: number
  patient_count: number
}

interface SymptomHeatmapProps {
  data: HeatmapRow[]
  assessmentType: AssessmentType
  loading: boolean
  error: boolean
  onRetry: () => void
  onAssessmentChange: (type: AssessmentType) => void
}

interface PatientOption {
  management_id: string
  patient_id: string | null
  first_name: string
  last_name: string
  arrival_date: string
}

function getColorForValue(value: number, isOOWS: boolean, hasData: boolean): string {
  if (!hasData) return 'bg-gray-200'
  const scale = isOOWS ? OOWS_HEATMAP_COLOR_SCALE : HEATMAP_COLOR_SCALE
  for (const s of scale) {
    if (value <= s.max) return s.bg
  }
  return scale[scale.length - 1].bg
}

function getSeverityLabel(value: number, isOOWS: boolean): string {
  const scale = isOOWS ? OOWS_HEATMAP_COLOR_SCALE : HEATMAP_COLOR_SCALE
  for (const s of scale) {
    if (value <= s.max) return s.label
  }
  return scale[scale.length - 1].label
}

function anonymize(managementId: string, firstName: string, lastName: string): string {
  const id = 'P-' + managementId.replace(/-/g, '').slice(-4).toUpperCase()
  if (firstName || lastName) return `${id} (${[firstName, lastName].filter(Boolean).join(' ').trim()})`
  return id
}

export function SymptomHeatmap({
  data,
  assessmentType,
  loading,
  error,
  onRetry,
  onAssessmentChange,
}: SymptomHeatmapProps) {
  const router = useRouter()
  const isSOWS = assessmentType === 'sows'
  const symptomLabels = isSOWS ? SOWS_SYMPTOM_LABELS : OOWS_SYMPTOM_LABELS
  const maxSymptom = isSOWS ? 16 : 13
  const colorScale = isSOWS ? HEATMAP_COLOR_SCALE : OOWS_HEATMAP_COLOR_SCALE

  const [viewMode, setViewMode] = useState<'cohort' | 'patient'>('cohort')
  const [patientOptions, setPatientOptions] = useState<PatientOption[]>([])
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null)
  const [patientHeatmap, setPatientHeatmap] = useState<HeatmapRow[]>([])
  const [patientLoading, setPatientLoading] = useState(false)
  const [optionsLoading, setOptionsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setOptionsLoading(true)
    getResearchWithdrawalPatientOptions({})
      .then((res) => {
        if (!cancelled && res?.data?.success && res.data.data)
          setPatientOptions(res.data.data as PatientOption[])
      })
      .finally(() => { if (!cancelled) setOptionsLoading(false) })
    return () => { cancelled = true }
  }, [])

  const loadPatientHeatmap = useCallback((managementId: string) => {
    setPatientLoading(true)
    setPatientHeatmap([])
    getResearchPatientSymptomHeatmap({ managementId, assessmentType })
      .then((res) => {
        if (res?.data?.success && res.data.data) setPatientHeatmap(res.data.data as HeatmapRow[])
      })
      .finally(() => setPatientLoading(false))
  }, [assessmentType])

  useEffect(() => {
    if (viewMode === 'patient' && selectedPatient) loadPatientHeatmap(selectedPatient.management_id)
    else setPatientHeatmap([])
  }, [viewMode, selectedPatient, assessmentType, loadPatientHeatmap])

  const displayData = viewMode === 'cohort' ? data : patientHeatmap
  const displayLoading = viewMode === 'cohort' ? loading : (loading || patientLoading)
  const isSinglePatient = viewMode === 'patient' && selectedPatient

  const { grid, displayDays, displayLabels } = useMemo(() => {
    const filtered = displayData.filter((r) => r.day_of_stay >= 1)
    const daySet = new Set<number>()
    filtered.forEach((r) => daySet.add(r.day_of_stay))
    const sortedDays = Array.from(daySet).sort((a, b) => a - b)
    const startDay = sortedDays[0]
    const endDay = sortedDays[sortedDays.length - 1]
    const days = startDay !== undefined && endDay !== undefined
      ? (startDay === endDay ? [startDay] : [startDay, endDay])
      : []
    const displayLabels = startDay !== undefined && endDay !== undefined
      ? (startDay === endDay ? ['First day'] : ['First day', 'Last day'])
      : []
    const map = new Map<string, { avg_value: number; patient_count: number }>()
    filtered.forEach((r) => {
      const key = `${r.symptom_index}-${r.day_of_stay}`
      map.set(key, { avg_value: r.avg_value, patient_count: r.patient_count })
    })
    const grid: { symptomIndex: number; label: string; cells: { day: number; value: number; patients: number }[] }[] = []
    for (let s = 1; s <= maxSymptom; s++) {
      const cells = days.map((day) => {
        const v = map.get(`${s}-${day}`)
        return { day, value: v?.avg_value ?? 0, patients: v?.patient_count ?? 0 }
      })
      grid.push({ symptomIndex: s, label: symptomLabels[s] ?? `Symptom ${s}`, cells })
    }
    return { grid, displayDays: days, displayLabels }
  }, [displayData, maxSymptom, symptomLabels])

  const emptyMessage = viewMode === 'cohort'
    ? 'No withdrawal check-ins in this period.'
    : selectedPatient
      ? 'No symptom data for this client.'
      : 'Select a client to see their symptom heatmap.'

  return (
    <ChartContainer
      title={isSOWS ? 'Which symptoms, which days — Self-report' : 'Which symptoms, which days — Staff-observed'}
      subtitle="First day vs last day of stay only. Dark (None) = no or minimal symptoms; light gray = no data for that cell."
      loading={displayLoading}
      error={error}
      onRetry={onRetry}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('cohort')}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                viewMode === 'cohort' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Cohort average
            </button>
            <button
              type="button"
              onClick={() => setViewMode('patient')}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                viewMode === 'patient' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              )}
            >
              One client
            </button>
          </div>
          {viewMode === 'patient' && (
            <Select
              value={selectedPatient?.management_id ?? ''}
              onValueChange={(id) => setSelectedPatient(patientOptions.find((p) => p.management_id === id) ?? null)}
              disabled={optionsLoading}
            >
              <SelectTrigger className="w-[220px] border-gray-200 bg-white text-sm">
                <SelectValue placeholder="Select client…" />
              </SelectTrigger>
              <SelectContent>
                {patientOptions.map((p) => (
                  <SelectItem key={p.management_id} value={p.management_id}>
                    {anonymize(p.management_id, p.first_name, p.last_name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onAssessmentChange('sows')}
              className={cn(
                'rounded-md px-2.5 py-1.5 text-sm font-medium',
                isSOWS ? 'bg-emerald-600 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              )}
            >
              Self-report
            </button>
            <button
              type="button"
              onClick={() => onAssessmentChange('oows')}
              className={cn(
                'rounded-md px-2.5 py-1.5 text-sm font-medium',
                !isSOWS ? 'bg-emerald-600 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              )}
            >
              Staff-observed
            </button>
          </div>
        </div>
      }
    >
      {!displayLoading && !error && (grid.length === 0 || displayLabels.length === 0) && (
        <ResearchEmptyState title="No data yet" description={emptyMessage} />
      )}
      {!displayLoading && !error && grid.length > 0 && displayLabels.length > 0 && (
        <>
          {isSinglePatient && selectedPatient.patient_id && (
            <p className="mb-3 text-sm text-gray-600">
              Showing symptom intensity for{' '}
              <button
                type="button"
                onClick={() => router.push(`/patient-pipeline/patient-profile/${selectedPatient.patient_id}`)}
                className="font-medium text-emerald-600 underline hover:text-emerald-700"
              >
                {anonymize(selectedPatient.management_id, selectedPatient.first_name, selectedPatient.last_name)}
              </button>
              {' '}— click to open profile.
            </p>
          )}
          <div className="overflow-x-auto rounded-lg border border-gray-100 bg-gray-50/50">
            <div
              className="inline-grid min-w-full gap-[2px] p-3"
              style={{ gridTemplateColumns: `minmax(140px, 180px) repeat(${displayDays.length}, minmax(44px, 56px))` }}
            >
              <div className="flex items-center justify-end rounded bg-white/80 py-2 pr-2 text-right text-xs font-medium text-gray-500" />
              {displayLabels.map((label, i) => (
                <div key={label + (displayDays[i] ?? 0)} className="flex items-center justify-center rounded bg-white/80 py-2 text-xs font-semibold text-gray-700">
                  {label}
                </div>
              ))}
              {grid.map((row) => (
                <Fragment key={row.symptomIndex}>
                  <div className="flex items-center justify-end rounded bg-white/80 py-1.5 pr-2 text-right text-xs text-gray-700">
                    {row.label}
                  </div>
                  {row.cells.map((cell, cellIdx) => {
                    const hasData = cell.patients > 0
                    const isNoData = !hasData
                    return (
                      <div
                        key={`${row.symptomIndex}-${cell.day}`}
                        className={cn(
                          'flex h-9 min-h-[2rem] min-w-[44px] shrink-0 items-center justify-center rounded text-[10px] font-medium drop-shadow-sm transition-transform hover:scale-105',
                          getColorForValue(cell.value, !isSOWS, hasData),
                          isNoData ? 'text-gray-500' : 'text-white'
                        )}
                        title={
                          isNoData
                            ? `${displayLabels[cellIdx] ?? 'Day'} (day ${cell.day}) — ${row.label}: No data (no assessments for this symptom on this day)`
                            : `${displayLabels[cellIdx] ?? 'Day'} (day ${cell.day}) — ${row.label}: ${getSeverityLabel(cell.value, !isSOWS)} (${cell.value.toFixed(1)})${cell.patients > 1 ? ` · ${cell.patients} clients` : ''}`
                        }
                      >
                        {isNoData ? '—' : cell.value > 0 ? cell.value.toFixed(1) : '0'}
                      </div>
                    )
                  })}
                </Fragment>
              ))}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="text-xs font-medium text-gray-500">Intensity</span>
            <span className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="h-4 w-4 rounded shadow-sm bg-gray-200" />
              No data
            </span>
            {colorScale.map((s) => (
              <span key={s.label} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className={cn('h-4 w-4 rounded shadow-sm', s.bg)} />
                {s.label === 'None' ? 'No / minimal symptoms' : s.label}
              </span>
            ))}
          </div>
        </>
      )}
    </ChartContainer>
  )
}
