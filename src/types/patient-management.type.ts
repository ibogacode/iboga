// =============================================================================
// Patient Management System Types
// =============================================================================

// Patient Management status
export type PatientManagementStatus = 'active' | 'discharged' | 'transferred'
export type PatientManagementPriority = 'low' | 'normal' | 'high' | 'urgent'

// =============================================================================
// Patient Management
// =============================================================================
export interface PatientManagement {
  id: string
  onboarding_id: string | null
  patient_id: string | null
  
  // Patient info
  first_name: string
  last_name: string
  email: string
  phone_number: string | null
  date_of_birth: string | null
  program_type: 'neurological' | 'mental_health' | 'addiction'
  
  // Stay tracking
  arrival_date: string
  expected_departure_date: string | null
  actual_departure_date: string | null
  status: PatientManagementStatus
  
  // One-time form completion flags
  intake_report_completed: boolean
  parkinsons_psychological_report_completed: boolean
  parkinsons_mortality_scales_completed: boolean
  
  // Workflow
  notes: string | null
  priority: PatientManagementPriority
  assigned_to: string | null
  
  // Program Details
  program_start_date: string | null
  program_end_date: string | null
  program_status: 'scheduled' | 'active' | 'completed' | 'cancelled' | 'on_hold' | null
  program_notes: string | null
  program_name: string | null
  program_duration: number | null // Duration in days
  
  // Timestamps
  started_at: string
  discharged_at: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

// Extended type with computed fields
export interface PatientManagementWithProgress extends PatientManagement {
  one_time_forms_completed: number
  one_time_forms_total: number
  daily_forms_today_completed: number
  daily_forms_today_total: number
}

// =============================================================================
// One-Time Forms
// =============================================================================

// Base one-time form fields
interface BaseOneTimeForm {
  id: string
  management_id: string
  patient_id: string | null
  is_completed: boolean
  completed_at: string | null
  filled_by: string | null
  filled_at: string | null
  created_at: string
  updated_at: string
}

// Intake Report (All Programs)
export interface PatientManagementIntakeReport extends BaseOneTimeForm {
  guest_first_name: string
  guest_last_name: string
  date: string
  time_of_intake: string
  staff_member_completing_form: string | null
  
  // Emotional and Psychological State
  emotional_state_today: string
  emotional_shifts_48h: string | null
  emotional_themes_memories: string | null
  emotionally_connected: string
  strong_emotions: string | null
  
  // Cognitive and Mental Functioning
  mental_clarity: string
  focus_memory_concentration: string | null
  recurring_thoughts_dreams: string | null
  present_aware: string
  intrusive_thoughts_dissociation: string | null
  
  // Physical and Somatic Awareness
  energy_level: number | null
  physical_discomfort: string | null
  sleep_appetite_digestion: string | null
  physical_sensations_emotions: string | null
  
  // Psychological Readiness
  intentions_goals: string | null
  emotionally_physically_safe: string
  resolve_release_explore: string | null
  team_awareness: string | null
}

// Parkinson's Intake Psychological Report (Neurological Only)
export interface PatientManagementParkinsonsPsychologicalReport extends BaseOneTimeForm {
  patient_first_name: string
  patient_last_name: string
  reason_for_coming: string
  
  // Mental health ratings
  overall_mental_health_rating: string
  daily_stress_management: string
  depression_sadness_severity: string
  expressing_emotions_safety: string
  ibogaine_therapy_preparation: string
  support_system_strength: string
  treatment_outcome_hope: string
  anxiety_nervousness_severity: string
  emotional_numbness_frequency: string
  sleep_quality: string
  
  // Parkinson's specific ratings
  parkinsons_motor_symptoms_severity: string
  stiffness_difficulty_moving_frequency: string
  medication_effectiveness: string
  muscle_spasms_cramps_frequency: string
  non_motor_symptoms_severity: string
  iboga_wellness_team_support: string
  
  // Signature
  signature_data: string | null
  signature_date: string | null
}

// Parkinson's Mortality - Related Scales (Neurological Only)
export interface PatientManagementParkinsonsMortalityScales extends BaseOneTimeForm {
  patient_first_name: string
  patient_last_name: string
  
  // MDS-UPDRS Part I
  cognitive_impairment: number | null
  hallucinations_psychosis: number | null
  depressed_mood: number | null
  anxious_mood: number | null
  apathy: number | null
  dopaminergic_dysregulation: number | null
  sleep_problems: number | null
  daytime_sleepiness: number | null
  pain_sensory_complaints: number | null
  urinary_problems: number | null
  constipation: number | null
  lightheadedness: number | null
  fatigue: number | null
  part_i_total_score: number
  
  // MDS-UPDRS Part II
  speech_part2: number | null
  saliva_drooling: number | null
  chewing_swallowing: number | null
  eating_tasks: number | null
  dressing: number | null
  hygiene: number | null
  handwriting: number | null
  hobbies_activities: number | null
  turning_in_bed: number | null
  tremor_daily_impact: number | null
  getting_out_of_bed: number | null
  walking_balance: number | null
  freezing_of_gait_part2: number | null
  part_ii_total_score: number
  
  // MDS-UPDRS Part III
  speech_part3: number | null
  facial_expression: number | null
  rigidity_neck: number | null
  rigidity_right_upper_limb: number | null
  rigidity_left_upper_limb: number | null
  rigidity_right_lower_limb: number | null
  rigidity_left_lower_limb: number | null
  finger_tapping_right: number | null
  finger_tapping_left: number | null
  hand_movements_right: number | null
  hand_movements_left: number | null
  pronation_supination_right: number | null
  pronation_supination_left: number | null
  toe_tapping_right: number | null
  toe_tapping_left: number | null
  leg_agility_right: number | null
  leg_agility_left: number | null
  arising_from_chair: number | null
  gait: number | null
  freezing_of_gait_part3: number | null
  postural_stability: number | null
  posture: number | null
  global_bradykinesia: number | null
  postural_tremor_right: number | null
  postural_tremor_left: number | null
  kinetic_tremor_right: number | null
  kinetic_tremor_left: number | null
  rest_tremor_right_upper: number | null
  rest_tremor_left_upper: number | null
  rest_tremor_right_lower: number | null
  rest_tremor_left_lower: number | null
  rest_tremor_lip_jaw: number | null
  constancy_of_rest_tremor: number | null
  part_iii_total_score: number
  
  // MDS-UPDRS Part IV
  time_with_dyskinesias: number | null
  impact_of_dyskinesias: number | null
  time_in_off_state: number | null
  impact_of_fluctuations: number | null
  complexity_of_fluctuations: number | null
  painful_off_state_dystonia: number | null
  part_iv_total_score: number
  
  // Overall MDS-UPDRS
  mds_updrs_total_score: number
  administered_by: string | null
  mds_updrs_notes: string | null
  
  // Hoehn & Yahr Staging
  hoehn_yahr_stage: string | null
  
  // Schwab & England
  dressing_score: number | null
  feeding_score: number | null
  ambulation_transfers_score: number | null
  household_tasks_score: number | null
  use_of_appliances_communication_score: number | null
  schwab_england_total_score: number
  
  // PDCMI
  age_years: number | null
  disease_duration_years: number | null
  dementia: string | null
  falls_past_6_12_months: string | null
  mds_updrs_part_iii_motor_score: number | null
  risk_classification: string | null
  
  // MDS-PD Clinical Frailty
  weight_loss: number | null
  fatigue_frailty: number | null
  physical_activity: number | null
  strength_gait_speed: number | null
  comorbidities_assistance: number | null
  mds_pd_frailty_total_score: number
  
  // File upload
  scanned_mds_updrs_form_url: string | null
}

// =============================================================================
// Daily Forms
// =============================================================================

// Base daily form fields
interface BaseDailyForm {
  id: string
  management_id: string
  patient_id: string | null
  form_date: string
  is_completed: boolean
  completed_at: string | null
  started_by: string | null
  started_at: string | null
  filled_by: string | null
  submitted_at: string | null
  created_at: string
  updated_at: string
}

// Daily Psychological Update (All Programs)
export interface PatientManagementDailyPsychologicalUpdate extends BaseDailyForm {
  guest_first_name: string
  guest_last_name: string
  time: string
  
  // 1. Emotional & Cognitive Check-In
  emotional_state_today: string
  emotional_shifts_since_last_report: string | null
  vivid_dreams_resurfacing_memories: string | null
  feeling_connected_to_emotions: string | null
  changes_memory_focus_concentration: string | null
  feeling_present_aware: string | null
  discomfort_side_effects: string | null
  energy_level: number
  
  // 2. Parkinson's Patients Only (Motor Function)
  experiencing_tremors_muscle_stiffness: string | null
  motor_function_details: string | null
  
  // 3. Staff Observations
  how_guest_looks_physically: string
  how_guest_describes_feeling: string
  additional_notes_observations: string
}

// Daily Medical Update (All Programs)
export interface PatientManagementDailyMedicalUpdate extends BaseDailyForm {
  patient_first_name: string
  patient_last_name: string
  
  // Checked Vitals
  checked_vitals: boolean
  did_they_feel_hungry: string | null
  using_bathroom_normally: string | null
  hydrating: string | null
  experiencing_tremors_motor_function: string | null
  withdrawal_symptoms: string | null
  how_guest_looks: string | null
  energy_level: number | null
  how_guest_says_they_feel: string | null
  
  // Patient Observations (Morning, Afternoon, Night)
  morning_vital_signs: string | null
  morning_symptoms: string | null
  morning_evolution: string | null
  afternoon_vital_signs: string | null
  afternoon_symptoms: string | null
  afternoon_evolution: string | null
  night_vital_signs: string | null
  night_symptoms: string | null
  night_evolution: string | null
  
  // Medication & Treatment
  ibogaine_dose_time: string | null
  medication_schedule: string | null
  solutions_iv_saline_nadh: string | null
  medical_indications: string | null
  additional_observations_notes: string | null
  
  // File upload
  photo_of_vitals_medical_notes_url: string | null
  
  // Signature
  signature_data: string | null
  signature_date: string | null
}

// =============================================================================
// Combined Types
// =============================================================================

// All forms combined
export interface PatientManagementForms {
  intakeReport: PatientManagementIntakeReport | null
  parkinsonsPsychologicalReport: PatientManagementParkinsonsPsychologicalReport | null
  parkinsonsMortalityScales: PatientManagementParkinsonsMortalityScales | null
  dailyPsychologicalUpdates: PatientManagementDailyPsychologicalUpdate[]
  dailyMedicalUpdates: PatientManagementDailyMedicalUpdate[]
}

// Full patient management data with forms
export interface PatientManagementWithForms {
  management: PatientManagement
  forms: PatientManagementForms
}

// Form type enum for dynamic access
export type PatientManagementFormType = 
  | 'intake_report' 
  | 'parkinsons_psychological_report' 
  | 'parkinsons_mortality_scales' 
  | 'daily_psychological_update' 
  | 'daily_medical_update'

// Table name mapping
export const PATIENT_MANAGEMENT_FORM_TABLE_MAP: Record<PatientManagementFormType, string> = {
  intake_report: 'patient_management_intake_reports',
  parkinsons_psychological_report: 'patient_management_parkinsons_psychological_reports',
  parkinsons_mortality_scales: 'patient_management_parkinsons_mortality_scales',
  daily_psychological_update: 'patient_management_daily_psychological_updates',
  daily_medical_update: 'patient_management_daily_medical_updates',
}
