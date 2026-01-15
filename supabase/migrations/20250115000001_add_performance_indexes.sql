-- =============================================================================
-- Add Performance Indexes for Patient Pipeline
-- Optimizes query performance for filtering and lookups
-- =============================================================================

BEGIN;

-- Add index on partial_intake_forms.email for faster filtering
-- This is used when filtering out patients who moved to onboarding/management
CREATE INDEX IF NOT EXISTS partial_intake_forms_email_idx
  ON public.partial_intake_forms(email);

-- Add index on service_agreements.patient_email for faster lookups
-- This is used when checking service agreement completion by email
CREATE INDEX IF NOT EXISTS service_agreements_patient_email_idx
  ON public.service_agreements(patient_email);

-- Add index on existing_patient_documents.partial_intake_form_id for faster lookups
-- This is used when checking uploaded documents for patients
CREATE INDEX IF NOT EXISTS existing_patient_documents_partial_intake_form_id_idx
  ON public.existing_patient_documents(partial_intake_form_id);

-- Add composite index for faster completed form ID lookups on partial forms
CREATE INDEX IF NOT EXISTS partial_intake_forms_completed_form_id_idx
  ON public.partial_intake_forms(completed_form_id)
  WHERE completed_form_id IS NOT NULL;

COMMIT;
