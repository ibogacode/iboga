'use client'

import { useEffect, useState, useCallback } from 'react'
import { useResearchFilters } from './useResearchFilters'
import {
  getResearchWithdrawalKpis,
  getResearchWithdrawalTrajectory,
  getResearchSymptomHeatmap,
  getResearchWithdrawalBySubstance,
} from '@/actions/research.action'
import type { WithdrawalKpis } from '@/actions/research.action'

export type AssessmentType = 'sows' | 'oows'

export interface TrajectoryPoint {
  day_of_stay: number
  avg_score: number
  patient_count: number
}

export interface WithdrawalDataState {
  kpis: WithdrawalKpis | null
  trajectory: TrajectoryPoint[]
  trajectorySows: TrajectoryPoint[]
  trajectoryOows: TrajectoryPoint[]
  heatmapData: { day_of_stay: number; symptom_index: number; avg_value: number; patient_count: number }[]
  bySubstance: {
    substance_category: string
    patient_count: number
    avg_peak_sows: number
    avg_peak_oows: number
    severe_cases_count: number
    severe_cases_pct: number
  }[]
  isLoading: boolean
  error: string | null
  activeAssessment: AssessmentType
}

export function useWithdrawalData(activeAssessment: AssessmentType) {
  const { filtersForApi } = useResearchFilters()
  const [state, setState] = useState<WithdrawalDataState>({
    kpis: null,
    trajectory: [],
    trajectorySows: [],
    trajectoryOows: [],
    heatmapData: [],
    bySubstance: [],
    isLoading: true,
    error: null,
    activeAssessment,
  })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }))
    const filters = {
      ...filtersForApi,
      dateFrom: filtersForApi.dateFrom ?? undefined,
      dateTo: filtersForApi.dateTo ?? undefined,
    }

    const [kpisRes, trajectorySowsRes, trajectoryOowsRes, heatmapRes, substanceRes] = await Promise.all([
      getResearchWithdrawalKpis({ filters }),
      getResearchWithdrawalTrajectory({ filters, assessmentType: 'sows' }),
      getResearchWithdrawalTrajectory({ filters, assessmentType: 'oows' }),
      getResearchSymptomHeatmap({ filters, assessmentType: activeAssessment }),
      getResearchWithdrawalBySubstance({ filters }),
    ])

    const trajectorySows = trajectorySowsRes?.data?.success ? (trajectorySowsRes.data.data ?? []) : []
    const trajectoryOows = trajectoryOowsRes?.data?.success ? (trajectoryOowsRes.data.data ?? []) : []
    const error =
      !kpisRes?.data?.success && kpisRes?.data?.error
        ? kpisRes.data.error
        : !heatmapRes?.data?.success && heatmapRes?.data?.error
          ? heatmapRes.data.error
          : null

    setState({
      kpis: kpisRes?.data?.success ? (kpisRes.data.data as WithdrawalKpis) : null,
      trajectory: activeAssessment === 'sows' ? trajectorySows : trajectoryOows,
      trajectorySows: trajectorySows as TrajectoryPoint[],
      trajectoryOows: trajectoryOows as TrajectoryPoint[],
      heatmapData: heatmapRes?.data?.success ? (heatmapRes.data.data ?? []) : [],
      bySubstance: substanceRes?.data?.success ? (substanceRes.data.data ?? []) : [],
      isLoading: false,
      error: error ?? null,
      activeAssessment,
    })
  }, [filtersForApi, activeAssessment])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, refetch: load }
}
