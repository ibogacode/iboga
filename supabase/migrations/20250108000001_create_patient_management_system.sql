-- =============================================================================
-- Iboga - Patient Management System (Hardened, Idempotent)
-- =============================================================================
-- Goals:
--   - Do NOT break existing data
--   - Idempotent: safe to run multiple times
--   - Harden SECURITY DEFINER functions with safe search_path
--   - Make RLS policy creation rerunnable (DROP POLICY IF EXISTS)
-- =============================================================================

BEGIN;

-- =============================================================================
-- PART 0: Extensions (safe)
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- PART 1: patient_management Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.patient_management (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Links to source data
  onboarding_id UUID REFERENCES public.patient_onboarding(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Patient info (denormalized for display)
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT,
  date_of_birth DATE,
  program_type TEXT NOT NULL CHECK (program_type IN ('neurological', 'mental_health', 'addiction')),

  -- Stay tracking
  arrival_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_departure_date DATE,
  actual_departure_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'discharged', 'transferred')),

  -- One-time form completion flags
  intake_report_completed BOOLEAN NOT NULL DEFAULT false,
  parkinsons_psychological_report_completed BOOLEAN NOT NULL DEFAULT false, -- neurological only
  parkinsons_mortality_scales_completed BOOLEAN NOT NULL DEFAULT false, -- neurological only

  -- Workflow metadata
  notes TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  discharged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes (safe)
CREATE INDEX IF NOT EXISTS idx_patient_management_patient_id ON public.patient_management(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_management_onboarding_id ON public.patient_management(onboarding_id);
CREATE INDEX IF NOT EXISTS idx_patient_management_status ON public.patient_management(status);
CREATE INDEX IF NOT EXISTS idx_patient_management_program_type ON public.patient_management(program_type);

-- =============================================================================
-- PART 2: One-Time Form 1 - Intake Report (All Programs)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.patient_management_intake_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  management_id UUID NOT NULL REFERENCES public.patient_management(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  guest_first_name TEXT NOT NULL,
  guest_last_name TEXT NOT NULL,
  date DATE NOT NULL,
  time_of_intake TEXT NOT NULL, -- HH:MM format
  staff_member_completing_form TEXT,

  emotional_state_today TEXT NOT NULL,
  emotional_shifts_48h TEXT,
  emotional_themes_memories TEXT,
  emotionally_connected TEXT NOT NULL,
  strong_emotions TEXT,

  mental_clarity TEXT NOT NULL,
  focus_memory_concentration TEXT,
  recurring_thoughts_dreams TEXT,
  present_aware TEXT NOT NULL,
  intrusive_thoughts_dissociation TEXT,

  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
  physical_discomfort TEXT,
  sleep_appetite_digestion TEXT,
  physical_sensations_emotions TEXT,

  intentions_goals TEXT,
  emotionally_physically_safe TEXT NOT NULL,
  resolve_release_explore TEXT,
  team_awareness TEXT,

  filled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  filled_at TIMESTAMPTZ,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(management_id)
);

-- =============================================================================
-- PART 3: One-Time Form 2 - Parkinson's Intake Psychological Report (Neurological Only)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.patient_management_parkinsons_psychological_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  management_id UUID NOT NULL REFERENCES public.patient_management(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  patient_first_name TEXT NOT NULL,
  patient_last_name TEXT NOT NULL,
  reason_for_coming TEXT NOT NULL,

  overall_mental_health_rating TEXT NOT NULL,
  daily_stress_management TEXT NOT NULL,
  depression_sadness_severity TEXT NOT NULL,
  expressing_emotions_safety TEXT NOT NULL,
  ibogaine_therapy_preparation TEXT NOT NULL,
  support_system_strength TEXT NOT NULL,
  treatment_outcome_hope TEXT NOT NULL,
  anxiety_nervousness_severity TEXT NOT NULL,
  emotional_numbness_frequency TEXT NOT NULL,
  sleep_quality TEXT NOT NULL,

  parkinsons_motor_symptoms_severity TEXT NOT NULL,
  stiffness_difficulty_moving_frequency TEXT NOT NULL,
  medication_effectiveness TEXT NOT NULL,
  muscle_spasms_cramps_frequency TEXT NOT NULL,
  non_motor_symptoms_severity TEXT NOT NULL,
  iboga_wellness_team_support TEXT NOT NULL,

  signature_data TEXT,
  signature_date DATE,

  filled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  filled_at TIMESTAMPTZ,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(management_id)
);

-- =============================================================================
-- PART 4: One-Time Form 3 - Parkinson's Mortality - Related Scales (Neurological Only)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.patient_management_parkinsons_mortality_scales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  management_id UUID NOT NULL REFERENCES public.patient_management(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  patient_first_name TEXT NOT NULL,
  patient_last_name TEXT NOT NULL,

  cognitive_impairment INTEGER,
  hallucinations_psychosis INTEGER,
  depressed_mood INTEGER,
  anxious_mood INTEGER,
  apathy INTEGER,
  dopaminergic_dysregulation INTEGER,
  sleep_problems INTEGER,
  daytime_sleepiness INTEGER,
  pain_sensory_complaints INTEGER,
  urinary_problems INTEGER,
  constipation INTEGER,
  lightheadedness INTEGER,
  fatigue INTEGER,
  part_i_total_score INTEGER DEFAULT 0,

  speech_part2 INTEGER,
  saliva_drooling INTEGER,
  chewing_swallowing INTEGER,
  eating_tasks INTEGER,
  dressing INTEGER,
  hygiene INTEGER,
  handwriting INTEGER,
  hobbies_activities INTEGER,
  turning_in_bed INTEGER,
  tremor_daily_impact INTEGER,
  getting_out_of_bed INTEGER,
  walking_balance INTEGER,
  freezing_of_gait_part2 INTEGER,
  part_ii_total_score INTEGER DEFAULT 0,

  speech_part3 INTEGER,
  facial_expression INTEGER,
  rigidity_neck INTEGER,
  rigidity_right_upper_limb INTEGER,
  rigidity_left_upper_limb INTEGER,
  rigidity_right_lower_limb INTEGER,
  rigidity_left_lower_limb INTEGER,
  finger_tapping_right INTEGER,
  finger_tapping_left INTEGER,
  hand_movements_right INTEGER,
  hand_movements_left INTEGER,
  pronation_supination_right INTEGER,
  pronation_supination_left INTEGER,
  toe_tapping_right INTEGER,
  toe_tapping_left INTEGER,
  leg_agility_right INTEGER,
  leg_agility_left INTEGER,
  arising_from_chair INTEGER,
  gait INTEGER,
  freezing_of_gait_part3 INTEGER,
  postural_stability INTEGER,
  posture INTEGER,
  global_bradykinesia INTEGER,
  postural_tremor_right INTEGER,
  postural_tremor_left INTEGER,
  kinetic_tremor_right INTEGER,
  kinetic_tremor_left INTEGER,
  rest_tremor_right_upper INTEGER,
  rest_tremor_left_upper INTEGER,
  rest_tremor_right_lower INTEGER,
  rest_tremor_left_lower INTEGER,
  rest_tremor_lip_jaw INTEGER,
  constancy_of_rest_tremor INTEGER,
  part_iii_total_score INTEGER DEFAULT 0,

  time_with_dyskinesias INTEGER,
  impact_of_dyskinesias INTEGER,
  time_in_off_state INTEGER,
  impact_of_fluctuations INTEGER,
  complexity_of_fluctuations INTEGER,
  painful_off_state_dystonia INTEGER,
  part_iv_total_score INTEGER DEFAULT 0,

  mds_updrs_total_score INTEGER DEFAULT 0,
  administered_by TEXT,
  mds_updrs_notes TEXT,

  hoehn_yahr_stage TEXT,

  dressing_score INTEGER,
  feeding_score INTEGER,
  ambulation_transfers_score INTEGER,
  household_tasks_score INTEGER,
  use_of_appliances_communication_score INTEGER,
  schwab_england_total_score INTEGER DEFAULT 0,

  age_years INTEGER,
  disease_duration_years INTEGER,
  dementia TEXT,
  falls_past_6_12_months TEXT,
  mds_updrs_part_iii_motor_score INTEGER,
  risk_classification TEXT,

  weight_loss INTEGER,
  fatigue_frailty INTEGER,
  physical_activity INTEGER,
  strength_gait_speed INTEGER,
  comorbidities_assistance INTEGER,
  mds_pd_frailty_total_score INTEGER DEFAULT 0,

  scanned_mds_updrs_form_url TEXT,

  filled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  filled_at TIMESTAMPTZ,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(management_id)
);

-- =============================================================================
-- PART 5: Daily Form 1 - Daily Psychological Update (All Programs)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.patient_management_daily_psychological_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  management_id UUID NOT NULL REFERENCES public.patient_management(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  guest_first_name TEXT NOT NULL,
  guest_last_name TEXT NOT NULL,
  form_date DATE NOT NULL,
  time TEXT NOT NULL, -- HH:MM format

  emotional_state_today TEXT NOT NULL,
  emotional_shifts_since_last_report TEXT,
  vivid_dreams_resurfacing_memories TEXT,
  feeling_connected_to_emotions TEXT,
  changes_memory_focus_concentration TEXT,
  feeling_present_aware TEXT,
  discomfort_side_effects TEXT,
  energy_level INTEGER NOT NULL CHECK (energy_level >= 1 AND energy_level <= 10),

  experiencing_tremors_muscle_stiffness TEXT,
  motor_function_details TEXT,

  how_guest_looks_physically TEXT NOT NULL,
  how_guest_describes_feeling TEXT NOT NULL,
  additional_notes_observations TEXT NOT NULL,

  started_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  filled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(management_id, form_date)
);

-- =============================================================================
-- PART 6: Daily Form 2 - Daily Medical Update (All Programs)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.patient_management_daily_medical_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  management_id UUID NOT NULL REFERENCES public.patient_management(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  patient_first_name TEXT NOT NULL,
  patient_last_name TEXT NOT NULL,
  form_date DATE NOT NULL,

  checked_vitals BOOLEAN NOT NULL DEFAULT false,
  did_they_feel_hungry TEXT,
  using_bathroom_normally TEXT,
  hydrating TEXT,
  experiencing_tremors_motor_function TEXT,
  withdrawal_symptoms TEXT,
  how_guest_looks TEXT,
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
  how_guest_says_they_feel TEXT,

  morning_vital_signs TEXT,
  morning_symptoms TEXT,
  morning_evolution TEXT,
  afternoon_vital_signs TEXT,
  afternoon_symptoms TEXT,
  afternoon_evolution TEXT,
  night_vital_signs TEXT,
  night_symptoms TEXT,
  night_evolution TEXT,

  ibogaine_dose_time TEXT,
  medication_schedule TEXT,
  solutions_iv_saline_nadh TEXT,
  medical_indications TEXT,
  additional_observations_notes TEXT,

  photo_of_vitals_medical_notes_url TEXT,

  signature_data TEXT,
  signature_date DATE,

  started_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  filled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(management_id, form_date)
);

-- =============================================================================
-- PART 7: Indexes for Daily Forms
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_daily_psychological_management_id ON public.patient_management_daily_psychological_updates(management_id);
CREATE INDEX IF NOT EXISTS idx_daily_psychological_form_date ON public.patient_management_daily_psychological_updates(form_date);
CREATE INDEX IF NOT EXISTS idx_daily_medical_management_id ON public.patient_management_daily_medical_updates(management_id);
CREATE INDEX IF NOT EXISTS idx_daily_medical_form_date ON public.patient_management_daily_medical_updates(form_date);

-- =============================================================================
-- PART 7.5: Helper Functions for RLS Security (Hardened)
-- =============================================================================

-- NOTE: These depend on your existing onboarding helpers:
--   public.is_staff_role()
--   public.is_admin_staff_role()
-- If those already exist (from onboarding migration), this will work.

CREATE OR REPLACE FUNCTION public.can_manage_management_record(p_management_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.is_admin_staff_role() THEN
    RETURN TRUE;
  END IF;

  IF public.is_staff_role() THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.patient_management pm
      WHERE pm.id = p_management_id
        AND pm.assigned_to = auth.uid()
    );
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_active_management(p_management_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.patient_management pm
    WHERE pm.id = p_management_id
      AND pm.status = 'active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_neurological_management(p_management_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.patient_management pm
    WHERE pm.id = p_management_id
      AND pm.program_type = 'neurological'
  );
END;
$$;

-- =============================================================================
-- PART 8: RLS Policies (Idempotent)
-- =============================================================================

ALTER TABLE public.patient_management ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_management_intake_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_management_parkinsons_psychological_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_management_parkinsons_mortality_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_management_daily_psychological_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_management_daily_medical_updates ENABLE ROW LEVEL SECURITY;

-- -------------------------
-- patient_management
-- -------------------------
DROP POLICY IF EXISTS "Staff can view patient management records" ON public.patient_management;
CREATE POLICY "Staff can view patient management records"
  ON public.patient_management
  FOR SELECT
  TO authenticated
  USING (public.is_staff_role());

DROP POLICY IF EXISTS "Admin staff can insert patient management records" ON public.patient_management;
CREATE POLICY "Admin staff can insert patient management records"
  ON public.patient_management
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_staff_role());

DROP POLICY IF EXISTS "Staff can update patient management records" ON public.patient_management;
CREATE POLICY "Staff can update patient management records"
  ON public.patient_management
  FOR UPDATE
  TO authenticated
  USING (public.is_staff_role())
  WITH CHECK (public.is_staff_role());

DROP POLICY IF EXISTS "Patients can view their own patient management" ON public.patient_management;
CREATE POLICY "Patients can view their own patient management"
  ON public.patient_management
  FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

-- -------------------------
-- Intake Reports
-- -------------------------
DROP POLICY IF EXISTS "Staff can view intake reports" ON public.patient_management_intake_reports;
CREATE POLICY "Staff can view intake reports"
  ON public.patient_management_intake_reports
  FOR SELECT
  TO authenticated
  USING (public.is_staff_role());

DROP POLICY IF EXISTS "Staff can insert intake reports" ON public.patient_management_intake_reports;
CREATE POLICY "Staff can insert intake reports"
  ON public.patient_management_intake_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_manage_management_record(management_id)
    AND NOT public.is_neurological_management(management_id)
  );

DROP POLICY IF EXISTS "Staff can update intake reports" ON public.patient_management_intake_reports;
CREATE POLICY "Staff can update intake reports"
  ON public.patient_management_intake_reports
  FOR UPDATE
  TO authenticated
  USING (
    public.can_manage_management_record(management_id)
    AND NOT public.is_neurological_management(management_id)
  )
  WITH CHECK (
    public.can_manage_management_record(management_id)
    AND NOT public.is_neurological_management(management_id)
  );

DROP POLICY IF EXISTS "Patients can view their own intake reports" ON public.patient_management_intake_reports;
CREATE POLICY "Patients can view their own intake reports"
  ON public.patient_management_intake_reports
  FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

-- -------------------------
-- Parkinson's Psychological Reports
-- -------------------------
DROP POLICY IF EXISTS "Staff can view parkinsons psychological reports" ON public.patient_management_parkinsons_psychological_reports;
CREATE POLICY "Staff can view parkinsons psychological reports"
  ON public.patient_management_parkinsons_psychological_reports
  FOR SELECT
  TO authenticated
  USING (public.is_staff_role());

DROP POLICY IF EXISTS "Staff can insert parkinsons psychological reports" ON public.patient_management_parkinsons_psychological_reports;
CREATE POLICY "Staff can insert parkinsons psychological reports"
  ON public.patient_management_parkinsons_psychological_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_manage_management_record(management_id)
    AND public.is_neurological_management(management_id)
  );

DROP POLICY IF EXISTS "Staff can update parkinsons psychological reports" ON public.patient_management_parkinsons_psychological_reports;
CREATE POLICY "Staff can update parkinsons psychological reports"
  ON public.patient_management_parkinsons_psychological_reports
  FOR UPDATE
  TO authenticated
  USING (
    public.can_manage_management_record(management_id)
    AND public.is_neurological_management(management_id)
  )
  WITH CHECK (
    public.can_manage_management_record(management_id)
    AND public.is_neurological_management(management_id)
  );

DROP POLICY IF EXISTS "Patients can view their own parkinsons psychological reports" ON public.patient_management_parkinsons_psychological_reports;
CREATE POLICY "Patients can view their own parkinsons psychological reports"
  ON public.patient_management_parkinsons_psychological_reports
  FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

-- -------------------------
-- Parkinson's Mortality Scales
-- -------------------------
DROP POLICY IF EXISTS "Staff can view parkinsons mortality scales" ON public.patient_management_parkinsons_mortality_scales;
CREATE POLICY "Staff can view parkinsons mortality scales"
  ON public.patient_management_parkinsons_mortality_scales
  FOR SELECT
  TO authenticated
  USING (public.is_staff_role());

DROP POLICY IF EXISTS "Staff can insert parkinsons mortality scales" ON public.patient_management_parkinsons_mortality_scales;
CREATE POLICY "Staff can insert parkinsons mortality scales"
  ON public.patient_management_parkinsons_mortality_scales
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_manage_management_record(management_id)
    AND public.is_neurological_management(management_id)
  );

DROP POLICY IF EXISTS "Staff can update parkinsons mortality scales" ON public.patient_management_parkinsons_mortality_scales;
CREATE POLICY "Staff can update parkinsons mortality scales"
  ON public.patient_management_parkinsons_mortality_scales
  FOR UPDATE
  TO authenticated
  USING (
    public.can_manage_management_record(management_id)
    AND public.is_neurological_management(management_id)
  )
  WITH CHECK (
    public.can_manage_management_record(management_id)
    AND public.is_neurological_management(management_id)
  );

DROP POLICY IF EXISTS "Patients can view their own parkinsons mortality scales" ON public.patient_management_parkinsons_mortality_scales;
CREATE POLICY "Patients can view their own parkinsons mortality scales"
  ON public.patient_management_parkinsons_mortality_scales
  FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

-- -------------------------
-- Daily Psychological Updates
-- -------------------------
DROP POLICY IF EXISTS "Staff can view daily psychological updates" ON public.patient_management_daily_psychological_updates;
CREATE POLICY "Staff can view daily psychological updates"
  ON public.patient_management_daily_psychological_updates
  FOR SELECT
  TO authenticated
  USING (public.is_staff_role());

DROP POLICY IF EXISTS "Staff can insert daily psychological updates" ON public.patient_management_daily_psychological_updates;
CREATE POLICY "Staff can insert daily psychological updates"
  ON public.patient_management_daily_psychological_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_manage_management_record(management_id)
    AND public.is_active_management(management_id)
  );

DROP POLICY IF EXISTS "Staff can update daily psychological updates" ON public.patient_management_daily_psychological_updates;
CREATE POLICY "Staff can update daily psychological updates"
  ON public.patient_management_daily_psychological_updates
  FOR UPDATE
  TO authenticated
  USING (
    public.can_manage_management_record(management_id)
    AND public.is_active_management(management_id)
  )
  WITH CHECK (
    public.can_manage_management_record(management_id)
    AND public.is_active_management(management_id)
  );

DROP POLICY IF EXISTS "Patients can view their own daily psychological updates" ON public.patient_management_daily_psychological_updates;
CREATE POLICY "Patients can view their own daily psychological updates"
  ON public.patient_management_daily_psychological_updates
  FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

-- -------------------------
-- Daily Medical Updates
-- -------------------------
DROP POLICY IF EXISTS "Staff can view daily medical updates" ON public.patient_management_daily_medical_updates;
CREATE POLICY "Staff can view daily medical updates"
  ON public.patient_management_daily_medical_updates
  FOR SELECT
  TO authenticated
  USING (public.is_staff_role());

DROP POLICY IF EXISTS "Staff can insert daily medical updates" ON public.patient_management_daily_medical_updates;
CREATE POLICY "Staff can insert daily medical updates"
  ON public.patient_management_daily_medical_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_manage_management_record(management_id)
    AND public.is_active_management(management_id)
  );

DROP POLICY IF EXISTS "Staff can update daily medical updates" ON public.patient_management_daily_medical_updates;
CREATE POLICY "Staff can update daily medical updates"
  ON public.patient_management_daily_medical_updates
  FOR UPDATE
  TO authenticated
  USING (
    public.can_manage_management_record(management_id)
    AND public.is_active_management(management_id)
  )
  WITH CHECK (
    public.can_manage_management_record(management_id)
    AND public.is_active_management(management_id)
  );

DROP POLICY IF EXISTS "Patients can view their own daily medical updates" ON public.patient_management_daily_medical_updates;
CREATE POLICY "Patients can view their own daily medical updates"
  ON public.patient_management_daily_medical_updates
  FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

-- =============================================================================
-- PART 9: Triggers (Hardened)
-- =============================================================================

-- Keep patient_management.updated_at current
CREATE OR REPLACE FUNCTION public.handle_patient_management_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_patient_management_updated_at ON public.patient_management;
CREATE TRIGGER set_patient_management_updated_at
  BEFORE UPDATE ON public.patient_management
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_patient_management_updated_at();

-- Propagate completion flags to patient_management for one-time forms
CREATE OR REPLACE FUNCTION public.propagate_management_form_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.is_completed = true AND (OLD.is_completed = false OR OLD.is_completed IS NULL) THEN
    IF TG_TABLE_NAME = 'patient_management_intake_reports' THEN
      UPDATE public.patient_management
      SET intake_report_completed = true
      WHERE id = NEW.management_id;

    ELSIF TG_TABLE_NAME = 'patient_management_parkinsons_psychological_reports' THEN
      UPDATE public.patient_management
      SET parkinsons_psychological_report_completed = true
      WHERE id = NEW.management_id;

    ELSIF TG_TABLE_NAME = 'patient_management_parkinsons_mortality_scales' THEN
      UPDATE public.patient_management
      SET parkinsons_mortality_scales_completed = true
      WHERE id = NEW.management_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Prevent un-completing forms
CREATE OR REPLACE FUNCTION public.prevent_uncomplete_is_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.is_completed = true AND NEW.is_completed = false THEN
    RAISE EXCEPTION 'Un-completing forms is not supported. Cannot set is_completed from true to false.';
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure started_at / started_by are set for daily forms
CREATE OR REPLACE FUNCTION public.ensure_daily_started_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.started_at IS NULL THEN
    NEW.started_at := NOW();
  END IF;

  -- Only set started_by if we actually have auth.uid()
  IF NEW.started_by IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.started_by := auth.uid();
  END IF;

  RETURN NEW;
END;
$$;

-- Set completed_at / filled_at on completion (do not overwrite existing values)
CREATE OR REPLACE FUNCTION public.set_management_form_completed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.is_completed = true AND (OLD.is_completed = false OR OLD.is_completed IS NULL) THEN
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := NOW();
    END IF;

    IF NEW.filled_at IS NULL THEN
      NEW.filled_at := NOW();
    END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Apply triggers to form tables (idempotent)
-- ---------------------------------------------------------------------------

-- Intake Report
DROP TRIGGER IF EXISTS prevent_uncomplete_intake_report ON public.patient_management_intake_reports;
CREATE TRIGGER prevent_uncomplete_intake_report
  BEFORE UPDATE ON public.patient_management_intake_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_uncomplete_is_completed();

DROP TRIGGER IF EXISTS propagate_intake_report_completion ON public.patient_management_intake_reports;
CREATE TRIGGER propagate_intake_report_completion
  AFTER UPDATE ON public.patient_management_intake_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.propagate_management_form_completion();

DROP TRIGGER IF EXISTS set_intake_report_completed_at ON public.patient_management_intake_reports;
CREATE TRIGGER set_intake_report_completed_at
  BEFORE UPDATE ON public.patient_management_intake_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.set_management_form_completed_at();

-- Parkinson's Psychological Report
DROP TRIGGER IF EXISTS prevent_uncomplete_parkinsons_psychological ON public.patient_management_parkinsons_psychological_reports;
CREATE TRIGGER prevent_uncomplete_parkinsons_psychological
  BEFORE UPDATE ON public.patient_management_parkinsons_psychological_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_uncomplete_is_completed();

DROP TRIGGER IF EXISTS propagate_parkinsons_psychological_completion ON public.patient_management_parkinsons_psychological_reports;
CREATE TRIGGER propagate_parkinsons_psychological_completion
  AFTER UPDATE ON public.patient_management_parkinsons_psychological_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.propagate_management_form_completion();

DROP TRIGGER IF EXISTS set_parkinsons_psychological_completed_at ON public.patient_management_parkinsons_psychological_reports;
CREATE TRIGGER set_parkinsons_psychological_completed_at
  BEFORE UPDATE ON public.patient_management_parkinsons_psychological_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.set_management_form_completed_at();

-- Parkinson's Mortality Scales
DROP TRIGGER IF EXISTS prevent_uncomplete_parkinsons_mortality ON public.patient_management_parkinsons_mortality_scales;
CREATE TRIGGER prevent_uncomplete_parkinsons_mortality
  BEFORE UPDATE ON public.patient_management_parkinsons_mortality_scales
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_uncomplete_is_completed();

DROP TRIGGER IF EXISTS propagate_parkinsons_mortality_completion ON public.patient_management_parkinsons_mortality_scales;
CREATE TRIGGER propagate_parkinsons_mortality_completion
  AFTER UPDATE ON public.patient_management_parkinsons_mortality_scales
  FOR EACH ROW
  EXECUTE FUNCTION public.propagate_management_form_completion();

DROP TRIGGER IF EXISTS set_parkinsons_mortality_completed_at ON public.patient_management_parkinsons_mortality_scales;
CREATE TRIGGER set_parkinsons_mortality_completed_at
  BEFORE UPDATE ON public.patient_management_parkinsons_mortality_scales
  FOR EACH ROW
  EXECUTE FUNCTION public.set_management_form_completed_at();

-- Daily Psychological Update
DROP TRIGGER IF EXISTS prevent_uncomplete_daily_psychological ON public.patient_management_daily_psychological_updates;
CREATE TRIGGER prevent_uncomplete_daily_psychological
  BEFORE UPDATE ON public.patient_management_daily_psychological_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_uncomplete_is_completed();

DROP TRIGGER IF EXISTS ensure_daily_psychological_started_at ON public.patient_management_daily_psychological_updates;
CREATE TRIGGER ensure_daily_psychological_started_at
  BEFORE INSERT OR UPDATE ON public.patient_management_daily_psychological_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_daily_started_at();

DROP TRIGGER IF EXISTS set_daily_psychological_completed_at ON public.patient_management_daily_psychological_updates;
CREATE TRIGGER set_daily_psychological_completed_at
  BEFORE UPDATE ON public.patient_management_daily_psychological_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_management_form_completed_at();

-- Daily Medical Update
DROP TRIGGER IF EXISTS prevent_uncomplete_daily_medical ON public.patient_management_daily_medical_updates;
CREATE TRIGGER prevent_uncomplete_daily_medical
  BEFORE UPDATE ON public.patient_management_daily_medical_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_uncomplete_is_completed();

DROP TRIGGER IF EXISTS ensure_daily_medical_started_at ON public.patient_management_daily_medical_updates;
CREATE TRIGGER ensure_daily_medical_started_at
  BEFORE INSERT OR UPDATE ON public.patient_management_daily_medical_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_daily_started_at();

DROP TRIGGER IF EXISTS set_daily_medical_completed_at ON public.patient_management_daily_medical_updates;
CREATE TRIGGER set_daily_medical_completed_at
  BEFORE UPDATE ON public.patient_management_daily_medical_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_management_form_completed_at();

-- =============================================================================
-- PART 10: Function Grants (Hardened)
-- =============================================================================
-- Note: SECURITY DEFINER functions should not be executable by PUBLIC.
-- RLS evaluation happens as the user, but functions run with definer privileges.
-- We still grant to authenticated because policies call them.

REVOKE ALL ON FUNCTION public.can_manage_management_record(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_management(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_neurological_management(UUID) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.handle_patient_management_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.propagate_management_form_completion() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_uncomplete_is_completed() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_daily_started_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_management_form_completed_at() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.can_manage_management_record(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_management(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_neurological_management(UUID) TO authenticated;

GRANT EXECUTE ON FUNCTION public.handle_patient_management_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.propagate_management_form_completion() TO authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_uncomplete_is_completed() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_daily_started_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_management_form_completed_at() TO authenticated;

-- =============================================================================
-- PART 11: Comments (optional, safe)
-- =============================================================================
COMMENT ON TABLE public.patient_management IS 'Tracks patients in active treatment/management stage';
COMMENT ON TABLE public.patient_management_intake_reports IS 'One-time intake report for all programs';
COMMENT ON TABLE public.patient_management_parkinsons_psychological_reports IS 'One-time Parkinson''s psychological report (neurological programs only)';
COMMENT ON TABLE public.patient_management_parkinsons_mortality_scales IS 'One-time Parkinson''s mortality scales (neurological programs only)';
COMMENT ON TABLE public.patient_management_daily_psychological_updates IS 'Daily psychological update form (all programs, multiple entries per patient)';
COMMENT ON TABLE public.patient_management_daily_medical_updates IS 'Daily medical update form (all programs, multiple entries per patient)';

COMMENT ON FUNCTION public.can_manage_management_record(UUID) IS 'Returns true if user is admin staff OR (staff AND assigned to the patient management record)';
COMMENT ON FUNCTION public.is_active_management(UUID) IS 'Returns true if patient management record has status = active';
COMMENT ON FUNCTION public.is_neurological_management(UUID) IS 'Returns true if patient management record has program_type = neurological';
COMMENT ON FUNCTION public.prevent_uncomplete_is_completed() IS 'Prevents setting is_completed from true to false (raises exception)';
COMMENT ON FUNCTION public.ensure_daily_started_at() IS 'Ensures started_at is set and started_by is set when auth.uid() exists';
COMMENT ON FUNCTION public.set_management_form_completed_at() IS 'Sets completed_at/filled_at on completion without overwriting existing timestamps';
COMMENT ON FUNCTION public.propagate_management_form_completion() IS 'Propagates one-time form completion flags to patient_management';

COMMIT;
