'use client'

import { useEffect, useState, useCallback } from 'react'
import { useResearchFilters } from './useResearchFilters'
import {
  getResearchOperationalFunnel,
  getResearchCapacityHeatmap,
  getResearchFormCompletionRates,
  getResearchDailySubmissions,
  getResearchOperationalKpis,
} from '@/actions/research.action'

export interface OperationalFunnel {
  intakeFormSubmitted: number
  onboardingCreated: number
  paymentReceived: number
  medicalClearance: number
  treatmentDateAssigned: number
  movedToManagement: number
}

export function useOperationalData(selectedYear: number | null) {
  const { filtersForApi } = useResearchFilters()
  const [funnel, setFunnel] = useState<OperationalFunnel | null>(null)
  const [capacity, setCapacity] = useState<{ treatment_date: string; slots_used: number; capacity_max: number; utilization_pct: number }[]>([])
  const [formRates, setFormRates] = useState<{ form_name: string; total_onboarding: number; completed: number; completion_rate: number }[]>([])
  const [dailySubs, setDailySubs] = useState<{
    submission_date: string
    medical_updates: number
    psychological_updates: number
    sows_assessments: number
    oows_assessments: number
    total: number
  }[]>([])
  const [kpis, setKpis] = useState<{ avgOnboardingDays: number; onboardingTotal: number; skipRate: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const filters = {
      ...filtersForApi,
      dateFrom: filtersForApi.dateFrom ?? undefined,
      dateTo: filtersForApi.dateTo ?? undefined,
    }
    const year = selectedYear ?? new Date().getFullYear()

    const [funnelRes, capacityRes, formRes, dailyRes, kpisRes] = await Promise.all([
      getResearchOperationalFunnel({ filters }),
      getResearchCapacityHeatmap({ p_year: year }),
      getResearchFormCompletionRates({ filters }),
      getResearchDailySubmissions({ filters }),
      getResearchOperationalKpis({ filters }),
    ])

    const err =
      !funnelRes?.data?.success && funnelRes?.data?.error
        ? funnelRes.data.error
        : !capacityRes?.data?.success && capacityRes?.data?.error
          ? capacityRes.data.error
          : null

    setFunnel(funnelRes?.data?.success ? (funnelRes.data.data as unknown as OperationalFunnel) : null)
    setCapacity(capacityRes?.data?.success ? (capacityRes.data.data ?? []) : [])
    setFormRates(formRes?.data?.success ? (formRes.data.data ?? []) : [])
    setDailySubs(dailyRes?.data?.success ? (dailyRes.data.data ?? []) : [])
    setKpis(kpisRes?.data?.success ? kpisRes.data.data ?? null : null)
    setError(err ?? null)
    setIsLoading(false)
  }, [filtersForApi, selectedYear])

  useEffect(() => {
    load()
  }, [load])

  return { funnel, capacity, formRates, dailySubs, kpis, isLoading, error, refetch: load }
}
