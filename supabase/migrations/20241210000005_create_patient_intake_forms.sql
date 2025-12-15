-- Create patient_intake_forms table for public patient intake submissions
CREATE TABLE IF NOT EXISTS public.patient_intake_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Personal Information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer-not-to-say')),
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  
  -- Emergency Contact Information
  emergency_contact_first_name TEXT NOT NULL,
  emergency_contact_last_name TEXT NOT NULL,
  emergency_contact_email TEXT,
  emergency_contact_phone TEXT NOT NULL,
  emergency_contact_address TEXT,
  emergency_contact_relationship TEXT,
  
  -- Consent and Agreements (stored as boolean)
  privacy_policy_accepted BOOLEAN NOT NULL DEFAULT false,
  -- Ibogaine Therapy Consent - Individual sections
  consent_for_treatment BOOLEAN NOT NULL DEFAULT false,
  risks_and_benefits BOOLEAN NOT NULL DEFAULT false,
  pre_screening_health_assessment BOOLEAN NOT NULL DEFAULT false,
  voluntary_participation BOOLEAN NOT NULL DEFAULT false,
  confidentiality BOOLEAN NOT NULL DEFAULT false,
  liability_release BOOLEAN NOT NULL DEFAULT false,
  payment_collection_1 BOOLEAN NOT NULL DEFAULT false,
  payment_collection_2 BOOLEAN NOT NULL DEFAULT false,
  ibogaine_therapy_consent_accepted BOOLEAN NOT NULL DEFAULT false,
  service_agreement_accepted BOOLEAN NOT NULL DEFAULT false,
  release_consent_accepted BOOLEAN NOT NULL DEFAULT false,
  final_acknowledgment_accepted BOOLEAN NOT NULL DEFAULT false,
  
  -- Signature
  signature_data TEXT, -- Base64 encoded signature image or text
  signature_date DATE NOT NULL,
  
  -- Metadata
  ip_address INET, -- Store IP for audit purposes
  user_agent TEXT, -- Store user agent for audit purposes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS patient_intake_forms_email_idx ON public.patient_intake_forms(email);
CREATE INDEX IF NOT EXISTS patient_intake_forms_created_at_idx ON public.patient_intake_forms(created_at DESC);
CREATE INDEX IF NOT EXISTS patient_intake_forms_name_idx ON public.patient_intake_forms(last_name, first_name);

-- Enable Row Level Security
ALTER TABLE public.patient_intake_forms ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Public can insert (submit forms) - no authentication required
CREATE POLICY "Public can submit intake forms"
  ON public.patient_intake_forms
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only owners (admins) can view all forms
CREATE POLICY "Owners can view all intake forms"
  ON public.patient_intake_forms
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'owner'
    )
  );

-- Only owners (admins) can update forms
CREATE POLICY "Owners can update intake forms"
  ON public.patient_intake_forms
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'owner'
    )
  );

-- Only owners (admins) can delete forms
CREATE POLICY "Owners can delete intake forms"
  ON public.patient_intake_forms
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'owner'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_intake_form_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS set_intake_form_updated_at ON public.patient_intake_forms;
CREATE TRIGGER set_intake_form_updated_at
  BEFORE UPDATE ON public.patient_intake_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_intake_form_updated_at();

