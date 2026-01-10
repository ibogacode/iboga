-- =============================================================================
-- Add vital signs checkboxes to daily medical update
-- =============================================================================
-- Adds fields to track which specific vital signs were checked
-- when "checked_vitals" is true
-- =============================================================================

BEGIN;

-- Add fields for which vitals were checked
ALTER TABLE public.patient_management_daily_medical_updates
  ADD COLUMN IF NOT EXISTS checked_blood_pressure BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS checked_heart_rate BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS checked_oxygen_saturation BOOLEAN DEFAULT false;

-- Add comments for clarity
COMMENT ON COLUMN public.patient_management_daily_medical_updates.checked_blood_pressure IS 'Whether blood pressure was checked';
COMMENT ON COLUMN public.patient_management_daily_medical_updates.checked_heart_rate IS 'Whether heart rate was checked';
COMMENT ON COLUMN public.patient_management_daily_medical_updates.checked_oxygen_saturation IS 'Whether oxygen saturation was checked';

COMMIT;
