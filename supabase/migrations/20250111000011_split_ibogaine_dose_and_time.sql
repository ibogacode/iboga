-- =============================================================================
-- Split ibogaine_dose_time into separate dose and time fields
-- =============================================================================
-- Separates ibogaine dose (in mg) and time into two distinct fields
-- =============================================================================

BEGIN;

-- Add new separate fields
ALTER TABLE public.patient_management_daily_medical_updates
  ADD COLUMN IF NOT EXISTS ibogaine_dose INTEGER,
  ADD COLUMN IF NOT EXISTS ibogaine_time TEXT;

-- Try to extract dose from existing ibogaine_dose_time field if it contains numeric values
-- This is a best-effort migration - existing data format may vary
UPDATE public.patient_management_daily_medical_updates
SET 
  ibogaine_dose = CASE 
    WHEN ibogaine_dose_time ~ '^[0-9]+' THEN (regexp_match(ibogaine_dose_time, '^[0-9]+'))[1]::INTEGER
    WHEN ibogaine_dose_time ~ '[0-9]+' THEN (regexp_match(ibogaine_dose_time, '[0-9]+'))[1]::INTEGER
    ELSE NULL
  END,
  ibogaine_time = CASE 
    WHEN ibogaine_dose_time ~ '[0-9]{1,2}:[0-9]{2}' THEN (regexp_match(ibogaine_dose_time, '[0-9]{1,2}:[0-9]{2}'))[1]
    WHEN ibogaine_dose_time ~ '[0-9]{1,2}:[0-9]{2}\s*(AM|PM|am|pm)' THEN (regexp_match(ibogaine_dose_time, '[0-9]{1,2}:[0-9]{2}\s*(AM|PM|am|pm)'))[1]
    ELSE NULL
  END
WHERE ibogaine_dose_time IS NOT NULL AND ibogaine_dose_time != '';

-- Add comment
COMMENT ON COLUMN public.patient_management_daily_medical_updates.ibogaine_dose IS 'Ibogaine dose in milligrams (mg)';
COMMENT ON COLUMN public.patient_management_daily_medical_updates.ibogaine_time IS 'Time when ibogaine was administered (e.g., 10:00 AM)';

COMMIT;
