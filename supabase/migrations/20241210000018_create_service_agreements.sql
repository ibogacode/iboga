-- Create service_agreements table
CREATE TABLE IF NOT EXISTS public.service_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to patient (optional, can be created standalone)
  patient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  intake_form_id UUID REFERENCES public.patient_intake_forms(id) ON DELETE SET NULL,
  
  -- Patient Information
  patient_first_name TEXT NOT NULL,
  patient_last_name TEXT NOT NULL,
  patient_email TEXT NOT NULL,
  patient_phone_number TEXT NOT NULL,
  
  -- Fees & Payment
  total_program_fee DECIMAL(10, 2) NOT NULL,
  deposit_amount DECIMAL(10, 2) NOT NULL,
  deposit_percentage DECIMAL(5, 2) NOT NULL, -- e.g., 50.00 for 50%
  remaining_balance DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  
  -- Patient Signature
  patient_signature_name TEXT NOT NULL,
  patient_signature_first_name TEXT NOT NULL,
  patient_signature_last_name TEXT NOT NULL,
  patient_signature_date DATE NOT NULL,
  patient_signature_data TEXT, -- Base64 encoded signature image
  
  -- Provider Signature
  provider_signature_name TEXT NOT NULL,
  provider_signature_first_name TEXT NOT NULL,
  provider_signature_last_name TEXT NOT NULL,
  provider_signature_date DATE NOT NULL,
  provider_signature_data TEXT, -- Base64 encoded signature image
  
  -- File Upload
  uploaded_file_url TEXT,
  uploaded_file_name TEXT,
  
  -- Metadata
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS service_agreements_patient_id_idx ON public.service_agreements(patient_id);
CREATE INDEX IF NOT EXISTS service_agreements_intake_form_id_idx ON public.service_agreements(intake_form_id);
CREATE INDEX IF NOT EXISTS service_agreements_created_at_idx ON public.service_agreements(created_at DESC);

-- Enable RLS
ALTER TABLE public.service_agreements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins and owners can view all service agreements
CREATE POLICY "Admins and owners can view all service agreements"
  ON public.service_agreements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner')
    )
  );

-- Admins and owners can insert service agreements
CREATE POLICY "Admins and owners can insert service agreements"
  ON public.service_agreements
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner')
    )
  );

-- Admins and owners can update service agreements
CREATE POLICY "Admins and owners can update service agreements"
  ON public.service_agreements
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner')
    )
  );

-- Patients can view their own service agreements
CREATE POLICY "Patients can view their own service agreements"
  ON public.service_agreements
  FOR SELECT
  USING (
    patient_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner', 'doctor', 'nurse', 'manager')
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_service_agreements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_service_agreements_updated_at
  BEFORE UPDATE ON public.service_agreements
  FOR EACH ROW
  EXECUTE FUNCTION update_service_agreements_updated_at();

COMMENT ON TABLE public.service_agreements IS 'Service agreements between Iboga Wellness Institute and patients';
