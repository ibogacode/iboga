-- =============================================================================
-- Add submitter name and inspector fields to daily medical update
-- =============================================================================
-- Adds fields to track who submitted the form and who inspected each time period
-- =============================================================================

BEGIN;

-- Add submitter name field
ALTER TABLE public.patient_management_daily_medical_updates
  ADD COLUMN IF NOT EXISTS submitted_by_name TEXT;

-- Add inspector fields for each time period
ALTER TABLE public.patient_management_daily_medical_updates
  ADD COLUMN IF NOT EXISTS morning_inspected_by TEXT,
  ADD COLUMN IF NOT EXISTS afternoon_inspected_by TEXT,
  ADD COLUMN IF NOT EXISTS night_inspected_by TEXT;

-- Add comments
COMMENT ON COLUMN public.patient_management_daily_medical_updates.submitted_by_name IS 'Name of the staff member who submitted the form';
COMMENT ON COLUMN public.patient_management_daily_medical_updates.morning_inspected_by IS 'Name of the staff member who inspected during morning';
COMMENT ON COLUMN public.patient_management_daily_medical_updates.afternoon_inspected_by IS 'Name of the staff member who inspected during afternoon';
COMMENT ON COLUMN public.patient_management_daily_medical_updates.night_inspected_by IS 'Name of the staff member who inspected during night';

COMMIT;
