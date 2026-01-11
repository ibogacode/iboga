-- =============================================================================
-- Medical Intake Report (All Programs)
-- =============================================================================
-- This form is available for all program types (neurological, mental_health, addiction)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.patient_management_medical_intake_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  management_id UUID NOT NULL REFERENCES public.patient_management(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Basic Information
  name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  arrival_date DATE NOT NULL,

  -- Changes Since Medical Clearance
  changes_since_medical_clearance BOOLEAN NOT NULL DEFAULT false,
  changes_medications BOOLEAN DEFAULT false,
  changes_substance_use BOOLEAN DEFAULT false,
  changes_hospitalization BOOLEAN DEFAULT false,
  changes_new_symptoms BOOLEAN DEFAULT false,
  changes_explanation TEXT,

  -- Last Use & Medication Confirmation
  last_substance_use_datetime TIMESTAMPTZ,
  medications_last_72_hours TEXT,

  -- Current Physical Status (Staff)
  blood_pressure TEXT,
  heart_rate INTEGER,
  oxygen_saturation INTEGER,
  temperature DECIMAL(4,1),
  symptoms_nausea BOOLEAN DEFAULT false,
  symptoms_dizziness BOOLEAN DEFAULT false,
  symptoms_palpitations BOOLEAN DEFAULT false,
  symptoms_anxiety BOOLEAN DEFAULT false,
  symptoms_pain BOOLEAN DEFAULT false,

  -- Hydration & Nutrition
  last_food_intake TEXT,
  last_fluids TEXT,
  well_hydrated BOOLEAN DEFAULT false,
  possibly_dehydrated BOOLEAN DEFAULT false,

  -- Mental & Emotional Check-In
  current_state_calm BOOLEAN DEFAULT false,
  current_state_nervous BOOLEAN DEFAULT false,
  current_state_overwhelmed BOOLEAN DEFAULT false,
  current_state_stable BOOLEAN DEFAULT false,
  thoughts_of_self_harm BOOLEAN DEFAULT false,

  -- Client Acknowledgement
  client_signature_data TEXT,
  client_signature_date DATE,

  -- Staff Medical Sign-Off
  reviewed_by TEXT NOT NULL,
  reviewed_date DATE NOT NULL,

  -- Tracking
  filled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  filled_at TIMESTAMPTZ,
  submitted_by_name TEXT,
  submitted_at TIMESTAMPTZ,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(management_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_medical_intake_reports_management_id 
  ON public.patient_management_medical_intake_reports(management_id);
CREATE INDEX IF NOT EXISTS idx_medical_intake_reports_patient_id 
  ON public.patient_management_medical_intake_reports(patient_id);

-- Add comments
COMMENT ON TABLE public.patient_management_medical_intake_reports IS 
  'Medical intake report for all program types (neurological, mental_health, addiction)';
COMMENT ON COLUMN public.patient_management_medical_intake_reports.changes_since_medical_clearance IS 
  'Whether there have been any changes since medical clearance';
COMMENT ON COLUMN public.patient_management_medical_intake_reports.last_substance_use_datetime IS 
  'Date and time of last substance use';
COMMENT ON COLUMN public.patient_management_medical_intake_reports.thoughts_of_self_harm IS 
  'Whether patient has thoughts of self-harm today';

-- =============================================================================
-- RLS Policies
-- =============================================================================

-- Enable RLS
ALTER TABLE public.patient_management_medical_intake_reports ENABLE ROW LEVEL SECURITY;

-- Staff can view medical intake reports (admin, owner, manager, doctor, psych)
CREATE POLICY "Staff can view medical intake reports"
  ON public.patient_management_medical_intake_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'owner', 'manager', 'doctor', 'psych')
    )
  );

-- Staff can insert medical intake reports (all programs) - admin, owner, manager, doctor, psych
CREATE POLICY "Staff can insert medical intake reports"
  ON public.patient_management_medical_intake_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'owner', 'manager', 'doctor', 'psych')
    )
    AND public.can_manage_management_record(management_id)
  );

-- Staff can update medical intake reports (all programs) - admin, owner, manager, doctor, psych
CREATE POLICY "Staff can update medical intake reports"
  ON public.patient_management_medical_intake_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'owner', 'manager', 'doctor', 'psych')
    )
    AND public.can_manage_management_record(management_id)
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'owner', 'manager', 'doctor', 'psych')
    )
    AND public.can_manage_management_record(management_id)
  );

-- Patients can view their own medical intake reports
CREATE POLICY "Patients can view their own medical intake reports"
  ON public.patient_management_medical_intake_reports
  FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());
