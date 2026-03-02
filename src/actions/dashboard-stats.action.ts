'use server'

import { z } from 'zod'
import { authActionClient } from '@/lib/safe-action'
import { createAdminClient } from '@/lib/supabase/server'
import { hasStaffAccess } from '@/lib/utils'
import { getAvailableTreatmentDates } from '@/actions/treatment-scheduling.action'

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}

/** Management IDs that have at least one daily or one-time form (treated as "present" on client management page even if arrival_date is in the future). */
async function getManagementIdsWithForms(
  supabase: Awaited<ReturnType<typeof createAdminClient>>
): Promise<Set<string>> {
  const tables = [
    'patient_management_intake_reports',
    'patient_management_medical_intake_reports',
    'patient_management_parkinsons_psychological_reports',
    'patient_management_parkinsons_mortality_scales',
    'patient_management_daily_psychological_updates',
    'patient_management_daily_medical_updates',
    'patient_management_daily_sows',
    'patient_management_daily_oows',
  ] as const
  const results = await Promise.all(
    tables.map((table) => supabase.from(table).select('management_id').limit(5000))
  )
  const ids = new Set<string>()
  for (const r of results) {
    if (r.data)
      for (const row of r.data as { management_id: string }[])
        if (row.management_id) ids.add(row.management_id)
  }
  return ids
}

export const getDashboardStats = authActionClient
  .schema(z.object({}))
  .action(async ({ ctx }) => {
    if (!hasStaffAccess(ctx.user.role)) {
      return { success: false, error: 'Staff access required' }
    }

    const adminClient = createAdminClient()
    const now = new Date()
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)
    const lastMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1))
    const lastMonthEnd = endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1))
    const todayStr = now.toISOString().split('T')[0]
    const lastMonthEndStr = lastMonthEnd.toISOString().split('T')[0]
    const firstDayThisMonthStr = monthStart.toISOString().split('T')[0]
    const monthStartStr = monthStart.toISOString().split('T')[0]
    const monthEndStr = monthEnd.toISOString().split('T')[0]
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const BEDS_LIMIT = 5
    const capacityPerDay = BEDS_LIMIT

    const [
      allAgreementsResult,
      currentMonthAgreementsResult,
      lastMonthAgreementsResult,
      activeArrivedResult,
      previousActivePatientsResult,
      datesResult,
      monthDatesResult,
      programTypesResult,
      formManagementIds,
    ] = await Promise.all([
      adminClient
        .from('service_agreements')
        .select('total_program_fee, patient_id, patient_email'),
      adminClient
        .from('service_agreements')
        .select('total_program_fee')
        .eq('is_activated', true)
        .gte('activated_at', monthStart.toISOString())
        .lte('activated_at', monthEnd.toISOString()),
      adminClient
        .from('service_agreements')
        .select('total_program_fee')
        .eq('is_activated', true)
        .gte('activated_at', lastMonthStart.toISOString())
        .lte('activated_at', lastMonthEnd.toISOString()),
      adminClient
        .from('patient_management')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .lte('arrival_date', todayStr),
      adminClient
        .from('patient_management')
        .select('*', { count: 'exact', head: true })
        .lte('arrival_date', lastMonthEndStr)
        .or(`discharged_at.is.null,discharged_at.gte.${firstDayThisMonthStr}`),
      getAvailableTreatmentDates({ startDate: todayStr, endDate: todayStr }),
      getAvailableTreatmentDates({ startDate: monthStartStr, endDate: monthEndStr }),
      adminClient
        .from('patient_management')
        .select('program_type'),
      getManagementIdsWithForms(adminClient),
    ])

    const totalRevenue =
      allAgreementsResult.data?.reduce(
        (sum, sa) => sum + (Number(sa.total_program_fee) || 0),
        0
      ) ?? 0

    const totalClientCount = new Set(
      allAgreementsResult.data?.map((sa) =>
        sa.patient_id ?? sa.patient_email?.toLowerCase().trim()
      ).filter(Boolean) ?? []
    ).size

    const monthlyRevenue =
      currentMonthAgreementsResult.data?.reduce(
        (sum, sa) => sum + (Number(sa.total_program_fee) || 0),
        0
      ) ?? 0

    const newAgreementsThisMonth = currentMonthAgreementsResult.data?.length ?? 0
    const newAgreementsLastMonth = lastMonthAgreementsResult.data?.length ?? 0
    let newAgreementsChangePercent: number | null = null
    if (newAgreementsLastMonth > 0) {
      newAgreementsChangePercent = Math.round(
        ((newAgreementsThisMonth - newAgreementsLastMonth) / newAgreementsLastMonth) * 100
      )
    } else if (newAgreementsThisMonth > 0) {
      newAgreementsChangePercent = 100
    }

    const lastMonthRevenue =
      lastMonthAgreementsResult.data?.reduce(
        (sum, sa) => sum + (Number(sa.total_program_fee) || 0),
        0
      ) ?? 0

    let monthlyRevenueChangePercent: number | null = null
    if (lastMonthRevenue > 0) {
      monthlyRevenueChangePercent = Math.round(
        ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      )
    } else if (monthlyRevenue > 0) {
      monthlyRevenueChangePercent = 100
    }

    // Match client management "Currently Present": arrived by date + active with future arrival but already have forms
    let presentEarlyWithFormsCount = 0
    if (formManagementIds.size > 0) {
      const presentEarlyRes = await adminClient
        .from('patient_management')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .gt('arrival_date', todayStr)
        .in('id', [...formManagementIds])
      presentEarlyWithFormsCount = presentEarlyRes.count ?? 0
    }
    const activePatients = (activeArrivedResult.count ?? 0) + presentEarlyWithFormsCount
    const previousActivePatients = previousActivePatientsResult.count ?? 0

    let activeClientsChangePercent: number | null = null
    if (previousActivePatients > 0) {
      activeClientsChangePercent = Math.round(
        ((activePatients - previousActivePatients) / previousActivePatients) * 100
      )
    } else if (activePatients > 0) {
      activeClientsChangePercent = 100
    }

    let facilityUtilization = 0
    if (datesResult?.data?.success && datesResult.data.data) {
      const schedule = (datesResult.data.data.schedule ?? []) as Array<{
        treatment_date: string
        capacity_max?: number
      }>
      const scheduleEntry = schedule.find((s) => s.treatment_date === todayStr)
      // Facility utilization based on 5 beds; treat legacy 4 as 5
      const rawMax = scheduleEntry?.capacity_max ?? BEDS_LIMIT
      const capacityMax = rawMax === 4 ? BEDS_LIMIT : rawMax
      facilityUtilization =
        capacityMax > 0 ? Math.round((activePatients / capacityMax) * 100) : 0
    }

    const programTypeLabels: Record<string, string> = {
      neurological: 'Neurological',
      mental_health: 'Mental Health',
      addiction: 'Addiction',
    }
    const programCounts: Record<string, number> = {
      neurological: 0,
      mental_health: 0,
      addiction: 0,
    }
    programTypesResult.data?.forEach((row: { program_type: string | null }) => {
      const pt = row.program_type?.toLowerCase()
      if (pt && programCounts[pt] !== undefined) programCounts[pt] += 1
    })
    const programsByType = (['neurological', 'mental_health', 'addiction'] as const).map(
      (key) => ({
        name: programTypeLabels[key],
        patientCount: programCounts[key] ?? 0,
      })
    )

    let facilityUtilizationMonth = 0
    if (monthDatesResult?.data?.success && monthDatesResult.data.data) {
      const occupancyByDate = monthDatesResult.data.data.occupancyByDate as Record<
        string,
        number
      >
      let totalPatientDays = 0
      for (let d = 1; d <= daysInMonth; d++) {
        const dayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        totalPatientDays += occupancyByDate[dayStr] ?? 0
      }
      // Month utilization = total patient-days / (5 beds × days in month)
      const monthCapacity = capacityPerDay * daysInMonth
      facilityUtilizationMonth =
        monthCapacity > 0
          ? Math.round((totalPatientDays / monthCapacity) * 100)
          : 0
    }

    return {
      success: true,
      data: {
        totalRevenue,
        totalClientCount,
        monthlyRevenue,
        lastMonthRevenue,
        monthlyRevenueChangePercent,
        newAgreementsThisMonth,
        newAgreementsChangePercent,
        activePatients,
        activeClientsChangePercent,
        facilityUtilization,
        programsByType,
        facilityUtilizationMonth,
      },
    }
  })

/** Live counts for manager dashboard module cards (Patient Management, Onboarding, Research). */
export const getManagerModuleCounts = authActionClient
  .schema(z.object({}))
  .action(async ({ ctx }) => {
    if (!hasStaffAccess(ctx.user.role)) {
      return { success: false, error: 'Staff access required' }
    }

    const adminClient = createAdminClient()
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)
    const monthStartStr = monthStart.toISOString().split('T')[0]
    const monthEndStr = monthEnd.toISOString().split('T')[0]
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

    const [
      activeArrivedRes,
      formManagementIds,
      dailyMedicalTodayRes,
      dailyPsychTodayRes,
      departuresThisMonthRes,
      onboardingTotalRes,
      onboardingReadyRes,
      researchTotalRes,
      researchActiveRes,
      researchCompletedRes,
    ] = await Promise.all([
      adminClient
        .from('patient_management')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .lte('arrival_date', todayStr),
      getManagementIdsWithForms(adminClient),
      adminClient
        .from('patient_management_daily_medical_updates')
        .select('id', { count: 'exact', head: true })
        .eq('form_date', todayStr),
      adminClient
        .from('patient_management_daily_psychological_updates')
        .select('id', { count: 'exact', head: true })
        .eq('form_date', todayStr),
      adminClient
        .from('patient_management')
        .select('*', { count: 'exact', head: true })
        .in('status', ['discharged', 'transferred'])
        .gte('discharged_at', monthStart.toISOString())
        .lte('discharged_at', monthEnd.toISOString()),
      adminClient
        .from('patient_onboarding')
        .select('id', { count: 'exact', head: true }),
      adminClient
        .from('patient_onboarding')
        .select('id', { count: 'exact', head: true })
        .eq('medical_clearance', true),
      adminClient
        .from('patient_management')
        .select('id', { count: 'exact', head: true })
        .gte('arrival_date', thirtyDaysAgoStr)
        .lte('arrival_date', monthEndStr),
      adminClient
        .from('patient_management')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .gte('arrival_date', thirtyDaysAgoStr)
        .lte('arrival_date', monthEndStr),
      adminClient
        .from('patient_management')
        .select('id', { count: 'exact', head: true })
        .in('status', ['discharged', 'transferred'])
        .gte('arrival_date', thirtyDaysAgoStr)
        .lte('arrival_date', monthEndStr),
    ])

    let presentEarlyWithFormsCount = 0
    if (formManagementIds.size > 0) {
      const presentEarlyRes = await adminClient
        .from('patient_management')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .gt('arrival_date', todayStr)
        .in('id', [...formManagementIds])
      presentEarlyWithFormsCount = presentEarlyRes.count ?? 0
    }
    const activePatients = (activeArrivedRes.count ?? 0) + presentEarlyWithFormsCount
    const dailyFormsToday = (dailyMedicalTodayRes.count ?? 0) + (dailyPsychTodayRes.count ?? 0)
    const departuresThisMonth = departuresThisMonthRes.count ?? 0
    const onboardingTotal = onboardingTotalRes.count ?? 0
    const onboardingReady = onboardingReadyRes.count ?? 0
    const onboardingFormsPending = Math.max(0, onboardingTotal - onboardingReady)
    const researchClients30d = researchTotalRes.count ?? 0
    const researchActive = researchActiveRes.count ?? 0
    const researchCompleted = researchCompletedRes.count ?? 0

    return {
      success: true,
      data: {
        patientManagement: {
          activePatients,
          dailyFormsToday,
          departuresThisMonth,
        },
        onboarding: {
          total: onboardingTotal,
          formsPending: onboardingFormsPending,
          readyForArrival: onboardingReady,
        },
        research: {
          clientsLast30Days: researchClients30d,
          active: researchActive,
          completed: researchCompleted,
        },
      },
    }
  })
