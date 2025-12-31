-- =============================================================================
-- Remove payment_method from admin requirements
-- Payment method is now filled by patients, not admins
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1) Update CHECK constraint for service_agreements
--    Remove payment_method requirement (patients fill this)
-- =============================================================================

ALTER TABLE public.service_agreements
  DROP CONSTRAINT IF EXISTS service_agreements_activated_fields_check;

ALTER TABLE public.service_agreements
  ADD CONSTRAINT service_agreements_activated_fields_check
  CHECK (
    (is_activated IS NOT TRUE)
    OR (
      -- Admin/financial fields (required for activation)
      total_program_fee IS NOT NULL AND
      deposit_amount IS NOT NULL AND
      deposit_percentage IS NOT NULL AND
      remaining_balance IS NOT NULL AND
      -- Note: payment_method is filled by patient, not required for activation

      -- Provider signature fields (required for activation)
      provider_signature_name IS NOT NULL AND btrim(provider_signature_name) <> '' AND
      provider_signature_first_name IS NOT NULL AND btrim(provider_signature_first_name) <> '' AND
      provider_signature_last_name IS NOT NULL AND btrim(provider_signature_last_name) <> '' AND
      provider_signature_date IS NOT NULL
      -- Note: Patient signature fields are filled AFTER activation, so not required here
    )
  );

-- =============================================================================
-- 2) Update validation function to remove payment_method check
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_service_agreement_admin_fields_complete(form_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_form public.service_agreements%ROWTYPE;
BEGIN
  SELECT * INTO v_form FROM public.service_agreements WHERE id = form_id;
  IF NOT FOUND THEN RETURN false; END IF;

  RETURN (
    -- Admin/financial fields only (patient fields filled after activation)
    v_form.total_program_fee IS NOT NULL AND
    v_form.deposit_amount IS NOT NULL AND
    v_form.deposit_percentage IS NOT NULL AND
    v_form.remaining_balance IS NOT NULL AND
    -- Note: payment_method is filled by patient, not checked here
    -- Provider signature fields only
    v_form.provider_signature_name IS NOT NULL AND btrim(v_form.provider_signature_name) <> '' AND
    v_form.provider_signature_first_name IS NOT NULL AND btrim(v_form.provider_signature_first_name) <> '' AND
    v_form.provider_signature_last_name IS NOT NULL AND btrim(v_form.provider_signature_last_name) <> '' AND
    v_form.provider_signature_date IS NOT NULL
    -- Patient signature fields NOT checked here - filled after activation
  );
END;
$$;

COMMIT;

