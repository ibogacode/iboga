-- =============================================================================
-- Remove treatment_date completely from Ibogaine Consent form
-- Treatment date will be assigned after onboarding steps
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1) Update CHECK constraint for ibogaine_consent_forms
--    Remove treatment_date from required fields for activation
-- =============================================================================

ALTER TABLE public.ibogaine_consent_forms
  DROP CONSTRAINT IF EXISTS ibogaine_consent_forms_activated_fields_check;

ALTER TABLE public.ibogaine_consent_forms
  ADD CONSTRAINT ibogaine_consent_forms_activated_fields_check
  CHECK (
    (is_activated IS NOT TRUE)
    OR (
      -- Admin fields (required for activation) - treatment_date removed completely
      facilitator_doctor_name IS NOT NULL AND btrim(facilitator_doctor_name) <> '' AND
      date_of_birth IS NOT NULL AND
      address IS NOT NULL AND btrim(address) <> ''
      -- Note: Patient signature fields are filled AFTER activation, so not required here
      -- Note: treatment_date removed - will be assigned after onboarding steps
    )
  );

-- =============================================================================
-- 2) Update validation function to remove treatment_date check
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_ibogaine_consent_admin_fields_complete(form_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_form public.ibogaine_consent_forms%ROWTYPE;
BEGIN
  SELECT * INTO v_form FROM public.ibogaine_consent_forms WHERE id = form_id;
  IF NOT FOUND THEN RETURN false; END IF;

  RETURN (
    -- Admin fields only (patient signature filled after activation)
    -- treatment_date removed completely
    v_form.facilitator_doctor_name IS NOT NULL AND btrim(v_form.facilitator_doctor_name) <> '' AND
    v_form.date_of_birth IS NOT NULL AND
    v_form.address IS NOT NULL AND btrim(v_form.address) <> ''
    -- Patient signature fields NOT checked here - filled after activation
  );
END;
$$;

COMMIT;
