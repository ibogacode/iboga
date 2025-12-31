-- Make required fields nullable so we can create placeholder rows
ALTER TABLE public.service_agreements
ALTER COLUMN total_program_fee DROP NOT NULL,
ALTER COLUMN deposit_amount DROP NOT NULL,
ALTER COLUMN deposit_percentage DROP NOT NULL,
ALTER COLUMN remaining_balance DROP NOT NULL,
ALTER COLUMN payment_method DROP NOT NULL,
ALTER COLUMN patient_signature_name DROP NOT NULL,
ALTER COLUMN patient_signature_first_name DROP NOT NULL,
ALTER COLUMN patient_signature_last_name DROP NOT NULL,
ALTER COLUMN patient_signature_date DROP NOT NULL,
ALTER COLUMN provider_signature_name DROP NOT NULL,
ALTER COLUMN provider_signature_first_name DROP NOT NULL,
ALTER COLUMN provider_signature_last_name DROP NOT NULL,
ALTER COLUMN provider_signature_date DROP NOT NULL;

ALTER TABLE public.ibogaine_consent_forms
ALTER COLUMN date_of_birth DROP NOT NULL,
ALTER COLUMN address DROP NOT NULL,
ALTER COLUMN treatment_date DROP NOT NULL,
ALTER COLUMN facilitator_doctor_name DROP NOT NULL,
ALTER COLUMN signature_data DROP NOT NULL,
ALTER COLUMN signature_date DROP NOT NULL,
ALTER COLUMN signature_name DROP NOT NULL;

-- Create form_defaults table for fixed/default values
CREATE TABLE IF NOT EXISTS public.form_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_type TEXT NOT NULL UNIQUE CHECK (form_type IN ('service_agreement', 'ibogaine_consent')),
  default_values JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Insert default values (can be updated later by admin)
INSERT INTO public.form_defaults (form_type, default_values)
VALUES 
  (
    'service_agreement',
    '{
      "deposit_percentage": 40.00,
      "provider_signature_name": "Iboga Wellness Institute"
    }'::jsonb
  ),
  (
    'ibogaine_consent',
    '{
      "treatment_date": null
    }'::jsonb
  )
ON CONFLICT (form_type) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS form_defaults_form_type_idx ON public.form_defaults(form_type);

-- Enable RLS
ALTER TABLE public.form_defaults ENABLE ROW LEVEL SECURITY;

-- RLS Policies for form_defaults
CREATE POLICY "Admins and owners can view form defaults"
  ON public.form_defaults
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins and owners can update form defaults"
  ON public.form_defaults
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

-- Create function to auto-create forms when medical history is submitted
CREATE OR REPLACE FUNCTION public.auto_create_forms_after_medical_history()
RETURNS TRIGGER AS $$
DECLARE
  v_patient_id UUID;
  v_intake_form_id UUID;
  v_patient_email TEXT;
  v_patient_first_name TEXT;
  v_patient_last_name TEXT;
  v_patient_phone TEXT;
  v_date_of_birth DATE;
  v_address TEXT;
  v_service_defaults JSONB;
  v_consent_defaults JSONB;
  v_deposit_pct DECIMAL;
BEGIN
  -- Get patient information from medical history form
  v_patient_email := NEW.email;
  v_patient_first_name := NEW.first_name;
  v_patient_last_name := NEW.last_name;
  v_patient_phone := NEW.phone_number;
  v_date_of_birth := NEW.date_of_birth;
  v_intake_form_id := NEW.intake_form_id;
  
  -- Try to find patient_id by email
  SELECT id INTO v_patient_id
  FROM public.profiles
  WHERE email = v_patient_email
  AND role = 'patient'
  LIMIT 1;
  
  -- Get address from intake form if available
  IF v_intake_form_id IS NOT NULL THEN
    SELECT 
      COALESCE(
        address || 
        CASE WHEN city IS NOT NULL THEN ', ' || city ELSE '' END ||
        CASE WHEN state IS NOT NULL THEN ', ' || state ELSE '' END ||
        CASE WHEN zip_code IS NOT NULL THEN ' ' || zip_code ELSE '' END,
        address,
        ''
      )
    INTO v_address
    FROM public.patient_intake_forms
    WHERE id = v_intake_form_id;
  END IF;
  
  -- Get default values
  SELECT default_values INTO v_service_defaults
  FROM public.form_defaults
  WHERE form_type = 'service_agreement';
  
  SELECT default_values INTO v_consent_defaults
  FROM public.form_defaults
  WHERE form_type = 'ibogaine_consent';
  
  -- Get deposit percentage from defaults (if available)
  IF v_service_defaults IS NOT NULL THEN
    v_deposit_pct := (v_service_defaults->>'deposit_percentage')::DECIMAL;
  END IF;
  
  -- Create Service Agreement row (only if it doesn't exist)
  IF NOT EXISTS (
    SELECT 1 FROM public.service_agreements
    WHERE (patient_id = v_patient_id OR (v_patient_id IS NULL AND patient_email = v_patient_email))
    AND (intake_form_id = v_intake_form_id OR (v_intake_form_id IS NULL AND intake_form_id IS NULL))
  ) THEN
    INSERT INTO public.service_agreements (
      patient_id,
      intake_form_id,
      patient_first_name,
      patient_last_name,
      patient_email,
      patient_phone_number,
      is_activated,
      total_program_fee,
      deposit_amount,
      deposit_percentage,
      remaining_balance,
      payment_method,
      provider_signature_name,
      provider_signature_first_name,
      provider_signature_last_name
    ) VALUES (
      v_patient_id,
      v_intake_form_id,
      v_patient_first_name,
      v_patient_last_name,
      v_patient_email,
      v_patient_phone,
      false, -- is_activated = false by default
      NULL, -- total_program_fee - admin will fill
      NULL, -- deposit_amount - admin will fill
      v_deposit_pct, -- From defaults (deposit_percentage)
      NULL, -- remaining_balance - admin will fill
      NULL, -- payment_method - admin will fill
      COALESCE(v_service_defaults->>'provider_signature_name', NULL), -- From defaults
      NULL, -- provider_signature_first_name - admin will fill
      NULL -- provider_signature_last_name - admin will fill
    );
  END IF;
  
  -- Create Ibogaine Consent Form row (only if it doesn't exist)
  IF NOT EXISTS (
    SELECT 1 FROM public.ibogaine_consent_forms
    WHERE (patient_id = v_patient_id OR (v_patient_id IS NULL AND email = v_patient_email))
    AND (intake_form_id = v_intake_form_id OR (v_intake_form_id IS NULL AND intake_form_id IS NULL))
  ) THEN
    INSERT INTO public.ibogaine_consent_forms (
      patient_id,
      intake_form_id,
      first_name,
      last_name,
      date_of_birth,
      phone_number,
      email,
      address,
      treatment_date,
      facilitator_doctor_name,
      is_activated,
      signature_data,
      signature_date,
      signature_name
    ) VALUES (
      v_patient_id,
      v_intake_form_id,
      v_patient_first_name,
      v_patient_last_name,
      v_date_of_birth,
      v_patient_phone,
      v_patient_email,
      COALESCE(v_address, ''),
      NULL, -- treatment_date - admin will fill
      NULL, -- facilitator_doctor_name - admin will fill
      false, -- is_activated = false by default
      NULL, -- Signature will be filled by patient
      NULL,
      NULL
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the medical history insert
    RAISE WARNING 'Error in auto_create_forms_after_medical_history: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_create_forms_after_medical_history ON public.medical_history_forms;

CREATE TRIGGER trigger_auto_create_forms_after_medical_history
  AFTER INSERT ON public.medical_history_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_forms_after_medical_history();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.auto_create_forms_after_medical_history() TO postgres;
GRANT EXECUTE ON FUNCTION public.auto_create_forms_after_medical_history() TO service_role;

-- Create function to check if admin fields are complete (for validation before activation)
CREATE OR REPLACE FUNCTION public.check_service_agreement_admin_fields_complete(form_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_form RECORD;
BEGIN
  SELECT * INTO v_form
  FROM public.service_agreements
  WHERE id = form_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check if all required admin fields are filled
  RETURN (
    v_form.total_program_fee IS NOT NULL AND
    v_form.deposit_amount IS NOT NULL AND
    v_form.deposit_percentage IS NOT NULL AND
    v_form.remaining_balance IS NOT NULL AND
    v_form.payment_method IS NOT NULL AND
    v_form.provider_signature_name IS NOT NULL AND
    v_form.provider_signature_first_name IS NOT NULL AND
    v_form.provider_signature_last_name IS NOT NULL AND
    v_form.provider_signature_date IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.check_ibogaine_consent_admin_fields_complete(form_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_form RECORD;
BEGIN
  SELECT * INTO v_form
  FROM public.ibogaine_consent_forms
  WHERE id = form_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check if all required admin fields are filled
  RETURN (
    v_form.treatment_date IS NOT NULL AND
    v_form.facilitator_doctor_name IS NOT NULL AND
    v_form.date_of_birth IS NOT NULL AND
    v_form.address IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.check_service_agreement_admin_fields_complete(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_ibogaine_consent_admin_fields_complete(UUID) TO authenticated;

