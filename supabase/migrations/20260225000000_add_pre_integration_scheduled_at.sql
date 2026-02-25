-- Pre-integration session (Ray): track when client schedules pre-integration call.
-- Medical clearance is considered done when BOTH consult_scheduled_at (Daisy) and pre_integration_scheduled_at (Ray) are set.

ALTER TABLE public.patient_onboarding
  ADD COLUMN IF NOT EXISTS pre_integration_scheduled_at TIMESTAMPTZ;

COMMENT ON COLUMN public.patient_onboarding.pre_integration_scheduled_at IS 'When the client scheduled (or was marked as having scheduled) a pre-integration session with Ray (psychotherapist); required for medical clearance together with Clinical Director consult.';

-- Set medical_clearance = true when both consult_scheduled_at and pre_integration_scheduled_at are set
CREATE OR REPLACE FUNCTION public.set_medical_clearance_on_both_consults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.consult_scheduled_at IS NOT NULL AND NEW.pre_integration_scheduled_at IS NOT NULL THEN
    NEW.medical_clearance := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_medical_clearance_on_both_consults ON public.patient_onboarding;
CREATE TRIGGER trg_set_medical_clearance_on_both_consults
  BEFORE INSERT OR UPDATE OF consult_scheduled_at, pre_integration_scheduled_at
  ON public.patient_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION public.set_medical_clearance_on_both_consults();

-- Backfill: set medical_clearance for existing rows that have both dates (in case they were set before this migration)
UPDATE public.patient_onboarding
SET medical_clearance = true
WHERE consult_scheduled_at IS NOT NULL
  AND pre_integration_scheduled_at IS NOT NULL
  AND (medical_clearance IS NULL OR medical_clearance = false);
