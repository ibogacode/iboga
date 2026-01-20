-- =============================================================================
-- Fix facilitator_doctor_name in auto-create triggers and existing forms
-- This migration ensures all ibogaine consent forms have the default facilitator name
-- =============================================================================

BEGIN;

-- Step 1: Update existing forms that have NULL facilitator_doctor_name
UPDATE public.ibogaine_consent_forms
SET facilitator_doctor_name = 'Dr. Omar Calderon'
WHERE facilitator_doctor_name IS NULL OR btrim(facilitator_doctor_name) = '';

-- Step 2: Update the auto_create_forms_after_medical_history function to include default facilitator name
-- IMPORTANT FIX: medical_history_forms does NOT have patient_id or address columns
-- We need to look these up from profiles and intake_forms tables
CREATE OR REPLACE FUNCTION public.auto_create_forms_after_medical_history()
RETURNS TRIGGER AS $$
DECLARE
  v_patient_id UUID;
  v_intake_form_id UUID;
  v_patient_first_name TEXT;
  v_patient_last_name TEXT;
  v_patient_email TEXT;
  v_patient_phone TEXT;
  v_date_of_birth DATE;
  v_address TEXT;
  v_facilitator_name TEXT;
BEGIN
  -- Get patient information from the newly inserted medical history
  -- NOTE: medical_history_forms does NOT have patient_id or address columns!
  v_intake_form_id := NEW.intake_form_id;
  v_patient_first_name := NEW.first_name;
  v_patient_last_name := NEW.last_name;
  v_patient_email := NEW.email;
  v_patient_phone := NEW.phone_number;
  v_date_of_birth := NEW.date_of_birth;

  -- Look up patient_id from profiles table using email
  SELECT id INTO v_patient_id
  FROM public.profiles
  WHERE LOWER(email) = LOWER(v_patient_email)
    AND role = 'patient'
  LIMIT 1;

  -- Get address from patient_intake_forms if intake_form_id is available
  IF v_intake_form_id IS NOT NULL THEN
    SELECT address INTO v_address
    FROM public.patient_intake_forms
    WHERE id = v_intake_form_id;
  END IF;

  -- Fallback: try to get address from profiles if not found
  IF v_address IS NULL AND v_patient_id IS NOT NULL THEN
    SELECT address INTO v_address
    FROM public.profiles
    WHERE id = v_patient_id;
  END IF;

  -- Get default facilitator_doctor_name from form_defaults
  SELECT default_values->>'facilitator_doctor_name'
  INTO v_facilitator_name
  FROM public.form_defaults
  WHERE form_type = 'ibogaine_consent';

  -- Fallback to default if not found
  v_facilitator_name := COALESCE(v_facilitator_name, 'Dr. Omar Calderon');

  -- Create Service Agreement form if it doesn't exist
  -- FIXED: Using correct column names (patient_first_name, patient_last_name, patient_email, patient_phone_number)
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
      number_of_days,
      program_type,
      total_program_fee,
      deposit_amount,
      deposit_percentage,
      remaining_balance,
      is_activated
    ) VALUES (
      v_patient_id,
      v_intake_form_id,
      v_patient_first_name,
      v_patient_last_name,
      v_patient_email,
      COALESCE(v_patient_phone, ''),
      14, -- Default number of days
      NULL, -- program_type - admin will fill
      NULL, -- total_program_fee - admin will fill
      NULL, -- deposit_amount - admin will fill
      NULL, -- deposit_percentage - admin will fill
      NULL, -- remaining_balance - auto-calculated
      false -- is_activated = false by default
    );
  END IF;

  -- Create Ibogaine Consent form if it doesn't exist
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
      v_facilitator_name, -- Use default from form_defaults
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

-- Step 3: Update the create_forms_after_service_agreement_submission function
CREATE OR REPLACE FUNCTION public.create_forms_after_service_agreement_submission()
RETURNS TRIGGER AS $$
DECLARE
  v_patient_id UUID;
  v_intake_form_id UUID;
  v_patient_first_name TEXT;
  v_patient_last_name TEXT;
  v_patient_email TEXT;
  v_patient_phone TEXT;
  v_date_of_birth DATE;
  v_address TEXT;
  v_facilitator_name TEXT;
BEGIN
  -- Only proceed if form is completed
  IF NEW.is_completed IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Get patient information
  v_patient_id := NEW.patient_id;
  v_intake_form_id := NEW.intake_form_id;
  v_patient_first_name := NEW.first_name;
  v_patient_last_name := NEW.last_name;
  v_patient_email := NEW.email;

  -- Get default facilitator_doctor_name from form_defaults
  SELECT default_values->>'facilitator_doctor_name'
  INTO v_facilitator_name
  FROM public.form_defaults
  WHERE form_type = 'ibogaine_consent';

  -- Fallback to default if not found
  v_facilitator_name := COALESCE(v_facilitator_name, 'Dr. Omar Calderon');

  -- Try to get additional info from intake or medical history
  SELECT date_of_birth, address, phone_number
  INTO v_date_of_birth, v_address, v_patient_phone
  FROM public.medical_history_forms
  WHERE patient_id = v_patient_id OR email = v_patient_email
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_date_of_birth IS NULL THEN
    SELECT date_of_birth
    INTO v_date_of_birth
    FROM public.intake_forms
    WHERE id = v_intake_form_id;
  END IF;

  -- Insert Ibogaine Consent draft (race-safe)
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
    v_facilitator_name, -- Use default from form_defaults
    false, -- Not activated by default
    NULL,
    NULL,
    NULL
  )
  ON CONFLICT ON CONSTRAINT ibogaine_consent_forms_dedupe_unique
  DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in create_forms_after_service_agreement_submission: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
