/**
 * Research module constants: symptom labels, colors, thresholds.
 */

export const PROGRAM_TYPES = ['neurological', 'mental_health', 'addiction'] as const
export type ProgramType = (typeof PROGRAM_TYPES)[number]

export const PROGRAM_LABELS: Record<ProgramType, string> = {
  neurological: 'Neurological',
  mental_health: 'Mental Health',
  addiction: 'Addiction',
}

export const PROGRAM_TYPE_COLORS: Record<string, string> = {
  neurological: '#a855f7',
  mental_health: '#60a5fa',
  addiction: '#10b981',
}

export const PROGRAM_TYPE_LABELS: Record<string, string> = {
  neurological: 'Neurological',
  mental_health: 'Mental Health',
  addiction: 'Addiction',
}

export const PATIENT_STATUSES = ['active', 'discharged', 'transferred'] as const
export type PatientStatus = (typeof PATIENT_STATUSES)[number]

export const SOWS_SYMPTOM_NAMES: Record<number, string> = {
  1: 'Anxious',
  2: 'Yawning',
  3: 'Perspiring',
  4: 'Eyes Tearing',
  5: 'Nose Running',
  6: 'Goosebumps',
  7: 'Shaking',
  8: 'Hot Flushes',
  9: 'Cold Flushes',
  10: 'Bones/Muscle Ache',
  11: 'Restless',
  12: 'Nauseous',
  13: 'Vomiting',
  14: 'Muscles Twitch',
  15: 'Stomach Cramps',
  16: 'Feel Like Using',
}

export const SOWS_SYMPTOM_LABELS: Record<number, string> = {
  1: 'Anxious',
  2: 'Yawning',
  3: 'Perspiring',
  4: 'Eyes Tearing',
  5: 'Nose Running',
  6: 'Goosebumps',
  7: 'Shaking',
  8: 'Hot Flushes',
  9: 'Cold Flushes',
  10: 'Bones/Muscle Ache',
  11: 'Restless',
  12: 'Nauseous',
  13: 'Vomiting',
  14: 'Muscles Twitch',
  15: 'Stomach Cramps',
  16: 'Feel Like Using',
}

export const OOWS_SYMPTOM_LABELS: Record<number, string> = {
  1: 'Yawning',
  2: 'Rhinorrhoea',
  3: 'Piloerection',
  4: 'Perspiration',
  5: 'Lacrimation',
  6: 'Tremor',
  7: 'Mydriasis',
  8: 'Hot/Cold Flushes',
  9: 'Restlessness',
  10: 'Vomiting',
  11: 'Muscle Twitches',
  12: 'Abdominal Cramps',
  13: 'Anxiety',
}

export const SOWS_SEVERITY_LABELS: Record<string, string> = {
  mild: '0-10: Mild',
  moderate: '11-20: Moderate',
  significant: '21-36: Significant',
  severe: '36+: Severe',
}

export function getSOWSSeverityLabel(score: number): string {
  if (score <= 10) return 'Mild'
  if (score <= 20) return 'Moderate'
  if (score <= 36) return 'Significant'
  return 'Severe'
}

export function getOOWSSeverityLabel(score: number): string {
  if (score <= OOWS_THRESHOLDS.mild) return 'Mild'
  if (score <= OOWS_THRESHOLDS.moderate) return 'Moderate'
  if (score <= OOWS_THRESHOLDS.severe) return 'Severe'
  return 'Very Severe'
}

export const HEATMAP_COLOR_SCALE = [
  { max: 0.5, bg: 'bg-gray-800', label: 'None' },
  { max: 1.5, bg: 'bg-amber-900', label: 'Mild' },
  { max: 2.5, bg: 'bg-amber-600', label: 'Moderate' },
  { max: 3.5, bg: 'bg-orange-500', label: 'Significant' },
  { max: 4.0, bg: 'bg-red-500', label: 'Severe' },
]

export const OOWS_HEATMAP_COLOR_SCALE = [
  { max: 0.25, bg: 'bg-gray-800', label: 'None' },
  { max: 0.5, bg: 'bg-amber-900', label: 'Mild' },
  { max: 0.75, bg: 'bg-orange-500', label: 'Moderate' },
  { max: 1.0, bg: 'bg-red-500', label: 'Present' },
]

export const CHART_COLORS = {
  neurological: '#a855f7',
  mental_health: '#60a5fa',
  addiction: '#10b981',
} as const

export const SOWS_THRESHOLDS = {
  mild: 10,
  moderate: 20,
  significant: 36,
  max: 64,
}

export const OOWS_THRESHOLDS = {
  mild: 3,
  moderate: 7,
  severe: 10,
  max: 13,
}

export const RISK_COLORS: Record<string, string> = {
  Low: 'emerald',
  Moderate: 'amber',
  High: 'red',
}

export const PSYCH_RATING_MAP: Record<string, number> = {
  'Very Low': 1,
  'None': 1,
  'Never': 1,
  'Low': 2,
  'Rarely': 2,
  'Moderate': 3,
  'Sometimes': 3,
  'High': 4,
  'Often': 4,
  'Very High': 5,
  'Always': 5,
  'Severe': 5,
}

export const PSYCH_REPORT_FIELDS = [
  { key: 'overall_mental_health_rating', label: 'Overall Mental Health', higherIsBetter: true },
  { key: 'daily_stress_management', label: 'Stress Management', higherIsBetter: true },
  { key: 'depression_sadness_severity', label: 'Depression/Sadness', higherIsBetter: false },
  { key: 'anxiety_nervousness_severity', label: 'Anxiety/Nervousness', higherIsBetter: false },
  { key: 'sleep_quality', label: 'Sleep Quality', higherIsBetter: true },
  { key: 'emotional_numbness_frequency', label: 'Emotional Numbness', higherIsBetter: false },
  { key: 'parkinsons_motor_symptoms_severity', label: 'Motor Symptoms', higherIsBetter: false },
  { key: 'non_motor_symptoms_severity', label: 'Non-Motor Symptoms', higherIsBetter: false },
  { key: 'treatment_outcome_hope', label: 'Treatment Hope', higherIsBetter: true },
]

export const MDS_UPDRS_PARTS = [
  { key: 'part_i_total_score', label: 'Part I\nNon-Motor Daily', max: 52 },
  { key: 'part_ii_total_score', label: 'Part II\nMotor Daily', max: 52 },
  { key: 'part_iii_total_score', label: 'Part III\nMotor Exam', max: 132 },
  { key: 'part_iv_total_score', label: 'Part IV\nComplications', max: 24 },
]

export const MOTOR_SCORE_BINS = [
  { label: '0–20', min: 0, max: 20, description: 'Minimal' },
  { label: '21–40', min: 21, max: 40, description: 'Mild' },
  { label: '41–60', min: 41, max: 60, description: 'Moderate' },
  { label: '61–80', min: 61, max: 80, description: 'Moderately Severe' },
  { label: '81–100', min: 81, max: 100, description: 'Severe' },
  { label: '100+', min: 101, max: 999, description: 'Very Severe' },
]

export const DATA_COMPLETENESS_TABLES: Record<string, string> = {
  withdrawal: 'withdrawal check-in data',
  parkinsons: "Parkinson's assessment data",
  dosing: 'dosing and vitals',
  operational: 'onboarding records',
}

/** Known medication, supplement, and solution terms (lowercase) for dosing mention classification */
export const MEDICATION_SOLUTION_TERMS = new Set([
  'saline', 'nadh', 'iv', 'magnesium', 'clonidine', 'gabapentin', 'ondansetron', 'zofran',
  'lorazepam', 'ativan', 'diazepam', 'valium', 'clonazepam', 'klonopin', 'alprazolam', 'xanax',
  'buprenorphine', 'suboxone', 'methadone', 'naloxone', 'naltrexone', 'subutex',
  'acetaminophen', 'tylenol', 'ibuprofen', 'motrin', 'naproxen', 'aleve',
  'omeprazole', 'prilosec', 'pantoprazole', 'protonix', 'famotidine', 'pepcid',
  'tramadol', 'hydrocodone', 'oxycodone', 'morphine', 'fentanyl', 'codeine',
  'melatonin', 'trazodone', 'diphenhydramine', 'benadryl', 'hydroxyzine', 'vistaril',
  'propranolol', 'atenolol', 'metoprolol', 'labetalol', 'amlodipine', 'lisinopril',
  'vitamin', 'vitamins', 'b12', 'b6', 'thiamine', 'folate', 'folic', 'iron', 'zinc',
  'glutathione', 'nac', 'glutamine', 'electrolytes', 'dextrose', 'lactated', 'ringer',
  'ketamine', 'ibogaine', 'fluids', 'd5w', 'ns', 'lr', 'd5', 'normal', 'lactated',
  'supplement', 'supplements', 'capsule', 'tablet', 'mg', 'ml', 'oral', 'ivf',
  'zolpidem', 'glicinate', 'glycinate', 'ampoule', 'taurate', 'metoclopramide', 'losartan',
])

/** Common English and dosing-context words to exclude from "other" mentions (lowercase) */
export const MEDICATION_STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'this', 'that', 'have', 'has', 'had',
  'not', 'but', 'are', 'was', 'were', 'been', 'being', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'can', 'all', 'each', 'every', 'both',
  'few', 'more', 'most', 'other', 'some', 'such', 'than', 'then', 'when',
  'where', 'which', 'while', 'after', 'before', 'during', 'none', 'daily',
  'morning', 'afternoon', 'evening', 'night', 'bedtime', 'prn', 'as', 'needed',
  'patient', 'client', 'given', 'received', 'continued', 'held', 'discontinued',
  'yes', 'no', 'none', 'n/a', 'na', 'unknown', 'other', 'see', 'notes', 'comment',
])

/** Plain-language labels for Research UI (no jargon) */
export const RESEARCH_PLAIN = {
  overview: {
    sectionTitle: 'At a glance',
    totalTreated: 'Total clients',
    activePatients: 'In program now',
    avgStay: 'Average stay',
    days: 'days',
    completionRate: 'Finished program',
    completionGood: 'Good',
    completionFair: 'Fair',
    completionLow: 'Low',
    medicalClearance: 'Medically cleared',
    admissionsChart: 'New clients over time',
    admissionsChartSub: 'By month and program',
    outcomesTable: 'How clients did',
    outcomesTableSub: 'By program type',
    recentActivity: 'Latest activity',
  },
  withdrawal: {
    sectionTitle: 'Detox at a glance',
    selfReportScore: 'How clients said they felt',
    selfReportScale: 'scale 0–64 (higher = worse)',
    staffObservedScore: 'What staff observed',
    staffObservedScale: 'scale 0–13',
    daysFeelingBetter: 'Days until feeling better',
    daysFeelingBetterSub: 'when self-report first dropped below 10',
    severeCases: 'Clients with severe withdrawal',
    severeCasesSub: 'when self-report peaked above 36',
    chartTitle: 'How withdrawal changes day by day',
    selfReport: 'Self-report',
    staffObserved: 'Staff-observed',
    heatmapTitle: 'Which symptoms, which days',
    heatmapSub: 'First 2 weeks of stay',
    bySubstanceTitle: 'Withdrawal by primary substance',
    bySubstanceSub: 'How intense withdrawal was by substance type',
    lookupTitle: 'Compare one client to the average',
    lookupSub: 'Pick a client to see their scores next to the group average',
    peakSelfReport: 'Peak self-report',
    peakObserved: 'Peak observed',
    severePct: '% severe',
    noData: 'No withdrawal check-ins in this period',
  },
}

export const RESEARCH_ALLOWED_ROLES = ['owner', 'admin', 'manager', 'doctor', 'psych'] as const

export const DATE_RANGE_PRESETS = [
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '180', label: 'Last 6 months' },
  { value: '365', label: 'Last 12 months' },
  { value: 'all', label: 'All time' },
] as const

export const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'withdrawal', label: 'Withdrawal & Detox' },
  { value: 'parkinsons', label: "Parkinson's Program" },
  { value: 'dosing', label: 'Treatment & Dosing' },
  { value: 'operational', label: 'Operational' },
] as const

export type ResearchTab = (typeof TABS)[number]['value']
