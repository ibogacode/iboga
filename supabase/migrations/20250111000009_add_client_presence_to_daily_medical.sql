-- =============================================================================
-- Add client presence status to daily medical update
-- =============================================================================
-- Adds fields to track if client is present at the institute for each time period
-- This allows staff to skip vital signs entry when client is not present
-- =============================================================================

BEGIN;

-- Add client presence fields for each time period
ALTER TABLE public.patient_management_daily_medical_updates
  ADD COLUMN IF NOT EXISTS morning_client_present BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS afternoon_client_present BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS night_client_present BOOLEAN DEFAULT true;

-- Add comments for clarity
COMMENT ON COLUMN public.patient_management_daily_medical_updates.morning_client_present IS 'Whether the client was present at the institute during morning check';
COMMENT ON COLUMN public.patient_management_daily_medical_updates.afternoon_client_present IS 'Whether the client was present at the institute during afternoon check';
COMMENT ON COLUMN public.patient_management_daily_medical_updates.night_client_present IS 'Whether the client was present at the institute during night check';

COMMIT;
