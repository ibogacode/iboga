/**
 * Research module data formatting utilities.
 */

import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { PROGRAM_LABELS, type ProgramType } from './constants'

export function formatMonth(dateStr: string): string {
  try {
    const d = typeof dateStr === 'string' && dateStr.length >= 7
      ? parseISO(dateStr + (dateStr.length === 7 ? '-01' : ''))
      : new Date(dateStr)
    return format(d, 'MMM yyyy')
  } catch {
    return String(dateStr)
  }
}

export function formatShortDate(dateStr: string): string {
  try {
    const d = parseISO(dateStr)
    return format(d, 'MMM d, yyyy')
  } catch {
    return String(dateStr)
  }
}

export function timeAgo(isoString: string): string {
  try {
    return formatDistanceToNow(parseISO(isoString), { addSuffix: true })
  } catch {
    return ''
  }
}

export function programLabel(programType: string | null): string {
  if (!programType) return '—'
  return PROGRAM_LABELS[programType as ProgramType] ?? programType
}

export function anonymizePatientId(id: string): string {
  if (!id || id.length < 4) return 'P-****'
  return `P-${id.slice(-4)}`
}

export function completionRateColor(rate: number): 'emerald' | 'amber' | 'red' {
  if (rate >= 80) return 'emerald'
  if (rate >= 60) return 'amber'
  return 'red'
}

export function frailtyRiskLabel(score: number): string {
  if (score <= 1) return 'Low'
  if (score <= 3) return 'Moderate'
  return 'High'
}
