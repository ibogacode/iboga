'use client'

import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { DATE_RANGE_PRESETS, PROGRAM_TYPES, PATIENT_STATUSES, TABS, type ResearchTab } from '@/lib/research/constants'
import { getDateRangeFromPreset } from '@/lib/research/queries'

const DEFAULT_TAB: ResearchTab = 'overview'
const DEFAULT_DATE_PRESET = '365'

export interface ResearchFilterState {
  tab: ResearchTab
  datePreset: string
  dateFrom: string | null
  dateTo: string | null
  programTypes: string[]
  statuses: string[]
}

function parseArrayParam(value: string | null): string[] {
  if (!value) return []
  return value.split(',').filter(Boolean)
}

export function useResearchFilters() {
  const searchParams = useSearchParams()

  const state = useMemo((): ResearchFilterState => {
    const tab = (searchParams.get('tab') ?? DEFAULT_TAB) as ResearchTab
    const validTab = TABS.some((t) => t.value === tab) ? tab : DEFAULT_TAB
    const datePreset = searchParams.get('datePreset') ?? DEFAULT_DATE_PRESET
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const programTypes = parseArrayParam(searchParams.get('programTypes'))
    const statuses = parseArrayParam(searchParams.get('statuses'))

    const range = dateFrom && dateTo ? null : getDateRangeFromPreset(datePreset)
    return {
      tab: validTab,
      datePreset,
      dateFrom: dateFrom ?? range?.from ?? null,
      dateTo: dateTo ?? range?.to ?? null,
      programTypes: programTypes.length ? programTypes : ['all'],
      statuses: statuses.length ? statuses : ['all'],
    }
  }, [searchParams])

  const setParams = useCallback(
    (updates: Partial<ResearchFilterState>) => {
      const params = new URLSearchParams(searchParams.toString())
      if (updates.tab !== undefined) params.set('tab', updates.tab)
      if (updates.datePreset !== undefined) params.set('datePreset', updates.datePreset)
      if (updates.dateFrom !== undefined) {
        if (updates.dateFrom) params.set('dateFrom', updates.dateFrom)
        else params.delete('dateFrom')
      }
      if (updates.dateTo !== undefined) {
        if (updates.dateTo) params.set('dateTo', updates.dateTo)
        else params.delete('dateTo')
      }
      if (updates.programTypes !== undefined) {
        if (updates.programTypes.length && !updates.programTypes.includes('all'))
          params.set('programTypes', updates.programTypes.join(','))
        else params.delete('programTypes')
      }
      if (updates.statuses !== undefined) {
        if (updates.statuses.length && !updates.statuses.includes('all'))
          params.set('statuses', updates.statuses.join(','))
        else params.delete('statuses')
      }
      return params.toString()
    },
    [searchParams]
  )

  const filtersForApi = useMemo(
    () => ({
      datePreset: state.datePreset,
      dateFrom: state.dateFrom,
      dateTo: state.dateTo,
      programTypes: state.programTypes,
      statuses: state.statuses,
    }),
    [state]
  )

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (state.datePreset !== DEFAULT_DATE_PRESET) n++
    if (state.programTypes.length && !state.programTypes.includes('all')) n++
    if (state.statuses.length && !state.statuses.includes('all')) n++
    return n
  }, [state])

  return {
    state,
    setParams,
    filtersForApi,
    activeFilterCount,
    datePresets: DATE_RANGE_PRESETS,
    programTypeOptions: PROGRAM_TYPES,
    statusOptions: PATIENT_STATUSES,
    tabs: TABS,
  }
}
