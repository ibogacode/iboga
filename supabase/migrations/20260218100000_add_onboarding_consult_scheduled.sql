-- =============================================================================
-- Onboarding: track when client schedules consult with Clinical Director
-- Used to show "Consultation with Clinical Director" task and mark it complete
-- =============================================================================

ALTER TABLE public.patient_onboarding
  ADD COLUMN IF NOT EXISTS consult_scheduled_at TIMESTAMPTZ;

COMMENT ON COLUMN public.patient_onboarding.consult_scheduled_at IS 'When the client scheduled (or was marked as having scheduled) a consult with the Clinical Director; used to complete the onboarding task.';
