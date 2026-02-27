'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useResearchFilters } from './useResearchFilters'
import { getResearchDosingKpis, getResearchDosingAnalysis } from '@/actions/research.action'
import type { DosingAnalysisRow } from '@/actions/research.action'
import { sumIbogaineDoses, parseSystolic, linearRegression } from '@/lib/research/calculations'
import { MEDICATION_SOLUTION_TERMS, MEDICATION_STOP_WORDS } from '@/lib/research/constants'

export function useDosingData() {
  const { filtersForApi } = useResearchFilters()
  const [kpis, setKpis] = useState<{
    avgDosingDays: number
    patientsReceiving: number
    mostCommonFrequency: string
  } | null>(null)
  const [rows, setRows] = useState<DosingAnalysisRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    setIsLoading(true)
    const filters = {
      ...filtersForApi,
      dateFrom: filtersForApi.dateFrom ?? undefined,
      dateTo: filtersForApi.dateTo ?? undefined,
    }
    const [kpisRes, analysisRes] = await Promise.all([
      getResearchDosingKpis({ filters }),
      getResearchDosingAnalysis({ filters }),
    ])
    if (kpisRes?.data?.success && kpisRes.data.data) setKpis(kpisRes.data.data as { avgDosingDays: number; patientsReceiving: number; mostCommonFrequency: string })
    else setKpis(null)
    if (analysisRes?.data?.success && analysisRes.data.data) setRows((analysisRes.data.data ?? []) as DosingAnalysisRow[])
    else setRows([])
    const err = !kpisRes?.data?.success ? kpisRes?.data?.error : !analysisRes?.data?.success ? analysisRes?.data?.error : null
    setError(err ?? null)
    setIsLoading(false)
  }, [filtersForApi])

  useEffect(() => {
    load()
  }, [load])

  const doseTimeline = useMemo(() => {
    const byDay = new Map<number, { clientCount: number; totalMg: number }>()
    rows.forEach((r) => {
      const day = r.day_of_stay ?? 0
      if (day < 1) return
      const cur = byDay.get(day) ?? { clientCount: 0, totalMg: 0 }
      cur.clientCount += 1
      const given = (r.ibogaine_given ?? '').toLowerCase() === 'yes'
      const doses = Array.isArray(r.ibogaine_doses) ? r.ibogaine_doses : []
      const mg = given ? sumIbogaineDoses(doses, r.ibogaine_dose) : 0
      cur.totalMg += mg
      byDay.set(day, cur)
    })
    return Array.from(byDay.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([day, v]) => ({
        day,
        clientCount: v.clientCount,
        dosingCount: v.clientCount,
        avgMg: v.clientCount > 0 ? Math.round((v.totalMg / v.clientCount) * 10) / 10 : 0,
      }))
  }, [rows])

  const vitalsDosingVsNon = useMemo(() => {
    let dosingHr = 0
    let dosingN = 0
    let nonHr = 0
    let nonN = 0
    let dosingSys = 0
    let dosingSysN = 0
    let nonSys = 0
    let nonSysN = 0
    let dosingO2 = 0
    let dosingO2N = 0
    let nonO2 = 0
    let nonO2N = 0
    rows.forEach((r) => {
      const given = (r.ibogaine_given ?? '').toLowerCase() === 'yes'
      const hr = r.morning_heart_rate ?? r.afternoon_heart_rate ?? r.night_heart_rate
      const sys = parseSystolic(r.morning_blood_pressure ?? r.afternoon_blood_pressure ?? r.night_blood_pressure)
      const o2 = r.morning_oxygen_saturation ?? r.afternoon_oxygen_saturation ?? r.night_oxygen_saturation
      if (given) {
        if (hr != null) {
          dosingHr += hr
          dosingN++
        }
        if (sys != null) {
          dosingSys += sys
          dosingSysN++
        }
        if (o2 != null) {
          dosingO2 += o2
          dosingO2N++
        }
      } else {
        if (hr != null) {
          nonHr += hr
          nonN++
        }
        if (sys != null) {
          nonSys += sys
          nonSysN++
        }
        if (o2 != null) {
          nonO2 += o2
          nonO2N++
        }
      }
    })
    return {
      dosing: {
        avgHeartRate: dosingN > 0 ? Math.round((dosingHr / dosingN) * 10) / 10 : null,
        avgSystolic: dosingSysN > 0 ? Math.round(dosingSys / dosingSysN) : null,
        avgO2: dosingO2N > 0 ? Math.round(dosingO2 / dosingO2N) : null,
      },
      nonDosing: {
        avgHeartRate: nonN > 0 ? Math.round((nonHr / nonN) * 10) / 10 : null,
        avgSystolic: nonSysN > 0 ? Math.round(nonSys / nonSysN) : null,
        avgO2: nonO2N > 0 ? Math.round(nonO2 / nonO2N) : null,
      },
    }
  }, [rows])

  const scatterData = useMemo(() => {
    const byDay = new Map<number, { sumMg: number; count: number }>()
    rows.forEach((r) => {
      const given = (r.ibogaine_given ?? '').toLowerCase() === 'yes'
      if (!given) return
      const day = r.day_of_stay ?? 0
      if (day < 1) return
      const doses = Array.isArray(r.ibogaine_doses) ? r.ibogaine_doses : []
      const mg = sumIbogaineDoses(doses, r.ibogaine_dose)
      if (mg > 0) {
        const cur = byDay.get(day) ?? { sumMg: 0, count: 0 }
        cur.sumMg += mg
        cur.count += 1
        byDay.set(day, cur)
      }
    })
    return Array.from(byDay.entries())
      .map(([day, v]) => ({
        x: day,
        y: Math.round((v.sumMg / v.count) * 10) / 10,
        managementId: '',
      }))
      .sort((a, b) => a.x - b.x)
  }, [rows])

  const regression = useMemo(() => linearRegression(scatterData.map((p) => ({ x: p.x, y: p.y }))), [scatterData])

  const firstDoseByDay = useMemo(() => {
    const firstDosePerClient = new Map<string, { day: number; programType: string }>()
    rows.forEach((r) => {
      const given = (r.ibogaine_given ?? '').toLowerCase() === 'yes'
      if (!given) return
      const day = r.day_of_stay ?? 0
      if (day < 1) return
      const doses = Array.isArray(r.ibogaine_doses) ? r.ibogaine_doses : []
      const mg = sumIbogaineDoses(doses, r.ibogaine_dose)
      if (mg <= 0) return
      const programType = r.program_type ?? 'unknown'
      const existing = firstDosePerClient.get(r.management_id)
      if (!existing || day < existing.day) {
        firstDosePerClient.set(r.management_id, { day, programType })
      }
    })
    type ProgramKey = 'neurological' | 'mental_health' | 'addiction' | 'unknown'
    const byDay = new Map<number, Record<ProgramKey, number>>()
    const programKeys: readonly ProgramKey[] = ['neurological', 'mental_health', 'addiction'] as const
    firstDosePerClient.forEach(({ day, programType }) => {
      const cur = byDay.get(day) ?? { neurological: 0, mental_health: 0, addiction: 0, unknown: 0 }
      const key: ProgramKey = programKeys.includes(programType as ProgramKey) ? (programType as ProgramKey) : 'unknown'
      cur[key] = (cur[key] ?? 0) + 1
      byDay.set(day, cur)
    })
    return Array.from(byDay.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([day, counts]) => ({
        day,
        name: `Day ${day}`,
        ...counts,
        total: counts.neurological + counts.mental_health + counts.addiction + counts.unknown,
      }))
  }, [rows])

  const medicationMentions = useMemo(() => {
    const map = new Map<string, number>()
    const add = (text: string | null | undefined) => {
      if (!text || typeof text !== 'string') return
      const tokens = text
        .toLowerCase()
        .replace(/[,;:\n]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length > 2 && !MEDICATION_STOP_WORDS.has(t))
      tokens.forEach((t) => map.set(t, (map.get(t) ?? 0) + 1))
    }
    rows.forEach((r) => {
      add(r.solutions_iv_saline_nadh)
      add(r.medication_schedule)
    })
    return Array.from(map.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .filter(([name]) => MEDICATION_SOLUTION_TERMS.has(name))
      .map(([name, count]) => ({ name, count }))
  }, [rows])

  const patientsWithDose = useMemo(() => {
    const ids = new Set<string>()
    rows.forEach((r) => {
      if ((r.ibogaine_given ?? '').toLowerCase() === 'yes') ids.add(r.management_id)
    })
    return ids.size
  }, [rows])

  const totalPatients = useMemo(() => {
    const ids = new Set<string>()
    rows.forEach((r) => ids.add(r.management_id))
    return ids.size
  }, [rows])

  return {
    kpis,
    rows,
    doseTimeline,
    vitalsDosingVsNon,
    scatterData,
    regression,
    firstDoseByDay,
    medicationMentions,
    patientsWithDose,
    totalPatients,
    totalRecords: rows.length,
    isLoading,
    error,
    refetch: load,
  }
}
