import { z } from 'zod'

// =============================================================================
// Helper Functions
// =============================================================================

// Preprocess empty strings to undefined for optional fields
const stringOptional = z.preprocess(
  (val) => (val === '' || val === null ? undefined : val),
  z.string().optional()
)

const numberOptional = z.preprocess(
  (val) => (val === '' || val === null ? undefined : val),
  z.number().optional()
)

const isoDateOptional = z.preprocess(
  (val) => {
    if (!val || val === '') return undefined
    if (typeof val === 'string') {
      // Handle MM-DD-YYYY format
      const parts = val.split('-')
      if (parts.length === 3) {
        const [month, day, year] = parts
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
      return val
    }
    return val
  },
  z.string().optional()
)

// =============================================================================
// Intake Report Schema (All Programs)
// =============================================================================

export const intakeReportSchema = z.object({
  management_id: z.string().uuid('Invalid management ID'),
  guest_first_name: z.string().min(1, 'First name is required'),
  guest_last_name: z.string().min(1, 'Last name is required'),
  date: z.string().min(1, 'Date is required'),
  time_of_intake: z.string().min(1, 'Time of intake is required'),
  staff_member_completing_form: stringOptional,

  // Emotional and Psychological State
  emotional_state_today: z.string().min(1, 'This field is required'),
  emotional_shifts_48h: stringOptional,
  emotional_themes_memories: stringOptional,
  emotionally_connected: z.string().min(1, 'This field is required'),
  strong_emotions: stringOptional,

  // Cognitive and Mental Functioning
  mental_clarity: z.string().min(1, 'This field is required'),
  focus_memory_concentration: stringOptional,
  recurring_thoughts_dreams: stringOptional,
  present_aware: z.string().min(1, 'This field is required'),
  intrusive_thoughts_dissociation: stringOptional,

  // Physical and Somatic Awareness
  energy_level: z.number().min(1).max(10).optional().nullable(),
  physical_discomfort: stringOptional,
  sleep_appetite_digestion: stringOptional,
  physical_sensations_emotions: stringOptional,

  // Psychological Readiness
  intentions_goals: stringOptional,
  emotionally_physically_safe: z.string().min(1, 'This field is required'),
  resolve_release_explore: stringOptional,
  team_awareness: stringOptional,
})

// Admin schema (relaxed for partial updates)
export const intakeReportAdminSchema = intakeReportSchema.partial().extend({
  management_id: z.string().uuid(),
  is_completed: z.boolean().optional(),
})

// =============================================================================
// Medical Intake Report Schema (All Programs)
// =============================================================================

export const medicalIntakeReportSchema = z.object({
  management_id: z.string().uuid('Invalid management ID'),
  name: z.string().min(1, 'Name is required'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  arrival_date: z.string().min(1, 'Arrival date is required'),

  // Changes Since Medical Clearance
  changes_since_medical_clearance: z.boolean().default(false),
  changes_medications: z.boolean().default(false).optional(),
  changes_substance_use: z.boolean().default(false).optional(),
  changes_hospitalization: z.boolean().default(false).optional(),
  changes_new_symptoms: z.boolean().default(false).optional(),
  changes_explanation: stringOptional,

  // Last Use & Medication Confirmation
  last_substance_use_datetime: stringOptional,
  medications_last_72_hours: stringOptional,

  // Current Physical Status (Staff)
  blood_pressure: stringOptional,
  heart_rate: z.number().min(30).max(200).optional().nullable(),
  oxygen_saturation: z.number().min(0).max(100).optional().nullable(),
  temperature: z.number().optional().nullable(),
  symptoms_nausea: z.boolean().default(false).optional(),
  symptoms_dizziness: z.boolean().default(false).optional(),
  symptoms_palpitations: z.boolean().default(false).optional(),
  symptoms_anxiety: z.boolean().default(false).optional(),
  symptoms_pain: z.boolean().default(false).optional(),

  // Hydration & Nutrition
  last_food_intake: stringOptional,
  last_fluids: stringOptional,
  well_hydrated: z.boolean().default(false).optional(),
  possibly_dehydrated: z.boolean().default(false).optional(),

  // Mental & Emotional Check-In
  current_state_calm: z.boolean().default(false).optional(),
  current_state_nervous: z.boolean().default(false).optional(),
  current_state_overwhelmed: z.boolean().default(false).optional(),
  current_state_stable: z.boolean().default(false).optional(),
  thoughts_of_self_harm: z.boolean().default(false),

  // Client Acknowledgement
  client_signature_data: stringOptional,
  client_signature_date: isoDateOptional,

  // Staff Medical Sign-Off
  reviewed_by: z.string().min(1, 'Reviewed by is required'),
  reviewed_date: z.string().min(1, 'Reviewed date is required'),

  // Tracking
  submitted_by_name: stringOptional,
})

// Admin schema (relaxed for partial updates)
export const medicalIntakeReportAdminSchema = medicalIntakeReportSchema.partial().extend({
  management_id: z.string().uuid(),
  is_completed: z.boolean().optional(),
})

// =============================================================================
// Parkinson's Intake Psychological Report Schema (Neurological Only)
// =============================================================================

export const parkinsonsPsychologicalReportSchema = z.object({
  management_id: z.string().uuid('Invalid management ID'),
  patient_first_name: z.string().min(1, 'First name is required'),
  patient_last_name: z.string().min(1, 'Last name is required'),
  reason_for_coming: z.string().min(1, 'Reason for coming is required'),

  // Mental health ratings (scale 1-10)
  overall_mental_health_rating: z.number().min(1).max(10, 'Rating must be between 1 and 10'),
  daily_stress_management: z.number().min(1).max(10, 'Rating must be between 1 and 10'),
  depression_sadness_severity: z.number().min(1).max(10, 'Rating must be between 1 and 10'),
  expressing_emotions_safety: z.number().min(1).max(10, 'Rating must be between 1 and 10'),
  ibogaine_therapy_preparation: z.number().min(1).max(10, 'Rating must be between 1 and 10'),
  support_system_strength: z.number().min(1).max(10, 'Rating must be between 1 and 10'),
  treatment_outcome_hope: z.number().min(1).max(10, 'Rating must be between 1 and 10'),
  anxiety_nervousness_severity: z.number().min(1).max(10, 'Rating must be between 1 and 10'),
  emotional_numbness_frequency: z.number().min(1).max(10, 'Rating must be between 1 and 10'),
  sleep_quality: z.number().min(1).max(10, 'Rating must be between 1 and 10'),

  // Parkinson's specific ratings (scale 1-10)
  parkinsons_motor_symptoms_severity: z.number().min(1).max(10, 'Rating must be between 1 and 10'),
  stiffness_difficulty_moving_frequency: z.number().min(1).max(10, 'Rating must be between 1 and 10'),
  medication_effectiveness: z.number().min(1).max(10, 'Rating must be between 1 and 10'),
  muscle_spasms_cramps_frequency: z.number().min(1).max(10, 'Rating must be between 1 and 10'),
  non_motor_symptoms_severity: z.number().min(1).max(10, 'Rating must be between 1 and 10'),
  iboga_wellness_team_support: z.number().min(1).max(10, 'Rating must be between 1 and 10'),

  // Signature
  signature_data: stringOptional,
  signature_date: isoDateOptional,
})

export const parkinsonsPsychologicalReportAdminSchema = parkinsonsPsychologicalReportSchema.partial().extend({
  management_id: z.string().uuid(),
  is_completed: z.boolean().optional(),
})

// =============================================================================
// Parkinson's Mortality - Related Scales Schema (Neurological Only)
// =============================================================================

export const parkinsonsMortalityScalesSchema = z.object({
  management_id: z.string().uuid('Invalid management ID'),
  patient_first_name: z.string().min(1, 'First name is required'),
  patient_last_name: z.string().min(1, 'Last name is required'),

  // MDS-UPDRS Part I - Non-motor Experiences of Daily Living
  cognitive_impairment: numberOptional,
  hallucinations_psychosis: numberOptional,
  depressed_mood: numberOptional,
  anxious_mood: numberOptional,
  apathy: numberOptional,
  dopaminergic_dysregulation: numberOptional,
  sleep_problems: numberOptional,
  daytime_sleepiness: numberOptional,
  pain_sensory_complaints: numberOptional,
  urinary_problems: numberOptional,
  constipation: numberOptional,
  lightheadedness: numberOptional,
  fatigue: numberOptional,
  part_i_total_score: z.number().default(0),

  // MDS-UPDRS Part II - Motor Experiences of Daily Living
  speech_part2: numberOptional,
  saliva_drooling: numberOptional,
  chewing_swallowing: numberOptional,
  eating_tasks: numberOptional,
  dressing: numberOptional,
  hygiene: numberOptional,
  handwriting: numberOptional,
  hobbies_activities: numberOptional,
  turning_in_bed: numberOptional,
  tremor_daily_impact: numberOptional,
  getting_out_of_bed: numberOptional,
  walking_balance: numberOptional,
  freezing_of_gait_part2: numberOptional,
  part_ii_total_score: z.number().default(0),

  // MDS-UPDRS Part III - Motor Examination
  speech_part3: numberOptional,
  facial_expression: numberOptional,
  rigidity_neck: numberOptional,
  rigidity_right_upper_limb: numberOptional,
  rigidity_left_upper_limb: numberOptional,
  rigidity_right_lower_limb: numberOptional,
  rigidity_left_lower_limb: numberOptional,
  finger_tapping_right: numberOptional,
  finger_tapping_left: numberOptional,
  hand_movements_right: numberOptional,
  hand_movements_left: numberOptional,
  pronation_supination_right: numberOptional,
  pronation_supination_left: numberOptional,
  toe_tapping_right: numberOptional,
  toe_tapping_left: numberOptional,
  leg_agility_right: numberOptional,
  leg_agility_left: numberOptional,
  arising_from_chair: numberOptional,
  gait: numberOptional,
  freezing_of_gait_part3: numberOptional,
  postural_stability: numberOptional,
  posture: numberOptional,
  global_bradykinesia: numberOptional,
  postural_tremor_right: numberOptional,
  postural_tremor_left: numberOptional,
  kinetic_tremor_right: numberOptional,
  kinetic_tremor_left: numberOptional,
  rest_tremor_right_upper: numberOptional,
  rest_tremor_left_upper: numberOptional,
  rest_tremor_right_lower: numberOptional,
  rest_tremor_left_lower: numberOptional,
  rest_tremor_lip_jaw: numberOptional,
  constancy_of_rest_tremor: numberOptional,
  part_iii_total_score: z.number().default(0),

  // MDS-UPDRS Part IV - Motor Complications
  time_with_dyskinesias: numberOptional,
  impact_of_dyskinesias: numberOptional,
  time_in_off_state: numberOptional,
  impact_of_fluctuations: numberOptional,
  complexity_of_fluctuations: numberOptional,
  painful_off_state_dystonia: numberOptional,
  part_iv_total_score: z.number().default(0),

  // Overall MDS-UPDRS Summary
  mds_updrs_total_score: z.number().default(0),
  administered_by: stringOptional,
  mds_updrs_notes: stringOptional,

  // Hoehn & Yahr Staging
  hoehn_yahr_stage: z.enum(['Stage 1', 'Stage 1.5', 'Stage 2', 'Stage 2.5', 'Stage 3', 'Stage 4', 'Stage 5']).optional().nullable(),

  // Schwab & England Activities of Daily Living
  dressing_score: numberOptional,
  feeding_score: numberOptional,
  ambulation_transfers_score: numberOptional,
  household_tasks_score: numberOptional,
  use_of_appliances_communication_score: numberOptional,
  schwab_england_total_score: z.number().default(0),

  // Parkinson's Disease Composite Mortality Index (PDCMI)
  age_years: numberOptional,
  disease_duration_years: numberOptional,
  dementia: z.enum(['No', 'Possible', 'Confirmed']).optional().nullable(),
  falls_past_6_12_months: z.enum(['None', '1–2', '≥3 / recurrent']).optional().nullable(),
  mds_updrs_part_iii_motor_score: numberOptional,
  risk_classification: z.enum(['Low', 'Moderate', 'High']).optional().nullable(),

  // MDS-PD Clinical Frailty Rating Scale
  weight_loss: numberOptional,
  fatigue_frailty: numberOptional,
  physical_activity: numberOptional,
  strength_gait_speed: numberOptional,
  comorbidities_assistance: numberOptional,
  mds_pd_frailty_total_score: z.number().default(0),

  // File upload - Multiple files support
  scanned_mds_updrs_forms: z.array(z.object({
    url: z.string().url(),
    fileName: z.string(),
    fileType: z.string(),
  })).optional().nullable(),
  scanned_mds_updrs_form_url: stringOptional, // Keep for backward compatibility
})

export const parkinsonsMortalityScalesAdminSchema = parkinsonsMortalityScalesSchema.partial().extend({
  management_id: z.string().uuid(),
  is_completed: z.boolean().optional(),
})

// =============================================================================
// Daily Psychological Update Schema (All Programs)
// =============================================================================

export const dailyPsychologicalUpdateSchema = z.object({
  management_id: z.string().uuid('Invalid management ID'),
  guest_first_name: z.string().min(1, 'First name is required'),
  guest_last_name: z.string().min(1, 'Last name is required'),
  form_date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),

  // 1. Emotional & Cognitive Check-In
  emotional_state_today: z.string().min(1, 'This field is required'),
  emotional_shifts_since_last_report: stringOptional,
  vivid_dreams_resurfacing_memories: stringOptional,
  feeling_connected_to_emotions: stringOptional,
  changes_memory_focus_concentration: stringOptional,
  feeling_present_aware: stringOptional,
  discomfort_side_effects: stringOptional,
  energy_level: z.number().min(1).max(10, 'Energy level must be between 1 and 10'),

  // 2. Parkinson's Patients Only (Motor Function) - Optional for non-neurological
  experiencing_tremors_muscle_stiffness: stringOptional,
  motor_function_details: stringOptional,

  // 3. Staff Observations
  how_guest_looks_physically: z.number().min(1, 'Rating must be at least 1').max(10, 'Rating must be between 1 and 10'),
  how_guest_describes_feeling: z.number().min(1, 'Rating must be at least 1').max(10, 'Rating must be between 1 and 10'),
  additional_notes_observations: stringOptional,
  inspected_by: stringOptional,
})

export const dailyPsychologicalUpdateAdminSchema = dailyPsychologicalUpdateSchema.partial().extend({
  management_id: z.string().uuid(),
  form_date: z.string().min(1),
  is_completed: z.boolean().optional(),
})

// Schema for starting a daily report (just tracking who started it)
export const startDailyPsychologicalUpdateSchema = z.object({
  management_id: z.string().uuid('Invalid management ID'),
  form_date: z.string().min(1, 'Date is required'),
})

// =============================================================================
// Daily Medical Update Schema (All Programs)
// =============================================================================

export const dailyMedicalUpdateSchema = z.object({
  management_id: z.string().uuid('Invalid management ID'),
  patient_first_name: z.string().min(1, 'First name is required'),
  patient_last_name: z.string().min(1, 'Last name is required'),
  form_date: z.string().min(1, 'Date is required'),

  // Checked Vitals
  checked_vitals: z.boolean().default(false),
  checked_blood_pressure: z.boolean().default(false),
  checked_heart_rate: z.boolean().default(false),
  checked_oxygen_saturation: z.boolean().default(false),
  did_they_feel_hungry: stringOptional,
  using_bathroom_normally: stringOptional,
  hydrating: stringOptional,
  experiencing_tremors_motor_function: stringOptional, // Optional for non-neurological
  withdrawal_symptoms: stringOptional,
  how_guest_looks: z.number().min(1).max(10).optional().nullable(),
  energy_level: z.number().min(1).max(10).optional().nullable(),
  how_guest_says_they_feel: stringOptional,

  // Patient Observations (Morning, Afternoon, Night)
  // Client Presence
  morning_client_present: z.boolean().default(true),
  afternoon_client_present: z.boolean().default(true),
  night_client_present: z.boolean().default(true),
  
  // Detailed Vital Signs
  morning_blood_pressure: stringOptional,
  morning_heart_rate: z.number().min(30).max(200).optional().nullable(),
  morning_oxygen_saturation: z.number().min(0).max(100).optional().nullable(),
  morning_vital_signs: stringOptional, // Keep for backward compatibility
  morning_symptoms: stringOptional,
  morning_evolution: stringOptional,
  
  afternoon_blood_pressure: stringOptional,
  afternoon_heart_rate: z.number().min(30).max(200).optional().nullable(),
  afternoon_oxygen_saturation: z.number().min(0).max(100).optional().nullable(),
  afternoon_vital_signs: stringOptional, // Keep for backward compatibility
  afternoon_symptoms: stringOptional,
  afternoon_evolution: stringOptional,
  
  night_blood_pressure: stringOptional,
  night_heart_rate: z.number().min(30).max(200).optional().nullable(),
  night_oxygen_saturation: z.number().min(0).max(100).optional().nullable(),
  night_vital_signs: stringOptional, // Keep for backward compatibility
  night_symptoms: stringOptional,
  night_evolution: stringOptional,

  // Medication & Treatment
  ibogaine_given: z.enum(['yes', 'no']).optional().nullable(),
  ibogaine_doses: z.array(z.object({
    dose: z.number().min(0, 'Dose must be 0 or greater'),
    time: z.string().min(1, 'Time is required'),
  })).optional().nullable(),
  ibogaine_frequency: z.enum(['once', 'twice']).optional().nullable(), // Keep for backward compatibility
  ibogaine_dose: z.number().min(0).optional().nullable(), // Keep for backward compatibility
  ibogaine_time: stringOptional, // Keep for backward compatibility
  ibogaine_dose_time: stringOptional, // Keep for backward compatibility
  medication_schedule: stringOptional,
  solutions_iv_saline_nadh: stringOptional,
  medical_indications: stringOptional,
  additional_observations_notes: stringOptional,

  // File upload - Multiple files support
  vitals_photos: z.array(z.object({
    url: z.string().url(),
    fileName: z.string(),
    fileType: z.string(),
  })).optional().nullable(),
  photo_of_vitals_medical_notes_url: stringOptional, // Keep for backward compatibility

  // Signature
  signature_data: stringOptional,
  signature_date: isoDateOptional,

  // Submission tracking
  submitted_by_name: stringOptional,
  morning_inspected_by: stringOptional,
  afternoon_inspected_by: stringOptional,
  night_inspected_by: stringOptional,
})

export const dailyMedicalUpdateAdminSchema = dailyMedicalUpdateSchema.partial().extend({
  management_id: z.string().uuid(),
  form_date: z.string().min(1),
  is_completed: z.boolean().optional(),
})

// Schema for starting a daily report (just tracking who started it)
export const startDailyMedicalUpdateSchema = z.object({
  management_id: z.string().uuid('Invalid management ID'),
  form_date: z.string().min(1, 'Date is required'),
})

// =============================================================================
// Daily SOWS Schema (Addiction Program Only)
// =============================================================================

export const dailySOWSSchema = z.object({
  management_id: z.string().uuid('Invalid management ID'),
  patient_first_name: z.string().min(1, 'First name is required'),
  patient_last_name: z.string().min(1, 'Last name is required'),
  patient_date_of_birth: isoDateOptional,
  form_date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),

  // SOWS Symptoms (0-4 scale, all optional/nullable for draft saving)
  symptom_1_anxious: z.number().min(0).max(4).optional().nullable(),
  symptom_2_yawning: z.number().min(0).max(4).optional().nullable(),
  symptom_3_perspiring: z.number().min(0).max(4).optional().nullable(),
  symptom_4_eyes_tearing: z.number().min(0).max(4).optional().nullable(),
  symptom_5_nose_running: z.number().min(0).max(4).optional().nullable(),
  symptom_6_goosebumps: z.number().min(0).max(4).optional().nullable(),
  symptom_7_shaking: z.number().min(0).max(4).optional().nullable(),
  symptom_8_hot_flushes: z.number().min(0).max(4).optional().nullable(),
  symptom_9_cold_flushes: z.number().min(0).max(4).optional().nullable(),
  symptom_10_bones_muscles_ache: z.number().min(0).max(4).optional().nullable(),
  symptom_11_restless: z.number().min(0).max(4).optional().nullable(),
  symptom_12_nauseous: z.number().min(0).max(4).optional().nullable(),
  symptom_13_vomiting: z.number().min(0).max(4).optional().nullable(),
  symptom_14_muscles_twitch: z.number().min(0).max(4).optional().nullable(),
  symptom_15_stomach_cramps: z.number().min(0).max(4).optional().nullable(),
  symptom_16_feel_like_using_now: z.number().min(0).max(4).optional().nullable(),

  // Calculated total (will be computed on backend)
  total_score: z.number().min(0).max(64).optional().nullable(),

  // Staff tracking
  reviewed_by: stringOptional,
  submitted_by_name: stringOptional,
})

export const dailySOWSAdminSchema = dailySOWSSchema.partial().extend({
  management_id: z.string().uuid(),
  form_date: z.string().min(1),
  is_completed: z.boolean().optional(),
})

export const startDailySOWSSchema = z.object({
  management_id: z.string().uuid('Invalid management ID'),
  form_date: z.string().min(1, 'Date is required'),
})

// =============================================================================
// Daily OOWS Schema (Addiction Program Only)
// =============================================================================

export const dailyOOWSSchema = z.object({
  management_id: z.string().uuid('Invalid management ID'),
  patient_first_name: z.string().min(1, 'First name is required'),
  patient_last_name: z.string().min(1, 'Last name is required'),
  patient_date_of_birth: isoDateOptional,
  form_date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),

  // OOWS Symptoms (0-1 scale, all optional/nullable for draft saving)
  symptom_1_yawning: z.number().min(0).max(1).optional().nullable(),
  symptom_2_rhinorrhoea: z.number().min(0).max(1).optional().nullable(),
  symptom_3_piloerection: z.number().min(0).max(1).optional().nullable(),
  symptom_4_perspiration: z.number().min(0).max(1).optional().nullable(),
  symptom_5_lacrimation: z.number().min(0).max(1).optional().nullable(),
  symptom_6_tremor: z.number().min(0).max(1).optional().nullable(),
  symptom_7_mydriasis: z.number().min(0).max(1).optional().nullable(),
  symptom_8_hot_cold_flushes: z.number().min(0).max(1).optional().nullable(),
  symptom_9_restlessness: z.number().min(0).max(1).optional().nullable(),
  symptom_10_vomiting: z.number().min(0).max(1).optional().nullable(),
  symptom_11_muscle_twitches: z.number().min(0).max(1).optional().nullable(),
  symptom_12_abdominal_cramps: z.number().min(0).max(1).optional().nullable(),
  symptom_13_anxiety: z.number().min(0).max(1).optional().nullable(),

  // Calculated total (will be computed on backend)
  total_score: z.number().min(0).max(13).optional().nullable(),

  // Staff tracking
  reviewed_by: stringOptional,
  submitted_by_name: stringOptional,
})

export const dailyOOWSAdminSchema = dailyOOWSSchema.partial().extend({
  management_id: z.string().uuid(),
  form_date: z.string().min(1),
  is_completed: z.boolean().optional(),
})

export const startDailyOOWSSchema = z.object({
  management_id: z.string().uuid('Invalid management ID'),
  form_date: z.string().min(1, 'Date is required'),
})

// =============================================================================
// Action Schemas
// =============================================================================

export const getPatientManagementSchema = z.object({
  management_id: z.string().uuid('Invalid management ID'),
})

export const getPatientManagementByPatientIdSchema = z.object({
  patient_id: z.string().uuid('Invalid patient ID'),
})

export const getPatientManagementListSchema = z.object({
  status: z.enum(['active', 'discharged', 'transferred', 'all']).default('all'),
  program_type: z.enum(['neurological', 'mental_health', 'addiction', 'all']).optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
})

export const getDailyFormsByManagementIdSchema = z.object({
  management_id: z.string().uuid('Invalid management ID'),
  form_date: z.string().optional(), // Optional: get specific date or all dates
})

// =============================================================================
// Type Exports
// =============================================================================
export type IntakeReportInput = z.infer<typeof intakeReportSchema>
export type MedicalIntakeReportInput = z.infer<typeof medicalIntakeReportSchema>
export type ParkinsonsPsychologicalReportInput = z.infer<typeof parkinsonsPsychologicalReportSchema>
export type ParkinsonsMortalityScalesInput = z.infer<typeof parkinsonsMortalityScalesSchema>
export type DailyPsychologicalUpdateInput = z.infer<typeof dailyPsychologicalUpdateSchema>
export type DailyMedicalUpdateInput = z.infer<typeof dailyMedicalUpdateSchema>
export type DailySOWSInput = z.infer<typeof dailySOWSSchema>
export type DailyOOWSInput = z.infer<typeof dailyOOWSSchema>
