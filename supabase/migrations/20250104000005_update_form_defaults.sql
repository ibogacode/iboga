-- Update form_defaults with simplified values
UPDATE public.form_defaults
SET default_values = '{
  "deposit_percentage": 40.00,
  "provider_signature_name": "Iboga Wellness Institute"
}'::jsonb
WHERE form_type = 'service_agreement';

UPDATE public.form_defaults
SET default_values = '{
  "treatment_date": null
}'::jsonb
WHERE form_type = 'ibogaine_consent';

-- Recreate the trigger function with updated logic
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

