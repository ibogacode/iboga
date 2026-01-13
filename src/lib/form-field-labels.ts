// Field name to human-readable question label mappings for all forms

export const formFieldLabels: Record<string, Record<string, string>> = {
  // Daily Psychological Update
  patient_management_daily_psychological_updates: {
    emotional_state_today: 'How are they emotionally today?',
    emotional_shifts_since_last_report: 'Any emotional shifts since last report?',
    vivid_dreams_resurfacing_memories: 'Have they experienced vivid dreams or resurfacing memories?',
    feeling_connected_to_emotions: 'Are they feeling more connected to their emotions?',
    changes_memory_focus_concentration: 'Any changes in memory, focus, or concentration?',
    feeling_present_aware: 'Do they feel more present and aware than before treatment?',
    discomfort_side_effects: 'Any discomfort or side effects reported?',
    energy_level: 'Energy level (1–10)',
    experiencing_tremors_muscle_stiffness: 'Are they experiencing tremors or muscle stiffness?',
    motor_function_details: 'Motor function details',
    how_guest_looks_physically: 'How does the guest look physically? (1–10)',
    how_guest_describes_feeling: 'How does the guest describe feeling? (1–10)',
    additional_notes_observations: 'Additional notes and observations',
    inspected_by: 'Inspected by',
    time: 'Time',
  },

  // Daily Medical Update
  patient_management_daily_medical_updates: {
    checked_vitals: 'Checked vitals',
    checked_blood_pressure: 'Checked blood pressure',
    checked_heart_rate: 'Checked heart rate',
    checked_oxygen_saturation: 'Checked oxygen saturation',
    did_they_feel_hungry: 'Did they feel hungry?',
    using_bathroom_normally: 'Using bathroom normally?',
    hydrating: 'Hydrating?',
    experiencing_tremors_motor_function: 'Experiencing tremors or motor function issues?',
    withdrawal_symptoms: 'Withdrawal symptoms',
    how_guest_looks: 'How does the guest look? (1–10)',
    energy_level: 'Energy level (1–10)',
    how_guest_says_they_feel: 'How does the guest say they feel?',
    morning_client_present: 'Morning: Client present?',
    morning_blood_pressure: 'Morning: Blood pressure',
    morning_heart_rate: 'Morning: Heart rate',
    morning_oxygen_saturation: 'Morning: Oxygen saturation',
    morning_vital_signs: 'Morning: Vital signs',
    morning_symptoms: 'Morning: Symptoms',
    morning_evolution: 'Morning: Evolution',
    afternoon_client_present: 'Afternoon: Client present?',
    afternoon_blood_pressure: 'Afternoon: Blood pressure',
    afternoon_heart_rate: 'Afternoon: Heart rate',
    afternoon_oxygen_saturation: 'Afternoon: Oxygen saturation',
    afternoon_vital_signs: 'Afternoon: Vital signs',
    afternoon_symptoms: 'Afternoon: Symptoms',
    afternoon_evolution: 'Afternoon: Evolution',
    night_client_present: 'Night: Client present?',
    night_blood_pressure: 'Night: Blood pressure',
    night_heart_rate: 'Night: Heart rate',
    night_oxygen_saturation: 'Night: Oxygen saturation',
    night_vital_signs: 'Night: Vital signs',
    night_symptoms: 'Night: Symptoms',
    night_evolution: 'Night: Evolution',
    ibogaine_given: 'Was ibogaine given to the patient?',
    ibogaine_doses: 'Ibogaine doses',
    ibogaine_dose: 'Ibogaine dose',
    ibogaine_time: 'Ibogaine time',
    ibogaine_dose_time: 'Ibogaine dose time',
    ibogaine_frequency: 'Ibogaine frequency',
    medications: 'Medications',
    submitted_by_name: 'Submitted by',
  },

  // Daily SOWS
  patient_management_daily_sows: {
    symptom_1_anxious: 'I feel anxious',
    symptom_2_yawning: 'I feel like yawning',
    symptom_3_perspiring: 'I am perspiring',
    symptom_4_eyes_tearing: 'My eyes are tearing',
    symptom_5_nose_running: 'My nose is running',
    symptom_6_goosebumps: 'I have goosebumps',
    symptom_7_shaking: 'I am shaking',
    symptom_8_hot_flushes: 'I have hot flushes',
    symptom_9_cold_flushes: 'I have cold flushes',
    symptom_10_bones_muscles_ache: 'My bones and muscles ache',
    symptom_11_restless: 'I feel restless',
    symptom_12_nauseous: 'I feel nauseous',
    symptom_13_vomiting: 'I feel like vomiting',
    symptom_14_muscles_twitch: 'My muscles twitch',
    symptom_15_stomach_cramps: 'I have stomach cramps',
    symptom_16_feel_like_using_now: 'I feel like using now',
    total_score: 'Total score',
    reviewed_by: 'Reviewed by',
    submitted_by_name: 'Submitted by',
    time: 'Time',
  },

  // Daily OOWS
  patient_management_daily_oows: {
    symptom_1_yawning: 'Yawning',
    symptom_2_rhinorrhoea: 'Rhinorrhoea',
    symptom_3_piloerection: 'Piloerection (observe arm)',
    symptom_4_perspiration: 'Perspiration',
    symptom_5_lacrimation: 'Lacrimation',
    symptom_6_tremor: 'Tremor (hands)',
    symptom_7_mydriasis: 'Mydriasis',
    symptom_8_hot_cold_flushes: 'Hot and cold flushes',
    symptom_9_restlessness: 'Restlessness',
    symptom_10_vomiting: 'Vomiting',
    symptom_11_muscle_twitches: 'Muscle twitches',
    symptom_12_abdominal_cramps: 'Abdominal cramps',
    symptom_13_anxiety: 'Anxiety',
    total_score: 'Total score',
    reviewed_by: 'Reviewed by',
    submitted_by_name: 'Submitted by',
    time: 'Time',
  },

  // Intake Report
  patient_management_intake_reports: {
    date: 'Date',
    time_of_intake: 'Time of intake',
    emotional_state_today: 'How are you emotionally today?',
    emotional_themes_memories: 'Are there any emotional themes or memories currently present for you?',
    emotionally_connected: 'Do you feel emotionally connected or disconnected from yourself?',
    mental_clarity: 'How would you describe your mental clarity?',
    recurring_thoughts_dreams: 'Have you noticed any recurring thoughts, dreams, or resurfacing memories?',
    present_aware: 'Do you feel more present and aware than usual?',
    energy_level: 'Energy level (1–10)',
    sleep_appetite_digestion: 'Have you noticed any changes in sleep, appetite, digestion, or hydration?',
    physical_sensations_emotions: 'Are there any physical sensations connected to your emotions today?',
    psychologically_ready: 'Do you feel psychologically ready to begin this process?',
    emotionally_physically_safe: 'Do you feel emotionally and physically safe to begin this process?',
    team_awareness: 'Is there anything you would like the team to be aware of before beginning treatment?',
  },

  // Medical Intake Report
  patient_management_medical_intake_reports: {
    name: 'Name',
    date_of_birth: 'Date of birth',
    arrival_date: 'Arrival date',
    changes_since_medical_clearance: 'Changes since medical clearance?',
    changes_medications: 'Changes: Medications',
    changes_substance_use: 'Changes: Substance use',
    changes_hospitalization: 'Changes: Hospitalization',
    changes_new_symptoms: 'Changes: New symptoms',
    changes_other: 'Changes: Other',
    last_substance_use_datetime: 'Last substance use date/time',
    current_medications: 'Current medications',
    allergies: 'Allergies',
    medical_history: 'Medical history',
    current_symptoms: 'Current symptoms',
    vital_signs: 'Vital signs',
    physical_examination: 'Physical examination',
    assessment: 'Assessment',
    plan: 'Plan',
    provider_signature: 'Provider signature',
    provider_signature_name: 'Provider signature name',
    provider_signature_date: 'Provider signature date',
  },

  // Parkinson's Psychological Report
  patient_management_parkinsons_psychological_reports: {
    reason_for_coming: 'Reason for coming (Please refer to Prescreen)',
    overall_mental_health_rating: 'Overall mental health rating (1–10)',
    daily_stress_management: 'How well do you manage daily stress? (1–10)',
    depression_sadness_severity: 'How severe are your symptoms of depression or sadness? (1–10)',
    expressing_emotions_safety: 'How safe do you feel expressing your emotions? (1–10)',
    treatment_outcome_hope: 'How hopeful are you about treatment outcomes? (1–10)',
    anxiety_nervousness_severity: 'How severe is your anxiety or nervousness? (1–10)',
    emotional_numbness_frequency: 'How often do you experience emotional numbness? (1–10)',
    sleep_quality: 'How would you rate your sleep quality? (1–10)',
    parkinsons_motor_symptoms_severity: 'How severe are your Parkinson\'s motor symptoms? (1–10)',
    stiffness_difficulty_moving_frequency: 'How often do you experience stiffness or difficulty moving? (1–10)',
    medication_effectiveness: 'How effective do you feel your medications are? (1–10)',
    muscle_spasms_cramps_frequency: 'How often do you experience muscle spasms or cramps? (1–10)',
    non_motor_symptoms_severity: 'How severe are your non-motor symptoms? (1–10)',
    iboga_wellness_team_support: 'How supported do you feel by the Iboga Wellness team? (1–10)',
  },

  // Parkinson's Mortality Scales
  patient_management_parkinsons_mortality_scales: {
    hoehn_yahr_stage: 'Hoehn & Yahr Stage',
    mds_updrs_part_i_mental: 'MDS-UPDRS Part I: Mental',
    mds_updrs_part_i_behavior: 'MDS-UPDRS Part I: Behavior',
    mds_updrs_part_i_mood: 'MDS-UPDRS Part I: Mood',
    mds_updrs_part_i_apathy: 'MDS-UPDRS Part I: Apathy',
    mds_updrs_part_i_anxiety: 'MDS-UPDRS Part I: Anxiety',
    mds_updrs_part_i_delusions: 'MDS-UPDRS Part I: Delusions',
    mds_updrs_part_i_hallucinations: 'MDS-UPDRS Part I: Hallucinations',
    mds_updrs_part_i_dopamine_dysregulation: 'MDS-UPDRS Part I: Dopamine dysregulation',
    mds_updrs_part_i_sleep: 'MDS-UPDRS Part I: Sleep',
    mds_updrs_part_i_daytime_sleepiness: 'MDS-UPDRS Part I: Daytime sleepiness',
    mds_updrs_part_i_pain: 'MDS-UPDRS Part I: Pain',
    mds_updrs_part_i_urinary: 'MDS-UPDRS Part I: Urinary',
    mds_updrs_part_i_constipation: 'MDS-UPDRS Part I: Constipation',
    mds_updrs_part_i_lightheadedness: 'MDS-UPDRS Part I: Lightheadedness',
    mds_updrs_part_i_fatigue: 'MDS-UPDRS Part I: Fatigue',
    part_i_total_score: 'Part I Total Score',
    mds_updrs_part_ii_speech: 'MDS-UPDRS Part II: Speech',
    mds_updrs_part_ii_salivation: 'MDS-UPDRS Part II: Salivation',
    mds_updrs_part_ii_chewing: 'MDS-UPDRS Part II: Chewing',
    mds_updrs_part_ii_eating: 'MDS-UPDRS Part II: Eating',
    mds_updrs_part_ii_dressing: 'MDS-UPDRS Part II: Dressing',
    mds_updrs_part_ii_hygiene: 'MDS-UPDRS Part II: Hygiene',
    mds_updrs_part_ii_handwriting: 'MDS-UPDRS Part II: Handwriting',
    mds_updrs_part_ii_doing_hobbies: 'MDS-UPDRS Part II: Doing hobbies',
    mds_updrs_part_ii_turning_in_bed: 'MDS-UPDRS Part II: Turning in bed',
    mds_updrs_part_ii_tremor: 'MDS-UPDRS Part II: Tremor',
    mds_updrs_part_ii_getting_out_of_bed: 'MDS-UPDRS Part II: Getting out of bed',
    mds_updrs_part_ii_walking: 'MDS-UPDRS Part II: Walking',
    mds_updrs_part_ii_freezing: 'MDS-UPDRS Part II: Freezing',
    part_ii_total_score: 'Part II Total Score',
    mds_updrs_part_iii_speech: 'MDS-UPDRS Part III: Speech',
    mds_updrs_part_iii_facial_expression: 'MDS-UPDRS Part III: Facial expression',
    mds_updrs_part_iii_rigidity_neck: 'MDS-UPDRS Part III: Rigidity (neck)',
    mds_updrs_part_iii_rigidity_right_upper: 'MDS-UPDRS Part III: Rigidity (right upper)',
    mds_updrs_part_iii_rigidity_left_upper: 'MDS-UPDRS Part III: Rigidity (left upper)',
    mds_updrs_part_iii_rigidity_right_lower: 'MDS-UPDRS Part III: Rigidity (right lower)',
    mds_updrs_part_iii_rigidity_left_lower: 'MDS-UPDRS Part III: Rigidity (left lower)',
    mds_updrs_part_iii_finger_tapping_right: 'MDS-UPDRS Part III: Finger tapping (right)',
    mds_updrs_part_iii_finger_tapping_left: 'MDS-UPDRS Part III: Finger tapping (left)',
    mds_updrs_part_iii_hand_movements_right: 'MDS-UPDRS Part III: Hand movements (right)',
    mds_updrs_part_iii_hand_movements_left: 'MDS-UPDRS Part III: Hand movements (left)',
    mds_updrs_part_iii_pronation_supination_right: 'MDS-UPDRS Part III: Pronation-supination (right)',
    mds_updrs_part_iii_pronation_supination_left: 'MDS-UPDRS Part III: Pronation-supination (left)',
    mds_updrs_part_iii_toe_tapping_right: 'MDS-UPDRS Part III: Toe tapping (right)',
    mds_updrs_part_iii_toe_tapping_left: 'MDS-UPDRS Part III: Toe tapping (left)',
    mds_updrs_part_iii_leg_agility_right: 'MDS-UPDRS Part III: Leg agility (right)',
    mds_updrs_part_iii_leg_agility_left: 'MDS-UPDRS Part III: Leg agility (left)',
    mds_updrs_part_iii_arising_from_chair: 'MDS-UPDRS Part III: Arising from chair',
    mds_updrs_part_iii_gait: 'MDS-UPDRS Part III: Gait',
    mds_updrs_part_iii_freezing_of_gait: 'MDS-UPDRS Part III: Freezing of gait',
    mds_updrs_part_iii_postural_stability: 'MDS-UPDRS Part III: Postural stability',
    mds_updrs_part_iii_posture: 'MDS-UPDRS Part III: Posture',
    mds_updrs_part_iii_body_bradykinesia: 'MDS-UPDRS Part III: Body bradykinesia',
    part_iii_total_score: 'Part III Total Score',
    mds_updrs_part_iv_time_with_dyskinesias: 'MDS-UPDRS Part IV: Time with dyskinesias',
    mds_updrs_part_iv_functional_impact_dyskinesias: 'MDS-UPDRS Part IV: Functional impact of dyskinesias',
    mds_updrs_part_iv_time_with_off_periods: 'MDS-UPDRS Part IV: Time with off periods',
    mds_updrs_part_iv_functional_impact_off: 'MDS-UPDRS Part IV: Functional impact of off periods',
    mds_updrs_part_iv_complexity_motor_fluctuations: 'MDS-UPDRS Part IV: Complexity of motor fluctuations',
    part_iv_total_score: 'Part IV Total Score',
    mds_updrs_total_score: 'MDS-UPDRS Total Score',
    schwab_england_activities_daily_living: 'Schwab & England: Activities of daily living',
    schwab_england_total_score: 'Schwab & England Total Score',
    mds_pd_frailty_scale_mobility: 'MDS PD Frailty Scale: Mobility',
    mds_pd_frailty_scale_balance: 'MDS PD Frailty Scale: Balance',
    mds_pd_frailty_scale_strength: 'MDS PD Frailty Scale: Strength',
    mds_pd_frailty_scale_endurance: 'MDS PD Frailty Scale: Endurance',
    mds_pd_frailty_scale_physical_activity: 'MDS PD Frailty Scale: Physical activity',
    mds_pd_frailty_total_score: 'MDS PD Frailty Total Score',
  },
}

// Helper function to get field label
export function getFieldLabel(formTable: string, fieldName: string): string {
  const tableLabels = formFieldLabels[formTable]
  if (tableLabels && tableLabels[fieldName]) {
    return tableLabels[fieldName]
  }
  // Fallback: convert snake_case to Title Case
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Helper function to format field value for display
export function formatFieldValue(fieldName: string, value: string | null): string {
  if (!value || value === 'null' || value === '') {
    return '(empty)'
  }

  // Handle boolean values
  if (value === 'true') return 'Yes'
  if (value === 'false') return 'No'

  // Handle JSON arrays (like ibogaine_doses)
  if (value.startsWith('[') && value.endsWith(']')) {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) return '(none)'
        return parsed.map((item, idx) => {
          if (typeof item === 'object' && item !== null) {
            return `Dose ${idx + 1}: ${item.dose || 'N/A'}mg at ${item.time || 'N/A'}`
          }
          return String(item)
        }).join(', ')
      }
    } catch {
      // If parsing fails, return as-is
    }
  }

  // Handle numeric values (ratings, scores)
  if (/^\d+$/.test(value)) {
    const num = parseInt(value, 10)
    // If it's a rating scale (1-10), add context
    if (num >= 1 && num <= 10 && (fieldName.includes('rating') || fieldName.includes('level') || fieldName.includes('looks') || fieldName.includes('feeling'))) {
      return `${value} / 10`
    }
  }

  return value
}
