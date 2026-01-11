-- =============================================================================
-- Daily Forms for Addiction Program Only
-- =============================================================================
-- 1. Subjective Opiate Withdrawal Scale (SOWS)
-- 2. Objective Opioid Withdrawal Scale (OOWS)
-- =============================================================================

BEGIN;

-- =============================================================================
-- PART 1: Subjective Opiate Withdrawal Scale (SOWS) - Addiction Only
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.patient_management_daily_sows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  management_id UUID NOT NULL REFERENCES public.patient_management(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Patient Info
  patient_first_name TEXT NOT NULL,
  patient_last_name TEXT NOT NULL,
  patient_date_of_birth DATE,
  form_date DATE NOT NULL,
  time TEXT NOT NULL, -- HH:MM format (EST)

  -- SOWS Symptoms (0-4 scale)
  symptom_1_anxious INTEGER CHECK (symptom_1_anxious >= 0 AND symptom_1_anxious <= 4),
  symptom_2_yawning INTEGER CHECK (symptom_2_yawning >= 0 AND symptom_2_yawning <= 4),
  symptom_3_perspiring INTEGER CHECK (symptom_3_perspiring >= 0 AND symptom_3_perspiring <= 4),
  symptom_4_eyes_tearing INTEGER CHECK (symptom_4_eyes_tearing >= 0 AND symptom_4_eyes_tearing <= 4),
  symptom_5_nose_running INTEGER CHECK (symptom_5_nose_running >= 0 AND symptom_5_nose_running <= 4),
  symptom_6_goosebumps INTEGER CHECK (symptom_6_goosebumps >= 0 AND symptom_6_goosebumps <= 4),
  symptom_7_shaking INTEGER CHECK (symptom_7_shaking >= 0 AND symptom_7_shaking <= 4),
  symptom_8_hot_flushes INTEGER CHECK (symptom_8_hot_flushes >= 0 AND symptom_8_hot_flushes <= 4),
  symptom_9_cold_flushes INTEGER CHECK (symptom_9_cold_flushes >= 0 AND symptom_9_cold_flushes <= 4),
  symptom_10_bones_muscles_ache INTEGER CHECK (symptom_10_bones_muscles_ache >= 0 AND symptom_10_bones_muscles_ache <= 4),
  symptom_11_restless INTEGER CHECK (symptom_11_restless >= 0 AND symptom_11_restless <= 4),
  symptom_12_nauseous INTEGER CHECK (symptom_12_nauseous >= 0 AND symptom_12_nauseous <= 4),
  symptom_13_vomiting INTEGER CHECK (symptom_13_vomiting >= 0 AND symptom_13_vomiting <= 4),
  symptom_14_muscles_twitch INTEGER CHECK (symptom_14_muscles_twitch >= 0 AND symptom_14_muscles_twitch <= 4),
  symptom_15_stomach_cramps INTEGER CHECK (symptom_15_stomach_cramps >= 0 AND symptom_15_stomach_cramps <= 4),
  symptom_16_feel_like_using_now INTEGER CHECK (symptom_16_feel_like_using_now >= 0 AND symptom_16_feel_like_using_now <= 4),

  -- Calculated Total Score
  total_score INTEGER DEFAULT 0 CHECK (total_score >= 0 AND total_score <= 64),

  -- Staff Tracking
  reviewed_by TEXT,
  submitted_by_name TEXT,
  submitted_at TIMESTAMPTZ,

  -- Standard tracking fields
  started_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  filled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(management_id, form_date)
);

-- Add comments
COMMENT ON TABLE public.patient_management_daily_sows IS 'Subjective Opiate Withdrawal Scale - Daily form for addiction program patients only';
COMMENT ON COLUMN public.patient_management_daily_sows.total_score IS 'Total SOWS score (0-64). Mild: 1-10, Moderate: 11-20, Severe: 21-30';
COMMENT ON COLUMN public.patient_management_daily_sows.reviewed_by IS 'Name of staff member who reviewed the form';
COMMENT ON COLUMN public.patient_management_daily_sows.submitted_by_name IS 'Name of staff member who submitted the form';

-- =============================================================================
-- PART 2: Objective Opioid Withdrawal Scale (OOWS) - Addiction Only
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.patient_management_daily_oows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  management_id UUID NOT NULL REFERENCES public.patient_management(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Patient Info
  patient_first_name TEXT NOT NULL,
  patient_last_name TEXT NOT NULL,
  patient_date_of_birth DATE,
  form_date DATE NOT NULL,
  time TEXT NOT NULL, -- HH:MM format (EST)

  -- OOWS Symptoms (0-1 scale)
  symptom_1_yawning INTEGER CHECK (symptom_1_yawning >= 0 AND symptom_1_yawning <= 1),
  symptom_2_rhinorrhoea INTEGER CHECK (symptom_2_rhinorrhoea >= 0 AND symptom_2_rhinorrhoea <= 1),
  symptom_3_piloerection INTEGER CHECK (symptom_3_piloerection >= 0 AND symptom_3_piloerection <= 1),
  symptom_4_perspiration INTEGER CHECK (symptom_4_perspiration >= 0 AND symptom_4_perspiration <= 1),
  symptom_5_lacrimation INTEGER CHECK (symptom_5_lacrimation >= 0 AND symptom_5_lacrimation <= 1),
  symptom_6_tremor INTEGER CHECK (symptom_6_tremor >= 0 AND symptom_6_tremor <= 1),
  symptom_7_mydriasis INTEGER CHECK (symptom_7_mydriasis >= 0 AND symptom_7_mydriasis <= 1),
  symptom_8_hot_cold_flushes INTEGER CHECK (symptom_8_hot_cold_flushes >= 0 AND symptom_8_hot_cold_flushes <= 1),
  symptom_9_restlessness INTEGER CHECK (symptom_9_restlessness >= 0 AND symptom_9_restlessness <= 1),
  symptom_10_vomiting INTEGER CHECK (symptom_10_vomiting >= 0 AND symptom_10_vomiting <= 1),
  symptom_11_muscle_twitches INTEGER CHECK (symptom_11_muscle_twitches >= 0 AND symptom_11_muscle_twitches <= 1),
  symptom_12_abdominal_cramps INTEGER CHECK (symptom_12_abdominal_cramps >= 0 AND symptom_12_abdominal_cramps <= 1),
  symptom_13_anxiety INTEGER CHECK (symptom_13_anxiety >= 0 AND symptom_13_anxiety <= 1),

  -- Calculated Total Score
  total_score INTEGER DEFAULT 0 CHECK (total_score >= 0 AND total_score <= 13),

  -- Staff Tracking
  reviewed_by TEXT,
  submitted_by_name TEXT,
  submitted_at TIMESTAMPTZ,

  -- Standard tracking fields
  started_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  filled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(management_id, form_date)
);

-- Add comments
COMMENT ON TABLE public.patient_management_daily_oows IS 'Objective Opioid Withdrawal Scale - Daily form for addiction program patients only';
COMMENT ON COLUMN public.patient_management_daily_oows.total_score IS 'Total OOWS score (0-13)';
COMMENT ON COLUMN public.patient_management_daily_oows.reviewed_by IS 'Name of staff member who reviewed the form';
COMMENT ON COLUMN public.patient_management_daily_oows.submitted_by_name IS 'Name of staff member who submitted the form';

-- =============================================================================
-- PART 3: Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_daily_sows_management_id ON public.patient_management_daily_sows(management_id);
CREATE INDEX IF NOT EXISTS idx_daily_sows_form_date ON public.patient_management_daily_sows(form_date);
CREATE INDEX IF NOT EXISTS idx_daily_oows_management_id ON public.patient_management_daily_oows(management_id);
CREATE INDEX IF NOT EXISTS idx_daily_oows_form_date ON public.patient_management_daily_oows(form_date);

-- =============================================================================
-- PART 4: Triggers for completion tracking
-- =============================================================================

-- SOWS triggers
DROP TRIGGER IF EXISTS prevent_uncomplete_daily_sows ON public.patient_management_daily_sows;
CREATE TRIGGER prevent_uncomplete_daily_sows
  BEFORE UPDATE ON public.patient_management_daily_sows
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_uncomplete_is_completed();

DROP TRIGGER IF EXISTS ensure_daily_sows_started_at ON public.patient_management_daily_sows;
CREATE TRIGGER ensure_daily_sows_started_at
  BEFORE INSERT ON public.patient_management_daily_sows
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_daily_started_at();

DROP TRIGGER IF EXISTS set_daily_sows_completed_at ON public.patient_management_daily_sows;
CREATE TRIGGER set_daily_sows_completed_at
  BEFORE UPDATE ON public.patient_management_daily_sows
  FOR EACH ROW
  EXECUTE FUNCTION public.set_management_form_completed_at();

-- OOWS triggers
DROP TRIGGER IF EXISTS prevent_uncomplete_daily_oows ON public.patient_management_daily_oows;
CREATE TRIGGER prevent_uncomplete_daily_oows
  BEFORE UPDATE ON public.patient_management_daily_oows
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_uncomplete_is_completed();

DROP TRIGGER IF EXISTS ensure_daily_oows_started_at ON public.patient_management_daily_oows;
CREATE TRIGGER ensure_daily_oows_started_at
  BEFORE INSERT ON public.patient_management_daily_oows
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_daily_started_at();

DROP TRIGGER IF EXISTS set_daily_oows_completed_at ON public.patient_management_daily_oows;
CREATE TRIGGER set_daily_oows_completed_at
  BEFORE UPDATE ON public.patient_management_daily_oows
  FOR EACH ROW
  EXECUTE FUNCTION public.set_management_form_completed_at();

COMMIT;
