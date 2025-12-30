-- Create ibogaine_consent_forms table with boolean checkboxes
CREATE TABLE IF NOT EXISTS public.ibogaine_consent_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to patient and intake form (optional)
  patient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  intake_form_id UUID REFERENCES public.patient_intake_forms(id) ON DELETE SET NULL,
  
  -- Patient Information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT NOT NULL,
  
  -- Therapy Information
  treatment_date DATE NOT NULL,
  facilitator_doctor_name TEXT NOT NULL,
  
  -- Consent Sections (all required - boolean checkboxes)
  consent_for_treatment BOOLEAN NOT NULL DEFAULT false,
  risks_and_benefits BOOLEAN NOT NULL DEFAULT false,
  pre_screening_health_assessment BOOLEAN NOT NULL DEFAULT false,
  voluntary_participation BOOLEAN NOT NULL DEFAULT false,
  confidentiality BOOLEAN NOT NULL DEFAULT false,
  liability_release BOOLEAN NOT NULL DEFAULT false,
  payment_collection BOOLEAN NOT NULL DEFAULT false,
  
  -- Signature
  signature_data TEXT NOT NULL, -- Base64 encoded signature image
  signature_date DATE NOT NULL,
  signature_name TEXT NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS ibogaine_consent_forms_patient_id_idx ON public.ibogaine_consent_forms(patient_id);
CREATE INDEX IF NOT EXISTS ibogaine_consent_forms_intake_form_id_idx ON public.ibogaine_consent_forms(intake_form_id);
CREATE INDEX IF NOT EXISTS ibogaine_consent_forms_email_idx ON public.ibogaine_consent_forms(email);
CREATE INDEX IF NOT EXISTS ibogaine_consent_forms_created_at_idx ON public.ibogaine_consent_forms(created_at DESC);

-- Enable RLS
ALTER TABLE public.ibogaine_consent_forms ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Public can insert (submit forms) - no authentication required
CREATE POLICY "Public can submit ibogaine consent forms"
  ON public.ibogaine_consent_forms
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Owners and admins can view all forms
CREATE POLICY "Owners and admins can view all ibogaine consent forms"
  ON public.ibogaine_consent_forms
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'doctor', 'nurse', 'manager')
    )
  );

-- Patients can view their own forms
CREATE POLICY "Patients can view their own ibogaine consent forms"
  ON public.ibogaine_consent_forms
  FOR SELECT
  TO authenticated
  USING (
    patient_id = auth.uid()
    OR email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );

-- Owners and admins can update forms
CREATE POLICY "Owners and admins can update ibogaine consent forms"
  ON public.ibogaine_consent_forms
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'doctor', 'nurse', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'doctor', 'nurse', 'manager')
    )
  );

-- Owners and admins can delete forms
CREATE POLICY "Owners and admins can delete ibogaine consent forms"
  ON public.ibogaine_consent_forms
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
CREATE OR REPLACE FUNCTION public.handle_ibogaine_consent_form_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS set_ibogaine_consent_form_updated_at ON public.ibogaine_consent_forms;
CREATE TRIGGER set_ibogaine_consent_form_updated_at
  BEFORE UPDATE ON public.ibogaine_consent_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_ibogaine_consent_form_updated_at();

-- Comments
COMMENT ON TABLE public.ibogaine_consent_forms IS 'Ibogaine Therapy Consent Forms for Iboga Wellness Institute';
COMMENT ON COLUMN public.ibogaine_consent_forms.consent_for_treatment IS 'Consent for treatment checkbox';
COMMENT ON COLUMN public.ibogaine_consent_forms.risks_and_benefits IS 'Risks and benefits acknowledgment checkbox';
COMMENT ON COLUMN public.ibogaine_consent_forms.pre_screening_health_assessment IS 'Pre-screening and health assessment acknowledgment checkbox';
COMMENT ON COLUMN public.ibogaine_consent_forms.voluntary_participation IS 'Voluntary participation acknowledgment checkbox';
COMMENT ON COLUMN public.ibogaine_consent_forms.confidentiality IS 'Confidentiality acknowledgment checkbox';
COMMENT ON COLUMN public.ibogaine_consent_forms.liability_release IS 'Liability release acknowledgment checkbox';
COMMENT ON COLUMN public.ibogaine_consent_forms.payment_collection IS 'Payment collection acknowledgment checkbox';
