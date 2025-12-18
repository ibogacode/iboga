-- Create medical_history_forms table
CREATE TABLE IF NOT EXISTS public.medical_history_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to intake form (optional, for auto-population)
  intake_form_id UUID REFERENCES public.patient_intake_forms(id) ON DELETE SET NULL,
  
  -- Personal Information (auto-populated from intake form)
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('M', 'F', 'other')),
  weight TEXT,
  height TEXT,
  phone_number TEXT NOT NULL,
  email TEXT NOT NULL,
  emergency_contact_name TEXT NOT NULL,
  emergency_contact_phone TEXT NOT NULL,
  
  -- Health Information
  primary_care_provider TEXT,
  other_physicians TEXT,
  practitioners_therapists TEXT,
  
  -- Medical History
  current_health_status TEXT,
  reason_for_coming TEXT,
  medical_conditions TEXT,
  substance_use_history TEXT,
  family_personal_health_info TEXT,
  pain_stiffness_swelling TEXT,
  
  -- Health Sections
  metabolic_health_concerns TEXT,
  digestive_health TEXT,
  reproductive_health TEXT,
  hormonal_health TEXT,
  immune_health TEXT,
  food_allergies_intolerance TEXT,
  difficulties_chewing_swallowing TEXT,
  
  -- Medications
  medications_medical_use TEXT,
  medications_mental_health TEXT,
  
  -- Mental Health
  mental_health_conditions TEXT,
  mental_health_treatment TEXT,
  
  -- Allergies
  allergies TEXT,
  
  -- Previous Experiences
  previous_psychedelics_experiences TEXT,
  
  -- Physical Examination
  physical_examination_records TEXT,
  cardiac_evaluation TEXT,
  liver_function_tests TEXT,
  
  -- Pregnancy
  is_pregnant BOOLEAN DEFAULT false,
  
  -- Dietary and Lifestyle
  dietary_lifestyle_habits TEXT,
  physical_activity_exercise TEXT,
  
  -- Signature
  signature_data TEXT,
  signature_date DATE NOT NULL,
  
  -- File upload
  uploaded_file_url TEXT,
  uploaded_file_name TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS medical_history_forms_email_idx ON public.medical_history_forms(email);
CREATE INDEX IF NOT EXISTS medical_history_forms_intake_form_id_idx ON public.medical_history_forms(intake_form_id);
CREATE INDEX IF NOT EXISTS medical_history_forms_created_at_idx ON public.medical_history_forms(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.medical_history_forms ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Public can insert (submit forms) - no authentication required
CREATE POLICY "Public can submit medical history forms"
  ON public.medical_history_forms
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Owners and admins can view all forms
CREATE POLICY "Owners and admins can view all medical history forms"
  ON public.medical_history_forms
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

-- Owners and admins can update forms
CREATE POLICY "Owners and admins can update medical history forms"
  ON public.medical_history_forms
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

-- Owners and admins can delete forms
CREATE POLICY "Owners and admins can delete medical history forms"
  ON public.medical_history_forms
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_medical_history_form_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS set_medical_history_form_updated_at ON public.medical_history_forms;
CREATE TRIGGER set_medical_history_form_updated_at
  BEFORE UPDATE ON public.medical_history_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_medical_history_form_updated_at();
