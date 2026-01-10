-- =============================================================================
-- Add facilitator_doctor_name to ibogaine_consent defaults
-- Facilitator/Doctor name will come from defaults table instead of form field
-- =============================================================================

BEGIN;

-- Update form_defaults to include facilitator_doctor_name for ibogaine_consent
UPDATE public.form_defaults
SET default_values = COALESCE(
  default_values || '{"facilitator_doctor_name": "Dr. Omar Calderon"}'::jsonb,
  '{"facilitator_doctor_name": "Dr. Omar Calderon"}'::jsonb
)
WHERE form_type = 'ibogaine_consent';

-- If the row doesn't exist, create it
INSERT INTO public.form_defaults (form_type, default_values)
VALUES 
  (
    'ibogaine_consent',
    '{
      "facilitator_doctor_name": "Dr. Omar Calderon"
    }'::jsonb
  )
ON CONFLICT (form_type) 
DO UPDATE SET 
  default_values = COALESCE(
    form_defaults.default_values || '{"facilitator_doctor_name": "Dr. Omar Calderon"}'::jsonb,
    '{"facilitator_doctor_name": "Dr. Omar Calderon"}'::jsonb
  );

-- Update the validation function to get facilitator_doctor_name from defaults
CREATE OR REPLACE FUNCTION public.check_ibogaine_consent_admin_fields_complete(form_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_form public.ibogaine_consent_forms%ROWTYPE;
  v_defaults JSONB;
  v_facilitator_name TEXT;
BEGIN
  SELECT * INTO v_form FROM public.ibogaine_consent_forms WHERE id = form_id;
  IF NOT FOUND THEN RETURN false; END IF;

  -- Get facilitator_doctor_name from defaults
  SELECT default_values INTO v_defaults
  FROM public.form_defaults
  WHERE form_type = 'ibogaine_consent';
  
  IF v_defaults IS NOT NULL THEN
    v_facilitator_name := v_defaults->>'facilitator_doctor_name';
  END IF;

  RETURN (
    -- Check if facilitator name exists in defaults (not required from form anymore)
    (v_facilitator_name IS NOT NULL AND btrim(v_facilitator_name) <> '') AND
    -- Other required fields from form
    v_form.date_of_birth IS NOT NULL AND
    v_form.address IS NOT NULL AND btrim(v_form.address) <> ''
    -- Patient signature fields NOT checked here - filled after activation
    -- facilitator_doctor_name is now from defaults, not from form
  );
END;
$$;

-- Update CHECK constraint to not require facilitator_doctor_name from form
ALTER TABLE public.ibogaine_consent_forms
  DROP CONSTRAINT IF EXISTS ibogaine_consent_forms_activated_fields_check;

ALTER TABLE public.ibogaine_consent_forms
  ADD CONSTRAINT ibogaine_consent_forms_activated_fields_check
  CHECK (
    (is_activated IS NOT TRUE)
    OR (
      -- Admin fields (required for activation) - facilitator_doctor_name removed (comes from defaults)
      date_of_birth IS NOT NULL AND
      address IS NOT NULL AND btrim(address) <> ''
      -- Note: Patient signature fields are filled AFTER activation, so not required here
      -- Note: facilitator_doctor_name comes from defaults table, not from form
    )
  );

COMMIT;
