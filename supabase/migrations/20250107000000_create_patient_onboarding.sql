-- Migration: Create patient onboarding tracking table
-- This table tracks patients who have completed all 4 pipeline forms and are now in onboarding stage

-- 1. Patient Onboarding table - tracks each patient's onboarding status
CREATE TABLE IF NOT EXISTS public.patient_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to patient (via intake form or partial form or profile)
  intake_form_id UUID REFERENCES public.patient_intake_forms(id) ON DELETE SET NULL,
  partial_intake_form_id UUID REFERENCES public.partial_intake_forms(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Patient info (denormalized for quick access)
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT,
  date_of_birth DATE,
  program_type TEXT,
  
  -- Emergency contact info (from intake form)
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_email TEXT,
  emergency_contact_relationship TEXT,
  
  -- Address info
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  
  -- Onboarding status
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'moved_to_management')),
  
  -- Onboarding checklist (non-form items)
  payment_received BOOLEAN NOT NULL DEFAULT false,
  travel_arranged BOOLEAN NOT NULL DEFAULT false,
  medical_clearance BOOLEAN NOT NULL DEFAULT false,
  
  -- Form completion tracking (will be updated by triggers/actions)
  release_form_completed BOOLEAN NOT NULL DEFAULT false,
  outing_consent_completed BOOLEAN NOT NULL DEFAULT false,
  social_media_release_completed BOOLEAN NOT NULL DEFAULT false,
  internal_regulations_completed BOOLEAN NOT NULL DEFAULT false,
  informed_dissent_completed BOOLEAN NOT NULL DEFAULT false,
  
  -- Dates
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  moved_to_management_at TIMESTAMPTZ,
  
  -- Email reminder tracking
  last_reminder_sent_at TIMESTAMPTZ,
  reminder_count INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS patient_onboarding_intake_form_id_idx ON public.patient_onboarding(intake_form_id);
CREATE INDEX IF NOT EXISTS patient_onboarding_partial_intake_form_id_idx ON public.patient_onboarding(partial_intake_form_id);
CREATE INDEX IF NOT EXISTS patient_onboarding_patient_id_idx ON public.patient_onboarding(patient_id);
CREATE INDEX IF NOT EXISTS patient_onboarding_email_idx ON public.patient_onboarding(email);
CREATE INDEX IF NOT EXISTS patient_onboarding_status_idx ON public.patient_onboarding(status);
CREATE INDEX IF NOT EXISTS patient_onboarding_created_at_idx ON public.patient_onboarding(created_at DESC);

-- Enable RLS
ALTER TABLE public.patient_onboarding ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view all onboarding records"
  ON public.patient_onboarding
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'doctor', 'nurse', 'manager', 'psych')
    )
  );

CREATE POLICY "Staff can insert onboarding records"
  ON public.patient_onboarding
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY "Staff can update onboarding records"
  ON public.patient_onboarding
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'manager')
    )
  );

-- Patients can view their own onboarding record
CREATE POLICY "Patients can view their own onboarding"
  ON public.patient_onboarding
  FOR SELECT
  TO authenticated
  USING (
    patient_id = auth.uid()
    OR email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_patient_onboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  -- Check if all forms are completed
  IF NEW.release_form_completed = true 
     AND NEW.outing_consent_completed = true 
     AND NEW.social_media_release_completed = true 
     AND NEW.internal_regulations_completed = true 
     AND NEW.informed_dissent_completed = true 
     AND NEW.status = 'in_progress' THEN
    NEW.status = 'completed';
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_patient_onboarding_updated_at ON public.patient_onboarding;
CREATE TRIGGER set_patient_onboarding_updated_at
  BEFORE UPDATE ON public.patient_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_patient_onboarding_updated_at();

-- Comments
COMMENT ON TABLE public.patient_onboarding IS 'Tracks patients in the onboarding stage who need to complete 5 forms before treatment';
COMMENT ON COLUMN public.patient_onboarding.status IS 'in_progress: filling forms, completed: all 5 forms done, moved_to_management: patient moved to active treatment';

