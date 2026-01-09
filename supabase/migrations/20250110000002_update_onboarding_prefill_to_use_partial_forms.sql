-- =============================================================================
-- Update create_onboarding_with_prefill to use partial_intake_forms data
-- =============================================================================
-- This migration updates the RPC function to check partial_intake_forms
-- for program_type and other fields when creating onboarding for existing patients
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.create_onboarding_with_prefill(
  p_patient_id UUID DEFAULT NULL,
  p_intake_form_id UUID DEFAULT NULL,
  p_email TEXT DEFAULT NULL
)
RETURNS UUID
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
  -- Temporary variables for partial form data
  pf_program_type TEXT;
  pf_phone TEXT;
  pf_dob DATE;
  pf_addr TEXT;
  pf_city TEXT;
  pf_state TEXT;
  pf_zip TEXT;
  pf_ec_first TEXT;
  pf_ec_last TEXT;
  pf_ec_phone TEXT;
  pf_ec_email TEXT;
  pf_ec_rel TEXT;
BEGIN
  -- Authorization check
  IF NOT public.is_admin_staff_role() THEN
    RAISE EXCEPTION 'Not authorized: admin staff role required';
  END IF;

  v_patient_id := p_patient_id;
  v_intake_id := p_intake_form_id;

  -- Get data from intake form if provided
  IF v_intake_id IS NOT NULL THEN
    SELECT
      i.email, i.first_name, i.last_name, i.phone_number, i.date_of_birth, i.program_type,
      i.address, i.city, i.state, i.zip_code,
      i.emergency_contact_first_name, i.emergency_contact_last_name, i.emergency_contact_phone,
      i.emergency_contact_email, i.emergency_contact_relationship
    INTO
      v_email, v_first, v_last, v_phone, v_dob, v_program,
      v_addr, v_city, v_state, v_zip,
      v_ec_first, v_ec_last, v_ec_phone, v_ec_email, v_ec_rel
    FROM public.patient_intake_forms i
    WHERE i.id = v_intake_id;
    
    IF v_email IS NULL THEN
      RAISE EXCEPTION 'Intake form not found: %', v_intake_id;
    END IF;
  ELSE
    v_email := p_email;
  END IF;

  -- Validate email
  IF v_email IS NULL OR btrim(v_email) = '' THEN
    RAISE EXCEPTION 'Email is required (provide intake_form_id or email)';
  END IF;

  -- Try to find patient_id by email if not provided
  IF v_patient_id IS NULL THEN
    SELECT pr.id INTO v_patient_id
    FROM public.profiles pr
    WHERE lower(pr.email) = lower(v_email)
      AND pr.role = 'patient'
    LIMIT 1;
  END IF;

  -- Fallback to profile data if intake data missing
  IF (v_first IS NULL OR v_last IS NULL) AND v_patient_id IS NOT NULL THEN
    SELECT pr.first_name, pr.last_name, pr.phone, pr.date_of_birth, pr.address
    INTO v_first, v_last, v_phone, v_dob, v_addr
    FROM public.profiles pr
    WHERE pr.id = v_patient_id;
  END IF;

  -- If no intake form data (existing patient flow), try to get from partial_intake_forms
  -- This ensures existing patients get program_type and other fields from partial form
  IF v_intake_id IS NULL AND v_email IS NOT NULL THEN
    BEGIN
      -- Try to get data from partial_intake_forms for existing patients
      SELECT
        pf.program_type, pf.phone_number, pf.date_of_birth,
        pf.address, pf.city, pf.state, pf.zip_code,
        pf.emergency_contact_first_name, pf.emergency_contact_last_name,
        pf.emergency_contact_phone, pf.emergency_contact_email, pf.emergency_contact_relationship
      INTO STRICT
        pf_program_type, pf_phone, pf_dob,
        pf_addr, pf_city, pf_state, pf_zip,
        pf_ec_first, pf_ec_last, pf_ec_phone, pf_ec_email, pf_ec_rel
      FROM public.partial_intake_forms pf
      WHERE lower(pf.email) = lower(v_email)
        AND pf.mode = 'partial'
      ORDER BY pf.created_at DESC
      LIMIT 1;
      
      -- Use partial form data if found (STRICT ensures a row was found)
      IF pf_program_type IS NOT NULL THEN v_program := pf_program_type; END IF;
      IF pf_phone IS NOT NULL THEN v_phone := pf_phone; END IF;
      IF pf_dob IS NOT NULL THEN v_dob := pf_dob; END IF;
      IF pf_addr IS NOT NULL THEN v_addr := pf_addr; END IF;
      IF pf_city IS NOT NULL THEN v_city := pf_city; END IF;
      IF pf_state IS NOT NULL THEN v_state := pf_state; END IF;
      IF pf_zip IS NOT NULL THEN v_zip := pf_zip; END IF;
      IF pf_ec_first IS NOT NULL THEN v_ec_first := pf_ec_first; END IF;
      IF pf_ec_last IS NOT NULL THEN v_ec_last := pf_ec_last; END IF;
      IF pf_ec_phone IS NOT NULL THEN v_ec_phone := pf_ec_phone; END IF;
      IF pf_ec_email IS NOT NULL THEN v_ec_email := pf_ec_email; END IF;
      IF pf_ec_rel IS NOT NULL THEN v_ec_rel := pf_ec_rel; END IF;
    EXCEPTION
      WHEN NO_DATA_FOUND THEN
        -- No partial form found, continue with existing values (from profile)
        NULL;
      WHEN TOO_MANY_ROWS THEN
        -- Should not happen with LIMIT 1, but handle gracefully
        NULL;
    END;
  END IF;

  -- Set defaults
  v_first := COALESCE(v_first, '');
  v_last := COALESCE(v_last, '');
  v_full_name := btrim(v_first || ' ' || v_last);

  -- Check for existing onboarding (by intake_form_id, patient_id, or email)
  SELECT o.id INTO v_onboarding_id
  FROM public.patient_onboarding o
  WHERE (v_intake_id IS NOT NULL AND o.intake_form_id = v_intake_id)
     OR (v_patient_id IS NOT NULL AND o.patient_id = v_patient_id)
     OR (lower(o.email) = lower(v_email))
  ORDER BY o.created_at DESC
  LIMIT 1;

  -- Create onboarding if not exists
  IF v_onboarding_id IS NULL THEN
    INSERT INTO public.patient_onboarding (
      intake_form_id, patient_id, first_name, last_name, email,
      phone_number, date_of_birth, program_type,
      emergency_contact_name, emergency_contact_phone, emergency_contact_email, emergency_contact_relationship,
      address, city, state, zip_code, status, created_by
    )
    VALUES (
      v_intake_id, v_patient_id, v_first, v_last, v_email,
      v_phone, v_dob, v_program,
      NULLIF(btrim(COALESCE(v_ec_first,'') || ' ' || COALESCE(v_ec_last,'')), ''),
      v_ec_phone, v_ec_email, v_ec_rel,
      v_addr, v_city, v_state, v_zip, 'in_progress', auth.uid()
    )
    RETURNING id INTO v_onboarding_id;
  ELSE
    -- Update patient_id if we found one and it's not set
    IF v_patient_id IS NOT NULL THEN
      UPDATE public.patient_onboarding
      SET patient_id = v_patient_id
      WHERE id = v_onboarding_id AND patient_id IS NULL;
    END IF;
  END IF;

  -- Create 5 form rows (idempotent via ON CONFLICT)
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

  INSERT INTO public.onboarding_social_media_forms (
    onboarding_id, patient_id, first_name, last_name, email, phone_number
  ) VALUES (
    v_onboarding_id, v_patient_id, v_first, v_last, v_email, v_phone
  ) ON CONFLICT (onboarding_id) DO NOTHING;

  INSERT INTO public.onboarding_internal_regulations_forms (
    onboarding_id, patient_id, first_name, last_name, email, phone_number
  ) VALUES (
    v_onboarding_id, v_patient_id, v_first, v_last, v_email, v_phone
  ) ON CONFLICT (onboarding_id) DO NOTHING;

  INSERT INTO public.onboarding_informed_dissent_forms (
    onboarding_id, patient_id, first_name, last_name, official_identification, phone_number, address, email
  ) VALUES (
    v_onboarding_id, v_patient_id, v_first, v_last, '', COALESCE(v_phone, ''), COALESCE(v_addr, ''), v_email
  ) ON CONFLICT (onboarding_id) DO NOTHING;

  RETURN v_onboarding_id;
END;
$$;

-- Grant execute permission
REVOKE ALL ON FUNCTION public.create_onboarding_with_prefill(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_onboarding_with_prefill(UUID, UUID, TEXT) TO authenticated;

COMMIT;
