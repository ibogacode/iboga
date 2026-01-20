-- =============================================================================
-- Auto-create onboarding after ibogaine consent form completion
-- This migration creates a trigger that automatically moves patients to
-- onboarding stage when they complete (sign) their ibogaine consent form
-- =============================================================================

BEGIN;

-- =============================================================================
-- PART 1: Create the trigger function
-- =============================================================================

-- This function is called when ibogaine_consent_forms is updated with a signature
-- It bypasses the admin role check since it's triggered by form completion
CREATE OR REPLACE FUNCTION public.auto_create_onboarding_after_consent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email TEXT;
  v_patient_id UUID;
  v_intake_id UUID;
  v_onboarding_id UUID;
  v_first TEXT;
  v_last TEXT;
  v_phone TEXT;
  v_dob DATE;
  v_program TEXT;
  v_addr TEXT;
  v_city TEXT;
  v_state TEXT;
  v_zip TEXT;
  v_ec_first TEXT;
  v_ec_last TEXT;
  v_ec_phone TEXT;
  v_ec_email TEXT;
  v_ec_rel TEXT;
  v_full_name TEXT;
  v_existing_onboarding UUID;
BEGIN
  -- Only proceed if signature is being added (form being completed)
  -- Check: OLD.signature_data is null/empty AND NEW.signature_data has value
  IF (OLD.signature_data IS NULL OR btrim(OLD.signature_data) = '')
     AND NEW.signature_data IS NOT NULL
     AND btrim(NEW.signature_data) != '' THEN

    -- Get patient info from the consent form
    v_email := NEW.email;
    v_patient_id := NEW.patient_id;
    v_intake_id := NEW.intake_form_id;
    v_first := NEW.first_name;
    v_last := NEW.last_name;
    v_phone := NEW.phone_number;
    v_dob := NEW.date_of_birth;
    v_addr := NEW.address;

    -- Check if onboarding already exists for this patient
    SELECT id INTO v_existing_onboarding
    FROM public.patient_onboarding
    WHERE (v_intake_id IS NOT NULL AND intake_form_id = v_intake_id)
       OR (v_patient_id IS NOT NULL AND patient_id = v_patient_id)
       OR (lower(email) = lower(v_email))
    LIMIT 1;

    -- If onboarding already exists, do nothing
    IF v_existing_onboarding IS NOT NULL THEN
      RAISE NOTICE 'Onboarding already exists for patient %, skipping auto-create', v_email;
      RETURN NEW;
    END IF;

    -- Try to get additional data from intake form
    IF v_intake_id IS NOT NULL THEN
      SELECT
        i.program_type,
        i.city, i.state, i.zip_code,
        i.emergency_contact_first_name, i.emergency_contact_last_name,
        i.emergency_contact_phone, i.emergency_contact_email,
        i.emergency_contact_relationship
      INTO
        v_program,
        v_city, v_state, v_zip,
        v_ec_first, v_ec_last, v_ec_phone, v_ec_email, v_ec_rel
      FROM public.patient_intake_forms i
      WHERE i.id = v_intake_id;
    END IF;

    -- Try to find patient_id by email if not set
    IF v_patient_id IS NULL THEN
      SELECT pr.id INTO v_patient_id
      FROM public.profiles pr
      WHERE lower(pr.email) = lower(v_email)
        AND pr.role = 'patient'
      LIMIT 1;
    END IF;

    -- Fallback to profile data if intake data missing
    IF v_program IS NULL AND v_patient_id IS NOT NULL THEN
      SELECT pr.address
      INTO v_addr
      FROM public.profiles pr
      WHERE pr.id = v_patient_id;
    END IF;

    -- Set defaults
    v_first := COALESCE(v_first, '');
    v_last := COALESCE(v_last, '');
    v_full_name := btrim(v_first || ' ' || v_last);

    -- Create onboarding record
    INSERT INTO public.patient_onboarding (
      intake_form_id, patient_id, first_name, last_name, email,
      phone_number, date_of_birth, program_type,
      emergency_contact_name, emergency_contact_phone, emergency_contact_email, emergency_contact_relationship,
      address, city, state, zip_code, status
    )
    VALUES (
      v_intake_id, v_patient_id, v_first, v_last, v_email,
      v_phone, v_dob, v_program,
      NULLIF(btrim(COALESCE(v_ec_first,'') || ' ' || COALESCE(v_ec_last,'')), ''),
      v_ec_phone, v_ec_email, v_ec_rel,
      v_addr, v_city, v_state, v_zip, 'in_progress'
    )
    RETURNING id INTO v_onboarding_id;

    -- Create the 3 required onboarding form rows (informed_dissent and social_media are removed from onboarding)
    -- 1. Release Form
    INSERT INTO public.onboarding_release_forms (
      onboarding_id, patient_id, full_name, date_of_birth, phone_number, email,
      emergency_contact_name, emergency_contact_phone, emergency_contact_email, emergency_contact_relationship
    ) VALUES (
      v_onboarding_id, v_patient_id,
      COALESCE(NULLIF(v_full_name,''), v_email),
      COALESCE(v_dob, CURRENT_DATE),
      COALESCE(v_phone, ''),
      v_email,
      COALESCE(NULLIF(btrim(COALESCE(v_ec_first,'') || ' ' || COALESCE(v_ec_last,'')), ''), ''),
      COALESCE(v_ec_phone, ''),
      COALESCE(v_ec_email, ''),
      COALESCE(v_ec_rel, '')
    ) ON CONFLICT (onboarding_id) DO NOTHING;

    -- 2. Outing Consent Form
    INSERT INTO public.onboarding_outing_consent_forms (
      onboarding_id, patient_id, first_name, last_name, date_of_birth, email
    ) VALUES (
      v_onboarding_id, v_patient_id, v_first, v_last, COALESCE(v_dob, CURRENT_DATE), v_email
    ) ON CONFLICT (onboarding_id) DO NOTHING;

    -- 3. Internal Regulations Form
    INSERT INTO public.onboarding_internal_regulations_forms (
      onboarding_id, patient_id, first_name, last_name, email, phone_number
    ) VALUES (
      v_onboarding_id, v_patient_id, v_first, v_last, v_email, v_phone
    ) ON CONFLICT (onboarding_id) DO NOTHING;

    RAISE NOTICE 'Auto-created onboarding % for patient % after consent form completion', v_onboarding_id, v_email;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the consent form update
    RAISE WARNING 'Error in auto_create_onboarding_after_consent: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- =============================================================================
-- PART 2: Create the trigger on ibogaine_consent_forms
-- =============================================================================

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_auto_create_onboarding_after_consent ON public.ibogaine_consent_forms;

-- Create trigger that fires AFTER UPDATE when signature is added
CREATE TRIGGER trg_auto_create_onboarding_after_consent
  AFTER UPDATE ON public.ibogaine_consent_forms
  FOR EACH ROW
  WHEN (
    (OLD.signature_data IS NULL OR OLD.signature_data = '')
    AND NEW.signature_data IS NOT NULL
    AND NEW.signature_data != ''
  )
  EXECUTE FUNCTION public.auto_create_onboarding_after_consent();

-- =============================================================================
-- PART 3: Also handle INSERT case (when form is submitted with signature)
-- =============================================================================

-- Some patients may submit the form with signature in a single INSERT
CREATE OR REPLACE FUNCTION public.auto_create_onboarding_after_consent_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email TEXT;
  v_patient_id UUID;
  v_intake_id UUID;
  v_onboarding_id UUID;
  v_first TEXT;
  v_last TEXT;
  v_phone TEXT;
  v_dob DATE;
  v_program TEXT;
  v_addr TEXT;
  v_city TEXT;
  v_state TEXT;
  v_zip TEXT;
  v_ec_first TEXT;
  v_ec_last TEXT;
  v_ec_phone TEXT;
  v_ec_email TEXT;
  v_ec_rel TEXT;
  v_full_name TEXT;
  v_existing_onboarding UUID;
BEGIN
  -- Only proceed if signature is present (form is completed)
  IF NEW.signature_data IS NOT NULL AND btrim(NEW.signature_data) != '' THEN

    -- Get patient info from the consent form
    v_email := NEW.email;
    v_patient_id := NEW.patient_id;
    v_intake_id := NEW.intake_form_id;
    v_first := NEW.first_name;
    v_last := NEW.last_name;
    v_phone := NEW.phone_number;
    v_dob := NEW.date_of_birth;
    v_addr := NEW.address;

    -- Check if onboarding already exists for this patient
    SELECT id INTO v_existing_onboarding
    FROM public.patient_onboarding
    WHERE (v_intake_id IS NOT NULL AND intake_form_id = v_intake_id)
       OR (v_patient_id IS NOT NULL AND patient_id = v_patient_id)
       OR (lower(email) = lower(v_email))
    LIMIT 1;

    -- If onboarding already exists, do nothing
    IF v_existing_onboarding IS NOT NULL THEN
      RAISE NOTICE 'Onboarding already exists for patient %, skipping auto-create', v_email;
      RETURN NEW;
    END IF;

    -- Try to get additional data from intake form
    IF v_intake_id IS NOT NULL THEN
      SELECT
        i.program_type,
        i.city, i.state, i.zip_code,
        i.emergency_contact_first_name, i.emergency_contact_last_name,
        i.emergency_contact_phone, i.emergency_contact_email,
        i.emergency_contact_relationship
      INTO
        v_program,
        v_city, v_state, v_zip,
        v_ec_first, v_ec_last, v_ec_phone, v_ec_email, v_ec_rel
      FROM public.patient_intake_forms i
      WHERE i.id = v_intake_id;
    END IF;

    -- Try to find patient_id by email if not set
    IF v_patient_id IS NULL THEN
      SELECT pr.id INTO v_patient_id
      FROM public.profiles pr
      WHERE lower(pr.email) = lower(v_email)
        AND pr.role = 'patient'
      LIMIT 1;
    END IF;

    -- Set defaults
    v_first := COALESCE(v_first, '');
    v_last := COALESCE(v_last, '');
    v_full_name := btrim(v_first || ' ' || v_last);

    -- Create onboarding record
    INSERT INTO public.patient_onboarding (
      intake_form_id, patient_id, first_name, last_name, email,
      phone_number, date_of_birth, program_type,
      emergency_contact_name, emergency_contact_phone, emergency_contact_email, emergency_contact_relationship,
      address, city, state, zip_code, status
    )
    VALUES (
      v_intake_id, v_patient_id, v_first, v_last, v_email,
      v_phone, v_dob, v_program,
      NULLIF(btrim(COALESCE(v_ec_first,'') || ' ' || COALESCE(v_ec_last,'')), ''),
      v_ec_phone, v_ec_email, v_ec_rel,
      v_addr, v_city, v_state, v_zip, 'in_progress'
    )
    RETURNING id INTO v_onboarding_id;

    -- Create the 3 required onboarding form rows (informed_dissent and social_media are removed from onboarding)
    INSERT INTO public.onboarding_release_forms (
      onboarding_id, patient_id, full_name, date_of_birth, phone_number, email,
      emergency_contact_name, emergency_contact_phone, emergency_contact_email, emergency_contact_relationship
    ) VALUES (
      v_onboarding_id, v_patient_id,
      COALESCE(NULLIF(v_full_name,''), v_email),
      COALESCE(v_dob, CURRENT_DATE),
      COALESCE(v_phone, ''),
      v_email,
      COALESCE(NULLIF(btrim(COALESCE(v_ec_first,'') || ' ' || COALESCE(v_ec_last,'')), ''), ''),
      COALESCE(v_ec_phone, ''),
      COALESCE(v_ec_email, ''),
      COALESCE(v_ec_rel, '')
    ) ON CONFLICT (onboarding_id) DO NOTHING;

    INSERT INTO public.onboarding_outing_consent_forms (
      onboarding_id, patient_id, first_name, last_name, date_of_birth, email
    ) VALUES (
      v_onboarding_id, v_patient_id, v_first, v_last, COALESCE(v_dob, CURRENT_DATE), v_email
    ) ON CONFLICT (onboarding_id) DO NOTHING;

    INSERT INTO public.onboarding_internal_regulations_forms (
      onboarding_id, patient_id, first_name, last_name, email, phone_number
    ) VALUES (
      v_onboarding_id, v_patient_id, v_first, v_last, v_email, v_phone
    ) ON CONFLICT (onboarding_id) DO NOTHING;

    RAISE NOTICE 'Auto-created onboarding % for patient % after consent form INSERT', v_onboarding_id, v_email;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the consent form insert
    RAISE WARNING 'Error in auto_create_onboarding_after_consent_insert: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_auto_create_onboarding_after_consent_insert ON public.ibogaine_consent_forms;

-- Create trigger that fires AFTER INSERT when signature is present
CREATE TRIGGER trg_auto_create_onboarding_after_consent_insert
  AFTER INSERT ON public.ibogaine_consent_forms
  FOR EACH ROW
  WHEN (NEW.signature_data IS NOT NULL AND NEW.signature_data != '')
  EXECUTE FUNCTION public.auto_create_onboarding_after_consent_insert();

-- =============================================================================
-- PART 4: Comments
-- =============================================================================

COMMENT ON FUNCTION public.auto_create_onboarding_after_consent IS
  'Trigger function: Auto-creates onboarding record and 4 sub-forms when ibogaine consent form is signed (UPDATE)';

COMMENT ON FUNCTION public.auto_create_onboarding_after_consent_insert IS
  'Trigger function: Auto-creates onboarding record and 4 sub-forms when ibogaine consent form is inserted with signature';

COMMIT;
