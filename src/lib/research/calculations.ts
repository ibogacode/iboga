/**
 * Client-side calculations: regression, binning, day-of-stay.
 */

import { parseISO } from 'date-fns'

export function dayOfStay(arrivalDate: string, formDate: string): number {
  const a = typeof arrivalDate === 'string' && arrivalDate.length >= 10
    ? parseISO(arrivalDate)
    : new Date(arrivalDate)
  const f = typeof formDate === 'string' && formDate.length >= 10
    ? parseISO(formDate)
    : new Date(formDate)
  const diff = Math.round((f.getTime() - a.getTime()) / (24 * 60 * 60 * 1000))
  return Math.max(1, diff + 1)
}

export function linearRegression(
  points: { x: number; y: number }[]
): { slope: number; intercept: number; r2: number } {
  const n = points.length
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 }
  const sumX = points.reduce((a, p) => a + p.x, 0)
  const sumY = points.reduce((a, p) => a + p.y, 0)
  const sumXY = points.reduce((a, p) => a + p.x * p.y, 0)
  const sumX2 = points.reduce((a, p) => a + p.x * p.x, 0)
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  const meanY = sumY / n
  const ssTot = points.reduce((a, p) => a + Math.pow(p.y - meanY, 2), 0)
  const ssRes = points.reduce((a, p) => a + Math.pow(p.y - (slope * p.x + intercept), 2), 0)
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot
  return { slope, intercept, r2 }
}

export function binHistogram(
  values: number[],
  bins: [number, number][]
): number[] {
  const counts = bins.map(() => 0)
  for (const v of values) {
    const i = bins.findIndex(([lo, hi]) => v >= lo && v < hi)
    if (i >= 0) counts[i]++
    else if (v >= bins[bins.length - 1][1]) counts[counts.length - 1]++
  }
  return counts
}

export const MDS_UPDRS_PARTIII_BINS: [number, number][] = [
  [0, 21],
  [21, 41],
  [41, 61],
  [61, 81],
  [81, 101],
  [101, Infinity],
]

export function parseSystolicBP(bp: string | null): number | null {
  if (!bp || typeof bp !== 'string') return null
  const part = bp.split('/')[0]?.trim()
  const n = parseInt(part ?? '', 10)
  return Number.isNaN(n) ? null : n
}

// Parse systolic from "120/80" text format
export function parseSystolic(bp: string | null | undefined): number | null {
  if (!bp) return null
  const parts = bp.trim().split('/')
  if (parts.length < 1) return null
  const val = parseInt(parts[0], 10)
  return isNaN(val) ? null : val
}

// Parse diastolic from "120/80" text format
export function parseDiastolic(bp: string | null | undefined): number | null {
  if (!bp) return null
  const parts = bp.trim().split('/')
  if (parts.length < 2) return null
  const val = parseInt(parts[1], 10)
  return isNaN(val) ? null : val
}

// Sum ibogaine doses from JSONB array field
// ibogaine_doses stored as [{dose: number, time: string}, ...] or [number, ...]
export function sumIbogaineDoses(
  dosesJson: unknown[] | null | undefined,
  fallbackDose: number | null | undefined
): number {
  if (!dosesJson || !Array.isArray(dosesJson) || dosesJson.length === 0) {
    return fallbackDose ?? 0
  }
  const sum = dosesJson.reduce((acc: number, entry: unknown) => {
    if (typeof entry === 'number') return acc + entry
    if (typeof entry === 'object' && entry !== null) {
      const d = (entry as Record<string, unknown>).dose
      if (typeof d === 'number') return acc + d
      if (typeof d === 'string') {
        const parsed = parseFloat(d)
        return acc + (isNaN(parsed) ? 0 : parsed)
      }
    }
    return acc
  }, 0)
  return sum > 0 ? sum : (fallbackDose ?? 0)
}

// Map OOWS day_of_stay to day number (1-based)
export function calcDayOfStay(formDate: string, arrivalDate: string): number {
  const form = new Date(formDate)
  const arrival = new Date(arrivalDate)
  const diff = Math.floor((form.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24))
  return diff + 1
}

// Bin MDS-UPDRS Part III scores
export function binMotorScore(score: number): string {
  if (score <= 20) return '0–20'
  if (score <= 40) return '21–40'
  if (score <= 60) return '41–60'
  if (score <= 80) return '61–80'
  if (score <= 100) return '81–100'
  return '100+'
}

// Normalize free-text substance to category
export function normalizeSubstance(text: string | null | undefined): string {
  if (!text) return 'Unknown'
  const t = text.toLowerCase()
  if (/heroin|opioid|opiate|fentanyl|morphine|oxycodone|hydrocodone|methadone|suboxone|buprenorphine/.test(t))
    return 'Opioids'
  if (/alcohol|beer|wine|whiskey|vodka|liquor|drinking/.test(t))
    return 'Alcohol'
  if (/benzo|diazepam|lorazepam|xanax|alprazolam|clonazepam|valium|klonopin/.test(t))
    return 'Benzodiazepines'
  if (/cocaine|crack|stimulant|amphetamine|meth|adderall/.test(t))
    return 'Stimulants'
  if (/cannabis|marijuana|weed|thc|cbd/.test(t))
    return 'Cannabis'
  if (/multiple|poly|various|several/.test(t))
    return 'Polysubstance'
  return 'Other'
}

// Map psych report text rating to 1–5 numeric
export function mapPsychRating(text: string | null | undefined): number | null {
  if (!text) return null
  const t = text.toLowerCase().trim()
  if (/very low|none|never|excellent|very good|not at all/.test(t)) return 1
  if (/low|rarely|good|mild|slight/.test(t)) return 2
  if (/moderate|sometimes|fair|average|neutral/.test(t)) return 3
  if (/high|often|poor|significant|frequent/.test(t)) return 4
  if (/very high|always|severe|very poor|extreme|constant/.test(t)) return 5
  return 3 // default to middle if unrecognized
}
