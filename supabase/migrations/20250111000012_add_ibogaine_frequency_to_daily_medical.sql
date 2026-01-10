-- =============================================================================
-- Add ibogaine frequency field to daily medical update
-- =============================================================================
-- Adds field to track if ibogaine is served once or twice a day
-- =============================================================================

BEGIN;

-- Add ibogaine frequency field
ALTER TABLE public.patient_management_daily_medical_updates
  ADD COLUMN IF NOT EXISTS ibogaine_frequency TEXT CHECK (ibogaine_frequency IN ('once', 'twice', NULL));

-- Add comment
COMMENT ON COLUMN public.patient_management_daily_medical_updates.ibogaine_frequency IS 'Frequency of ibogaine administration: once or twice per day';

COMMIT;
