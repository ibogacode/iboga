'use server'

import { z } from 'zod'
import { authActionClient } from '@/lib/safe-action'
import { createClient } from '@/lib/supabase/server'
import { RESEARCH_ALLOWED_ROLES } from '@/lib/research/constants'
import { dayOfStay } from '@/lib/research/calculations'
import { getDateRangeFromPreset, buildPatientManagementQuery, type ResearchFilters } from '@/lib/research/queries'
import type { UserRole } from '@/types'

const researchFiltersSchema = z.object({
  datePreset: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  programTypes: z.array(z.string()).optional(),
  statuses: z.array(z.string()).optional(),
})

function toResearchFilters(parsed: z.infer<typeof researchFiltersSchema>): ResearchFilters {
  const preset = parsed.datePreset ?? '365'
  const range = getDateRangeFromPreset(preset)
  return {
    dateFrom: parsed.dateFrom ?? range?.from ?? null,
    dateTo: parsed.dateTo ?? range?.to ?? null,
    programTypes: parsed.programTypes ?? ['all'],
    statuses: parsed.statuses ?? ['all'],
  }
}

function ensureResearchAccess(role: UserRole): boolean {
  return (RESEARCH_ALLOWED_ROLES as readonly string[]).includes(role)
}

export const getResearchOverviewStats = authActionClient
  .schema(z.object({ filters: researchFiltersSchema.optional() }))
  .action(async ({ parsedInput, ctx }) => {
    const role = (ctx.user.role ?? 'patient') as UserRole
    if (!ensureResearchAccess(role)) return { success: false, error: 'Access denied' }

    const filters = toResearchFilters(parsedInput?.filters ?? {})
    const supabase = await createClient()

    const allQuery = buildPatientManagementQuery(supabase, filters, { countOnly: true })
    const activeQuery = buildPatientManagementQuery(supabase, { ...filters, statuses: ['active'] }, { countOnly: true })
    const dischargedQuery = buildPatientManagementQuery(supabase, { ...filters, statuses: ['discharged', 'transferred'] }, { countOnly: true })

    let stayQuery = supabase
      .from('patient_management')
      .select('id, arrival_date, actual_departure_date')
      .not('actual_departure_date', 'is', null)
    if (filters.dateFrom) stayQuery = stayQuery.gte('arrival_date', filters.dateFrom)
    if (filters.dateTo) stayQuery = stayQuery.lte('arrival_date', filters.dateTo)
    if (filters.programTypes?.length && !filters.programTypes.includes('all'))
      stayQuery = stayQuery.in('program_type', filters.programTypes)
    if (filters.statuses?.length && !filters.statuses.includes('all'))
      stayQuery = stayQuery.in('status', filters.statuses)

    let onboardingQuery = supabase.from('patient_onboarding').select('id, medical_clearance', { count: 'exact', head: true })
    if (filters.dateFrom) onboardingQuery = onboardingQuery.gte('created_at', filters.dateFrom)
    if (filters.dateTo) onboardingQuery = onboardingQuery.lte('created_at', filters.dateTo)

    const [allRes, activeRes, dischargedRes, stayRes, onboardingRes] = await Promise.all([
      allQuery,
      activeQuery,
      dischargedQuery,
      stayQuery,
      onboardingQuery,
    ])

    const totalPatients = allRes.count ?? 0
    const activePatients = activeRes.count ?? 0
    const dischargedCount = dischargedRes.count ?? 0
    const completionRate = totalPatients > 0 ? Math.round((dischargedCount / totalPatients) * 100) : 0

    let avgLengthOfStay = 0
    const stayRows = (stayRes.data ?? []) as { arrival_date: string; actual_departure_date: string }[]
    if (stayRows.length > 0) {
      const totalDays = stayRows.reduce((sum, r) => {
        const a = new Date(r.arrival_date).getTime()
        const d = new Date(r.actual_departure_date).getTime()
        return sum + Math.round((d - a) / (24 * 60 * 60 * 1000))
      }, 0)
      avgLengthOfStay = Math.round(totalDays / stayRows.length)
    }

    const onboardingTotal = onboardingRes.count ?? 0
    let medicalClearanceRate = 0
    if (onboardingTotal > 0) {
      let clearedQuery = supabase.from('patient_onboarding').select('*', { count: 'exact', head: true }).eq('medical_clearance', true)
      if (filters.dateFrom) clearedQuery = clearedQuery.gte('created_at', filters.dateFrom)
      if (filters.dateTo) clearedQuery = clearedQuery.lte('created_at', filters.dateTo)
      const { count: clearedCount } = await clearedQuery
      medicalClearanceRate = Math.round(((clearedCount ?? 0) / onboardingTotal) * 100)
    }

    return {
      success: true,
      data: {
        totalPatients,
        activePatients,
        avgLengthOfStay,
        completionRate,
        medicalClearanceRate,
      },
    }
  })

export const getResearchAdmissionsByMonth = authActionClient
  .schema(z.object({ filters: researchFiltersSchema.optional() }))
  .action(async ({ parsedInput, ctx }) => {
    const role = (ctx.user.role ?? 'patient') as UserRole
    if (!ensureResearchAccess(role)) return { success: false, error: 'Access denied' }

    const filters = toResearchFilters(parsedInput?.filters ?? {})
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('get_admissions_by_month', {
      date_from: filters.dateFrom,
      date_to: filters.dateTo,
      program_types: filters.programTypes?.includes('all') ? null : filters.programTypes,
    })

    if (error) {
      console.error('get_admissions_by_month error:', error)
      return { success: false, error: error.message }
    }
    return { success: true, data: (data ?? []) as AdmissionsByMonthRow[] }
  })

export interface AdmissionsByMonthRow {
  month: string
  month_date: string
  neurological: number
  mental_health: number
  addiction: number
  total: number
}

export const getResearchOutcomesRaw = authActionClient
  .schema(z.object({ filters: researchFiltersSchema.optional() }))
  .action(async ({ parsedInput, ctx }) => {
    const role = (ctx.user.role ?? 'patient') as UserRole
    if (!ensureResearchAccess(role)) return { success: false, error: 'Access denied' }

    const filters = toResearchFilters(parsedInput?.filters ?? {})
    const supabase = await createClient()
    let q = supabase
      .from('patient_management')
      .select('program_type, status, arrival_date, actual_departure_date')
    if (filters.dateFrom) q = q.gte('arrival_date', filters.dateFrom)
    if (filters.dateTo) q = q.lte('arrival_date', filters.dateTo)
    if (filters.programTypes?.length && !filters.programTypes.includes('all'))
      q = q.in('program_type', filters.programTypes)
    if (filters.statuses?.length && !filters.statuses.includes('all'))
      q = q.in('status', filters.statuses)

    const { data, error } = await q
    if (error) return { success: false, error: error.message }
    return { success: true, data: (data ?? []) as OutcomesRawRow[] }
  })

export interface OutcomesRawRow {
  program_type: string
  status: string
  arrival_date: string
  actual_departure_date: string | null
}

export const getResearchRecentActivity = authActionClient
  .schema(z.object({ filters: researchFiltersSchema.optional() }))
  .action(async ({ ctx }) => {
    const role = (ctx.user.role ?? 'patient') as UserRole
    if (!ensureResearchAccess(role)) return { success: false, error: 'Access denied' }

    const supabase = await createClient()

    const [admittedRes, dischargedRes, medicalRes, onboardingRes] = await Promise.all([
      supabase
        .from('patient_management')
        .select('id, patient_id, first_name, last_name, program_type, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('patient_management')
        .select('id, patient_id, first_name, last_name, discharged_at')
        .in('status', ['discharged', 'transferred'])
        .not('discharged_at', 'is', null)
        .order('discharged_at', { ascending: false })
        .limit(5),
      supabase
        .from('patient_management_daily_medical_updates')
        .select('id, management_id, created_at, patient_management(patient_id, first_name, last_name)')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('patient_onboarding')
        .select('id, patient_id, first_name, last_name, completed_at')
        .eq('status', 'completed')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(5),
    ])

    type ActivityItem = {
      type: 'admitted' | 'discharged' | 'medical_update' | 'onboarding_completed'
      patientId: string | null
      label: string
      at: string
      programType?: string
    }
    const items: ActivityItem[] = []

    ;(admittedRes.data ?? []).forEach((r: { patient_id: string | null; first_name: string; last_name: string; program_type: string; created_at: string }) => {
      items.push({
        type: 'admitted',
        patientId: r.patient_id,
        label: `admitted to ${(r.program_type ?? '').replace('_', ' ')} program`,
        at: r.created_at,
        programType: r.program_type,
      })
    })
    ;(dischargedRes.data ?? []).forEach((r: { patient_id: string | null; discharged_at: string }) => {
      items.push({
        type: 'discharged',
        patientId: r.patient_id,
        label: 'completed program',
        at: r.discharged_at,
      })
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(medicalRes.data ?? []).forEach((r: any) => {
      const pm = Array.isArray(r.patient_management) ? r.patient_management[0] : r.patient_management
      items.push({
        type: 'medical_update',
        patientId: pm?.patient_id ?? null,
        label: 'daily medical update submitted',
        at: r.created_at,
      })
    })
    ;(onboardingRes.data ?? []).forEach((r: { patient_id: string | null; completed_at: string }) => {
      items.push({
        type: 'onboarding_completed',
        patientId: r.patient_id,
        label: 'onboarding completed',
        at: r.completed_at,
      })
    })

    items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    const recent = items.slice(0, 20)
    return { success: true, data: recent }
  })

// Withdrawal tab RPCs
export const getResearchWithdrawalKpis = authActionClient
  .schema(z.object({ filters: researchFiltersSchema.optional() }))
  .action(async ({ parsedInput, ctx }) => {
    const role = (ctx.user.role ?? 'patient') as UserRole
    if (!ensureResearchAccess(role)) return { success: false, error: 'Access denied' }
    const filters = toResearchFilters(parsedInput?.filters ?? {})
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_withdrawal_kpis', {
      date_from: filters.dateFrom,
      date_to: filters.dateTo,
      program_types: filters.programTypes?.includes('all') ? null : filters.programTypes,
    })
    if (error) return { success: false, error: error.message }
    return { success: true, data: data as WithdrawalKpis }
  })

export interface WithdrawalKpis {
  avgPeakSows: number
  avgPeakOows: number
  severePct: number
  avgDaysToResolution: number
}

export const getResearchWithdrawalTrajectory = authActionClient
  .schema(
    z.object({
      filters: researchFiltersSchema.optional(),
      assessmentType: z.enum(['sows', 'oows']).optional(),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    const role = (ctx.user.role ?? 'patient') as UserRole
    if (!ensureResearchAccess(role)) return { success: false, error: 'Access denied' }
    const filters = toResearchFilters(parsedInput?.filters ?? {})
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_withdrawal_trajectory', {
      date_from: filters.dateFrom,
      date_to: filters.dateTo,
      program_types: filters.programTypes?.includes('all') ? null : filters.programTypes,
      assessment_type: parsedInput?.assessmentType ?? 'sows',
    })
    if (error) return { success: false, error: error.message }
    return { success: true, data: (data ?? []) as { day_of_stay: number; avg_score: number; patient_count: number }[] }
  })

export const getResearchSymptomHeatmap = authActionClient
  .schema(
    z.object({
      filters: researchFiltersSchema.optional(),
      assessmentType: z.enum(['sows', 'oows']).optional(),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    const role = (ctx.user.role ?? 'patient') as UserRole
    if (!ensureResearchAccess(role)) return { success: false, error: 'Access denied' }
    const filters = toResearchFilters(parsedInput?.filters ?? {})
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_symptom_heatmap_data', {
      date_from: filters.dateFrom,
      date_to: filters.dateTo,
      assessment_type: parsedInput?.assessmentType ?? 'sows',
    })
    if (error) return { success: false, error: error.message }
    return {
      success: true,
      data: (data ?? []) as { day_of_stay: number; symptom_index: number; avg_value: number; patient_count: number }[],
    }
  })

export const getResearchWithdrawalBySubstance = authActionClient
  .schema(z.object({ filters: researchFiltersSchema.optional() }))
  .action(async ({ parsedInput, ctx }) => {
    const role = (ctx.user.role ?? 'patient') as UserRole
    if (!ensureResearchAccess(role)) return { success: false, error: 'Access denied' }
    const filters = toResearchFilters(parsedInput?.filters ?? {})
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_withdrawal_by_substance', {
      date_from: filters.dateFrom,
      date_to: filters.dateTo,
    })
    if (error) return { success: false, error: error.message }
    return {
      success: true,
      data: (data ?? []) as {
        substance_category: string
        patient_count: number
        avg_peak_sows: number
        avg_peak_oows: number
        severe_cases_count: number
        severe_cases_pct: number
      }[],
    }
  })

export const getResearchWithdrawalCompleteness = authActionClient
  .schema(z.object({ filters: researchFiltersSchema.optional() }))
  .action(async ({ parsedInput, ctx }) => {
    const role = (ctx.user.role ?? 'patient') as UserRole
    if (!ensureResearchAccess(role)) return { success: false, error: 'Access denied' }
    const filters = toResearchFilters(parsedInput?.filters ?? {})
    const supabase = await createClient()
    let totalQ = supabase.from('patient_management').select('id', { count: 'exact', head: true })
    if (filters.dateFrom) totalQ = totalQ.gte('arrival_date', filters.dateFrom)
    if (filters.dateTo) totalQ = totalQ.lte('arrival_date', filters.dateTo)
    if (filters.programTypes?.length && !filters.programTypes.includes('all'))
      totalQ = totalQ.in('program_type', filters.programTypes)
    const { count: total } = await totalQ
    const { data: sowsIds } = await supabase.from('patient_management_daily_sows').select('management_id')
    const { data: oowsIds } = await supabase.from('patient_management_daily_oows').select('management_id')
    const withData = new Set<string>()
    ;(sowsIds ?? []).forEach((r: { management_id: string }) => withData.add(r.management_id))
    ;(oowsIds ?? []).forEach((r: { management_id: string }) => withData.add(r.management_id))
    return { success: true, data: { total: total ?? 0, withAssessmentData: withData.size } }
  })

export const getResearchWithdrawalPatientOptions = authActionClient
  .schema(z.object({ filters: researchFiltersSchema.optional() }))
  .action(async ({ ctx }) => {
    const role = (ctx.user.role ?? 'patient') as UserRole
    if (!ensureResearchAccess(role)) return { success: false, error: 'Access denied' }
    const supabase = await createClient()
    const { data: sowsRows } = await supabase.from('patient_management_daily_sows').select('management_id')
    const { data: oowsRows } = await supabase.from('patient_management_daily_oows').select('management_id')
    const ids = new Set<string>()
    ;(sowsRows ?? []).forEach((r: { management_id: string }) => ids.add(r.management_id))
    ;(oowsRows ?? []).forEach((r: { management_id: string }) => ids.add(r.management_id))
    const idList = Array.from(ids)
    if (idList.length === 0) return { success: true, data: [] }
    const { data: pmRows } = await supabase
      .from('patient_management')
      .select('id, patient_id, first_name, last_name, arrival_date')
      .in('id', idList)
    const list = (pmRows ?? []).map((r: { id: string; patient_id: string | null; first_name: string; last_name: string; arrival_date: string }) => ({
      management_id: r.id,
      patient_id: r.patient_id,
      first_name: r.first_name ?? '',
      last_name: r.last_name ?? '',
      arrival_date: r.arrival_date ?? '',
    }))
    list.sort((a, b) => (b.arrival_date || '').localeCompare(a.arrival_date || ''))
    return { success: true, data: list }
  })

export const getResearchPatientWithdrawalScores = authActionClient
  .schema(z.object({ managementId: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const role = (ctx.user.role ?? 'patient') as UserRole
    if (!ensureResearchAccess(role)) return { success: false, error: 'Access denied' }
    const supabase = await createClient()
    const [sowsRes, oowsRes] = await Promise.all([
      supabase
        .from('patient_management_daily_sows')
        .select('form_date, total_score')
        .eq('management_id', parsedInput.managementId)
        .order('form_date', { ascending: true }),
      supabase
        .from('patient_management_daily_oows')
        .select('form_date, total_score')
        .eq('management_id', parsedInput.managementId)
        .order('form_date', { ascending: true }),
    ])
    const sows = (sowsRes.data ?? []) as { form_date: string; total_score: number }[]
    const oows = (oowsRes.data ?? []) as { form_date: string; total_score: number }[]
    return {
      success: true,
      data: {
        sows: sows.map((r) => ({ form_date: r.form_date, total_score: r.total_score })),
        oows: oows.map((r) => ({ form_date: r.form_date, total_score: r.total_score })),
      },
    }
  })

const SOWS_HEATMAP_COLUMNS = [
  'symptom_1_anxious', 'symptom_2_yawning', 'symptom_3_perspiring', 'symptom_4_eyes_tearing',
  'symptom_5_nose_running', 'symptom_6_goosebumps', 'symptom_7_shaking', 'symptom_8_hot_flushes',
  'symptom_9_cold_flushes', 'symptom_10_bones_muscles_ache', 'symptom_11_restless', 'symptom_12_nauseous',
  'symptom_13_vomiting', 'symptom_14_muscles_twitch', 'symptom_15_stomach_cramps', 'symptom_16_feel_like_using_now',
] as const

const OOWS_HEATMAP_COLUMNS = [
  'symptom_1_yawning', 'symptom_2_rhinorrhoea', 'symptom_3_piloerection', 'symptom_4_perspiration',
  'symptom_5_lacrimation', 'symptom_6_tremor', 'symptom_7_mydriasis', 'symptom_8_hot_cold_flushes',
  'symptom_9_restlessness', 'symptom_10_vomiting', 'symptom_11_muscle_twitches', 'symptom_12_abdominal_cramps',
  'symptom_13_anxiety',
] as const

export const getResearchPatientSymptomHeatmap = authActionClient
  .schema(z.object({ managementId: z.string().uuid(), assessmentType: z.enum(['sows', 'oows']) }))
  .action(async ({ parsedInput, ctx }) => {
    const role = (ctx.user.role ?? 'patient') as UserRole
    if (!ensureResearchAccess(role)) return { success: false, error: 'Access denied' }
    const supabase = await createClient()

    const { data: pmRow } = await supabase
      .from('patient_management')
      .select('arrival_date')
      .eq('id', parsedInput.managementId)
      .single()
    const arrivalDate = (pmRow as { arrival_date?: string } | null)?.arrival_date ?? ''
    if (!arrivalDate) return { success: true, data: [] }

    const table = parsedInput.assessmentType === 'sows' ? 'patient_management_daily_sows' : 'patient_management_daily_oows'
    const columns = parsedInput.assessmentType === 'sows'
      ? (['form_date', ...SOWS_HEATMAP_COLUMNS] as const)
      : (['form_date', ...OOWS_HEATMAP_COLUMNS] as const)

    const { data: rows } = await supabase
      .from(table)
      .select(columns.join(','))
      .eq('management_id', parsedInput.managementId)
      .order('form_date', { ascending: true })

    const out: { day_of_stay: number; symptom_index: number; avg_value: number; patient_count: number }[] = []
    const colKeys = parsedInput.assessmentType === 'sows' ? SOWS_HEATMAP_COLUMNS : OOWS_HEATMAP_COLUMNS
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;((rows ?? []) as any[]).forEach((row: Record<string, unknown>) => {
      const formDate = String(row.form_date ?? '')
      const day = dayOfStay(arrivalDate, formDate)
      if (day < 1) return
      colKeys.forEach((key, i) => {
        const v = row[key]
        const num = typeof v === 'number' && !Number.isNaN(v) ? v : 0
        out.push({ day_of_stay: day, symptom_index: i + 1, avg_value: num, patient_count: 1 })
      })
    })
    return { success: true, data: out }
  })

// Operational tab — extra KPIs from onboarding (avg duration, skip rate)
export const getResearchOperationalKpis = authActionClient
  .schema(z.object({ filters: researchFiltersSchema.optional() }))
  .action(async ({ parsedInput, ctx }) => {
    const role = (ctx.user.role ?? 'patient') as UserRole
    if (!ensureResearchAccess(role)) return { success: false, error: 'Access denied' }
    const filters = toResearchFilters(parsedInput?.filters ?? {})
    const supabase = await createClient()
    let q = supabase.from('patient_onboarding').select('created_at, completed_at, medical_clearance, ekg_skipped, bloodwork_skipped', { count: 'exact' })
    if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom)
    if (filters.dateTo) q = q.lte('created_at', filters.dateTo)
    const { data: rows } = await q
    const list = (rows ?? []) as { created_at: string; completed_at: string | null; medical_clearance: boolean | null; ekg_skipped: boolean | null; bloodwork_skipped: boolean | null }[]
    let totalDuration = 0
    let completedCount = 0
    let skipCount = 0
    list.forEach((r) => {
      if (r.completed_at) {
        completedCount++
        const days = (new Date(r.completed_at).getTime() - new Date(r.created_at).getTime()) / (24 * 60 * 60 * 1000)
        totalDuration += days
      }
      if (r.ekg_skipped || r.bloodwork_skipped) skipCount++
    })
    const avgOnboardingDays = completedCount > 0 ? Math.round(totalDuration / completedCount) : 0
    const skipRate = list.length > 0 ? Math.round((skipCount / list.length) * 100) : 0
    return {
      success: true,
      data: { avgOnboardingDays, onboardingTotal: list.length, skipRate },
    }
  })

// Operational tab
export const getResearchOperationalFunnel = authActionClient
  .schema(z.object({ filters: researchFiltersSchema.optional() }))
  .action(async ({ parsedInput, ctx }) => {
    const role = (ctx.user.role ?? 'patient') as UserRole
    if (!ensureResearchAccess(role)) return { success: false, error: 'Access denied' }
    const filters = toResearchFilters(parsedInput?.filters ?? {})
    const supabase = await createClient()
    const fromTs = filters.dateFrom ? `${filters.dateFrom}T00:00:00Z` : null
    const toTs = filters.dateTo ? `${filters.dateTo}T23:59:59Z` : null
    const { data, error } = await supabase.rpc('get_operational_funnel', {
      date_from: fromTs,
      date_to: toTs,
    })
    if (error) return { success: false, error: error.message }
    return { success: true, data: data as Record<string, number> }
  })

export const getResearchCapacityHeatmap = authActionClient
  .schema(z.object({ p_year: z.number().int().nullable().optional() }))
  .action(async ({ parsedInput, ctx }) => {
    const role = (ctx.user.role ?? 'patient') as UserRole
    if (!ensureResearchAccess(role)) return { success: false, error: 'Access denied' }
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_capacity_heatmap', {
      p_year: parsedInput?.p_year ?? new Date().getFullYear(),
    })
    if (error) return { success: false, error: error.message }
    return {
      success: true,
      data: (data ?? []) as { treatment_date: string; slots_used: number; capacity_max: number; utilization_pct: number }[],
    }
  })

export const getResearchFormCompletionRates = authActionClient
  .schema(z.object({ filters: researchFiltersSchema.optional() }))
  .action(async ({ parsedInput, ctx }) => {
    const role = (ctx.user.role ?? 'patient') as UserRole
    if (!ensureResearchAccess(role)) return { success: false, error: 'Access denied' }
    const filters = toResearchFilters(parsedInput?.filters ?? {})
    const supabase = await createClient()
    const fromTs = filters.dateFrom ? `${filters.dateFrom}T00:00:00Z` : null
    const toTs = filters.dateTo ? `${filters.dateTo}T23:59:59Z` : null
    const { data, error } = await supabase.rpc('get_form_completion_rates', { date_from: fromTs, date_to: toTs })
    if (error) return { success: false, error: error.message }
    return {
      success: true,
      data: (data ?? []) as { form_name: string; total_onboarding: number; completed: number; completion_rate: number }[],
    }
  })

export const getResearchDailySubmissions = authActionClient
  .schema(z.object({ filters: researchFiltersSchema.optional() }))
  .action(async ({ parsedInput, ctx }) => {
    const role = (ctx.user.role ?? 'patient') as UserRole
    if (!ensureResearchAccess(role)) return { success: false, error: 'Access denied' }
    const filters = toResearchFilters(parsedInput?.filters ?? {})
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_daily_submissions_activity', {
      date_from: filters.dateFrom,
      date_to: filters.dateTo,
    })
    if (error) return { success: false, error: error.message }
    return {
      success: true,
      data: (data ?? []) as {
        submission_date: string
        medical_updates: number
        psychological_updates: number
        sows_assessments: number
        oows_assessments: number
        total: number
      }[],
    }
  })

// Parkinson's tab
export const getResearchParkinsonsCohort = authActionClient
  .schema(z.object({ filters: researchFiltersSchema.optional() }))
  .action(async ({ parsedInput, ctx }) => {
    const role = (ctx.user.role ?? 'patient') as UserRole
    if (!ensureResearchAccess(role)) return { success: false, error: 'Access denied' }
    const filters = toResearchFilters(parsedInput?.filters ?? {})
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_parkinsons_cohort', {
      date_from: filters.dateFrom,
      date_to: filters.dateTo,
    })
    if (error) return { success: false, error: error.message }
    return { success: true, data: (data ?? []) as ParkinsonsCohortRow[] }
  })

export type ParkinsonsCohortRow = {
  patient_id: string | null
  patient_first_name: string | null
  patient_last_name: string | null
  arrival_date: string | null
  actual_departure_date: string | null
  stay_days: number | null
  age_years: number | null
  disease_duration_years: number | null
  hoehn_yahr_stage: string | null
  mds_updrs_total_score: number | null
  part_i_total_score: number | null
  part_ii_total_score: number | null
  part_iii_total_score: number | null
  part_iv_total_score: number | null
  schwab_england_total_score: number | null
  mds_pd_frailty_total_score: number | null
  risk_classification: string | null
  falls_past_6_12_months: string | null
  dementia: string | null
  psych_overall_mental_health: string | null
  psych_depression_severity: string | null
  psych_anxiety_severity: string | null
  psych_sleep_quality: string | null
  psych_emotional_numbness: string | null
  psych_motor_symptoms_severity: string | null
  psych_non_motor_symptoms_severity: string | null
  psych_treatment_outcome_hope: string | null
}

// Dosing tab
export const getResearchDosingKpis = authActionClient
  .schema(z.object({ filters: researchFiltersSchema.optional() }))
  .action(async ({ parsedInput, ctx }) => {
    const role = (ctx.user.role ?? 'patient') as UserRole
    if (!ensureResearchAccess(role)) return { success: false, error: 'Access denied' }
    const filters = toResearchFilters(parsedInput?.filters ?? {})
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_dosing_kpis', {
      date_from: filters.dateFrom,
      date_to: filters.dateTo,
      program_types: filters.programTypes?.includes('all') ? null : filters.programTypes,
    })
    if (error) return { success: false, error: error.message }
    return {
      success: true,
      data: data as { avgDosingDays: number; patientsReceiving: number; mostCommonFrequency: string },
    }
  })

export const getResearchDosingAnalysis = authActionClient
  .schema(z.object({ filters: researchFiltersSchema.optional() }))
  .action(async ({ parsedInput, ctx }) => {
    const role = (ctx.user.role ?? 'patient') as UserRole
    if (!ensureResearchAccess(role)) return { success: false, error: 'Access denied' }
    const filters = toResearchFilters(parsedInput?.filters ?? {})
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_dosing_analysis', {
      date_from: filters.dateFrom,
      date_to: filters.dateTo,
      program_types: filters.programTypes?.includes('all') ? null : filters.programTypes,
    })
    if (error) return { success: false, error: error.message }
    return { success: true, data: (data ?? []) as DosingAnalysisRow[] }
  })

export type DosingAnalysisRow = {
  management_id: string
  patient_id: string | null
  program_type: string | null
  form_date: string
  day_of_stay: number
  ibogaine_given: string | null
  ibogaine_dose: number | null
  ibogaine_doses: unknown
  ibogaine_frequency: string | null
  morning_heart_rate: number | null
  afternoon_heart_rate: number | null
  night_heart_rate: number | null
  morning_blood_pressure: string | null
  afternoon_blood_pressure: string | null
  night_blood_pressure: string | null
  morning_oxygen_saturation: number | null
  afternoon_oxygen_saturation: number | null
  night_oxygen_saturation: number | null
  solutions_iv_saline_nadh: string | null
  medication_schedule: string | null
}
