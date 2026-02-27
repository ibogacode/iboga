'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useResearchFilters } from './useResearchFilters'
import { getResearchParkinsonsCohort } from '@/actions/research.action'
import type { ParkinsonsCohortRow } from '@/actions/research.action'
import { mapPsychRating } from '@/lib/research/calculations'
import { MDS_UPDRS_PARTS, MOTOR_SCORE_BINS, PSYCH_REPORT_FIELDS } from '@/lib/research/constants'

const PSYCH_COLUMN_MAP: Record<string, keyof ParkinsonsCohortRow> = {
  overall_mental_health_rating: 'psych_overall_mental_health',
  depression_sadness_severity: 'psych_depression_severity',
  anxiety_nervousness_severity: 'psych_anxiety_severity',
  sleep_quality: 'psych_sleep_quality',
  emotional_numbness_frequency: 'psych_emotional_numbness',
  parkinsons_motor_symptoms_severity: 'psych_motor_symptoms_severity',
  non_motor_symptoms_severity: 'psych_non_motor_symptoms_severity',
  treatment_outcome_hope: 'psych_treatment_outcome_hope',
}

export function useParkinsonsData() {
  const { filtersForApi } = useResearchFilters()
  const [cohort, setCohort] = useState<ParkinsonsCohortRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    setIsLoading(true)
    const filters = { ...filtersForApi, dateFrom: filtersForApi.dateFrom ?? undefined, dateTo: filtersForApi.dateTo ?? undefined }
    const res = await getResearchParkinsonsCohort({ filters })
    if (res?.data?.success && res.data.data) setCohort(res.data.data as ParkinsonsCohortRow[])
    else setError(res?.data?.error ?? 'Failed to load')
    setIsLoading(false)
  }, [filtersForApi])

  useEffect(() => {
    load()
  }, [load])

  const kpis = useMemo(() => {
    const n = cohort.length
    if (n === 0)
      return {
        totalPatients: 0,
        avgMdsUpdrsTotal: 0,
        avgFrailty: 0,
        highRiskCount: 0,
        highRiskPct: 0,
      }
    const withMds = cohort.filter((r) => r.mds_updrs_total_score != null)
    const avgMds = withMds.length ? withMds.reduce((a, r) => a + (r.mds_updrs_total_score ?? 0), 0) / withMds.length : 0
    const withFrailty = cohort.filter((r) => r.mds_pd_frailty_total_score != null)
    const avgFrailty = withFrailty.length ? withFrailty.reduce((a, r) => a + (r.mds_pd_frailty_total_score ?? 0), 0) / withFrailty.length : 0
    const highRisk = cohort.filter((r) => (r.risk_classification ?? '').toLowerCase() === 'high').length
    return {
      totalPatients: n,
      avgMdsUpdrsTotal: Math.round(avgMds * 10) / 10,
      avgFrailty: Math.round(avgFrailty * 10) / 10,
      highRiskCount: highRisk,
      highRiskPct: n > 0 ? Math.round((highRisk / n) * 100) : 0,
    }
  }, [cohort])

  const radarData = useMemo(() => {
    return MDS_UPDRS_PARTS.map((part) => {
      const key = part.key as keyof ParkinsonsCohortRow
      const vals = cohort.map((r) => r[key]).filter((v): v is number => typeof v === 'number')
      const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
      return { subject: part.label.replace(/\n/g, ' '), value: part.max > 0 ? Math.round((avg / part.max) * 100) : 0, fullMark: 100 }
    })
  }, [cohort])

  const motorHistogram = useMemo(() => {
    const partIII = cohort.map((r) => r.part_iii_total_score).filter((v): v is number => typeof v === 'number')
    return MOTOR_SCORE_BINS.map((bin) => ({
      label: bin.label,
      count: partIII.filter((s) => s >= bin.min && s < bin.max).length,
    }))
  }, [cohort])

  const hoehnYahrCounts = useMemo(() => {
    const map = new Map<string, number>()
    cohort.forEach((r) => {
      const stage = r.hoehn_yahr_stage ?? 'Unknown'
      map.set(stage, (map.get(stage) ?? 0) + 1)
    })
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => a.value - b.value)
  }, [cohort])

  const schwabEnglandBins = useMemo(() => {
    const bins = [
      { label: '0–20', min: 0, max: 20 },
      { label: '21–40', min: 21, max: 40 },
      { label: '41–60', min: 41, max: 60 },
      { label: '61–80', min: 61, max: 80 },
      { label: '81–100', min: 81, max: 100 },
    ]
    const scores = cohort.map((r) => r.schwab_england_total_score).filter((v): v is number => typeof v === 'number')
    return bins.map((b) => ({ label: b.label, count: scores.filter((s) => s >= b.min && s <= b.max).length }))
  }, [cohort])

  const psychBaseline = useMemo(() => {
    return PSYCH_REPORT_FIELDS.map((field) => {
      const col = PSYCH_COLUMN_MAP[field.key]
      if (!col) return { label: field.label, avg: 3 }
      const vals = cohort.map((r) => mapPsychRating(String(r[col]))).filter((v): v is number => v != null)
      const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 3
      return { label: field.label, avg: Math.round(avg * 10) / 10, higherIsBetter: field.higherIsBetter }
    })
  }, [cohort])

  const withMdsCount = useMemo(() => cohort.filter((r) => r.mds_updrs_total_score != null).length, [cohort])

  return {
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
    refetch: load,
  }
}
