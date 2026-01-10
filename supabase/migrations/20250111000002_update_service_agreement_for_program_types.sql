-- =============================================================================
-- Update Service Agreement for Program Types and Dynamic Fields
-- =============================================================================
-- This migration adds program_type and number_of_days to service_agreements
-- Makes provider signature first/last name optional
-- =============================================================================

BEGIN;

-- 1. Add program_type and number_of_days columns to service_agreements
ALTER TABLE public.service_agreements
  ADD COLUMN IF NOT EXISTS program_type TEXT CHECK (program_type IN ('neurological', 'mental_health', 'addiction')),
  ADD COLUMN IF NOT EXISTS number_of_days INTEGER;

-- 2. Make provider signature first and last name optional
ALTER TABLE public.service_agreements
  ALTER COLUMN provider_signature_first_name DROP NOT NULL,
  ALTER COLUMN provider_signature_last_name DROP NOT NULL;

-- 3. Populate number_of_days for existing activated records that don't have it (default to 14 days)
UPDATE public.service_agreements
SET number_of_days = 14
WHERE is_activated = true 
  AND number_of_days IS NULL;

-- 4. For any activated records that still can't meet the new requirements, deactivate them
-- (This handles edge cases where critical fields are missing)
UPDATE public.service_agreements
SET is_activated = false,
    activated_at = NULL,
    activated_by = NULL
WHERE is_activated = true
  AND (
    total_program_fee IS NULL OR
    deposit_amount IS NULL OR
    deposit_percentage IS NULL OR
    remaining_balance IS NULL OR
    number_of_days IS NULL OR
    provider_signature_name IS NULL OR
    btrim(provider_signature_name) = '' OR
    provider_signature_date IS NULL
  );

-- 5. Update the activation check constraint to include number_of_days and remove provider first/last name requirement
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
      number_of_days IS NOT NULL AND
      -- Note: payment_method is filled by patient, not required for activation

      -- Provider signature fields (required for activation - only full name and date)
      provider_signature_name IS NOT NULL AND btrim(provider_signature_name) <> '' AND
      provider_signature_date IS NOT NULL
      -- Note: provider_signature_first_name and provider_signature_last_name are now optional
      -- Note: Patient signature fields are filled AFTER activation, so not required here
    )
  );

-- 6. Update the check_service_agreement_admin_fields_complete function
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
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check admin fields required for activation
  RETURN (
    v_form.total_program_fee IS NOT NULL AND
    v_form.deposit_amount IS NOT NULL AND
    v_form.deposit_percentage IS NOT NULL AND
    v_form.remaining_balance IS NOT NULL AND
    v_form.number_of_days IS NOT NULL AND
    v_form.provider_signature_name IS NOT NULL AND btrim(v_form.provider_signature_name) <> '' AND
    v_form.provider_signature_date IS NOT NULL
  );
END;
$$;

-- 7. Create index on program_type for filtering
CREATE INDEX IF NOT EXISTS service_agreements_program_type_idx 
  ON public.service_agreements(program_type) 
  WHERE program_type IS NOT NULL;

-- 8. Populate program_type from intake_form if available (for existing records)
UPDATE public.service_agreements sa
SET program_type = (
  SELECT program_type 
  FROM public.patient_intake_forms 
  WHERE id = sa.intake_form_id
  LIMIT 1
)
WHERE sa.intake_form_id IS NOT NULL 
  AND sa.program_type IS NULL;

COMMIT;
