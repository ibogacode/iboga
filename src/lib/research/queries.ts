/**
 * Research module: Supabase query helpers.
 * Used by server actions; RPCs can replace these when available.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface ResearchFilters {
  dateFrom: string | null
  dateTo: string | null
  programTypes: string[]
  statuses: string[]
}

export function buildPatientManagementQuery(
  supabase: SupabaseClient,
  filters: ResearchFilters,
  options?: { countOnly?: boolean; select?: string }
) {
  const select = options?.select ?? '*'
  const selectOptions = options?.countOnly ? { count: 'exact' as const, head: true } : undefined
  let q = supabase
    .from('patient_management')
    .select(select, selectOptions)

  if (filters.dateFrom) q = q.gte('arrival_date', filters.dateFrom)
  if (filters.dateTo) q = q.lte('arrival_date', filters.dateTo)
  if (filters.programTypes?.length && !filters.programTypes.includes('all'))
    q = q.in('program_type', filters.programTypes)
  if (filters.statuses?.length && !filters.statuses.includes('all'))
    q = q.in('status', filters.statuses)

  return q
}

export function getDateRangeFromPreset(preset: string): { from: string; to: string } | null {
  const to = new Date()
  const toStr = to.toISOString().split('T')[0]
  if (preset === 'all') return null
  const days = parseInt(preset, 10)
  if (Number.isNaN(days)) return null
  const from = new Date(to)
  from.setDate(from.getDate() - days)
  return { from: from.toISOString().split('T')[0], to: toStr }
}
