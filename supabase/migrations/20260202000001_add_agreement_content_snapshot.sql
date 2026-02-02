-- Store the exact agreement text at the time of signing so completed agreements
-- always show what the patient agreed to, even when the template is updated later.
-- New signers see the current template; completed agreements use this snapshot.
ALTER TABLE public.service_agreements
  ADD COLUMN IF NOT EXISTS agreement_content_snapshot TEXT;

COMMENT ON COLUMN public.service_agreements.agreement_content_snapshot IS 'Exact agreement text displayed when the patient signed; used for viewing completed agreements so updates to the template do not change what completed signers see.';

-- Backfill: completed rows that have no snapshot get a sentinel so the constraint below passes.
-- The app treats this sentinel as "use current template" for display (see LEGACY_AGREEMENT_SNAPSHOT in form-content).
UPDATE public.service_agreements
SET agreement_content_snapshot = '[LEGACY_AGREEMENT_SNAPSHOT]'
WHERE patient_signature_data IS NOT NULL
  AND trim(patient_signature_data) != ''
  AND (agreement_content_snapshot IS NULL OR trim(agreement_content_snapshot) = '');

-- Enforce at DB level: completed agreements (have patient signature) must have a snapshot saved.
-- This ensures any INSERT/UPDATE that marks an agreement complete also stores agreement_content_snapshot.
ALTER TABLE public.service_agreements
  DROP CONSTRAINT IF EXISTS service_agreements_completed_must_have_snapshot;

ALTER TABLE public.service_agreements
  ADD CONSTRAINT service_agreements_completed_must_have_snapshot
  CHECK (
    -- Not completed: no patient signature data
    (patient_signature_data IS NULL OR trim(patient_signature_data) = '')
    OR
    -- Completed: must have non-empty snapshot
    (agreement_content_snapshot IS NOT NULL AND trim(agreement_content_snapshot) != '')
  );
