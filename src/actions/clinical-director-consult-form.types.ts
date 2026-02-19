/** Shared types and constants for Clinical Director consult form. Not a server module. */

export const DIAGNOSED_CONDITIONS_OPTIONS = [
  'Depression',
  'Anxiety',
  'PTSD',
  'Bipolar disorder',
  'Schizophrenia or psychosis',
  'Personality disorder',
  'Suicidal thoughts or attempts',
  'None',
] as const

export interface ClinicalDirectorConsultFormData {
  id: string
  onboarding_id: string
  created_at: string
  updated_at: string
  psychedelics_before: boolean | null
  psychedelics_which: string | null
  supplements_regular: string | null
  arrival_date: string | null
  arrival_time: string | null
  questions_concerns_prior_arrival: string | null
  dietary_restrictions_allergies: string | null
  substance_use_caffeine_nicotine_alcohol: string | null
  substance_use_frequency_amount: string | null
  diagnosed_conditions: string | null
  substances_used_past: string | null
  substances_started_when: string | null
  substances_current: string | null
  substances_current_frequency_amount: string | null
  substances_current_last_use_date: string | null
  withdrawal_symptoms_before: boolean | null
  previous_detox_rehab: boolean | null
  previous_detox_rehab_times: number | null
}
