-- =============================================================================
-- EKG and Bloodwork skip tracking
-- Clients can skip uploading EKG/bloodwork; tests done at institute after arrival.
-- =============================================================================

ALTER TABLE public.patient_onboarding
  ADD COLUMN IF NOT EXISTS ekg_skipped BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ekg_skipped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bloodwork_skipped BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS bloodwork_skipped_at TIMESTAMPTZ;
