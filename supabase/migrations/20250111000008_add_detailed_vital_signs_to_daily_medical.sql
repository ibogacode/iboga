-- =============================================================================
-- Add detailed vital sign fields to daily medical update
-- =============================================================================
-- Adds specific fields for blood pressure, heart rate, and oxygen saturation
-- for each time period (Morning, Afternoon, Night)
-- =============================================================================

BEGIN;

-- Add new vital sign fields for Morning
ALTER TABLE public.patient_management_daily_medical_updates
  ADD COLUMN IF NOT EXISTS morning_blood_pressure TEXT,
  ADD COLUMN IF NOT EXISTS morning_heart_rate INTEGER,
  ADD COLUMN IF NOT EXISTS morning_oxygen_saturation INTEGER;

-- Add new vital sign fields for Afternoon
ALTER TABLE public.patient_management_daily_medical_updates
  ADD COLUMN IF NOT EXISTS afternoon_blood_pressure TEXT,
  ADD COLUMN IF NOT EXISTS afternoon_heart_rate INTEGER,
  ADD COLUMN IF NOT EXISTS afternoon_oxygen_saturation INTEGER;

-- Add new vital sign fields for Night
ALTER TABLE public.patient_management_daily_medical_updates
  ADD COLUMN IF NOT EXISTS night_blood_pressure TEXT,
  ADD COLUMN IF NOT EXISTS night_heart_rate INTEGER,
  ADD COLUMN IF NOT EXISTS night_oxygen_saturation INTEGER;

-- Add constraints for heart rate (reasonable range: 30-200 bpm)
ALTER TABLE public.patient_management_daily_medical_updates
  ADD CONSTRAINT daily_medical_morning_heart_rate_check 
  CHECK (morning_heart_rate IS NULL OR (morning_heart_rate >= 30 AND morning_heart_rate <= 200)),
  ADD CONSTRAINT daily_medical_afternoon_heart_rate_check 
  CHECK (afternoon_heart_rate IS NULL OR (afternoon_heart_rate >= 30 AND afternoon_heart_rate <= 200)),
  ADD CONSTRAINT daily_medical_night_heart_rate_check 
  CHECK (night_heart_rate IS NULL OR (night_heart_rate >= 30 AND night_heart_rate <= 200));

-- Add constraints for oxygen saturation (0-100%)
ALTER TABLE public.patient_management_daily_medical_updates
  ADD CONSTRAINT daily_medical_morning_oxygen_saturation_check 
  CHECK (morning_oxygen_saturation IS NULL OR (morning_oxygen_saturation >= 0 AND morning_oxygen_saturation <= 100)),
  ADD CONSTRAINT daily_medical_afternoon_oxygen_saturation_check 
  CHECK (afternoon_oxygen_saturation IS NULL OR (afternoon_oxygen_saturation >= 0 AND afternoon_oxygen_saturation <= 100)),
  ADD CONSTRAINT daily_medical_night_oxygen_saturation_check 
  CHECK (night_oxygen_saturation IS NULL OR (night_oxygen_saturation >= 0 AND night_oxygen_saturation <= 100));

COMMIT;
