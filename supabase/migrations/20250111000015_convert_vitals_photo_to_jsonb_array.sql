-- Convert photo_of_vitals_medical_notes_url from single TEXT URL to JSONB array of file objects
-- This allows storing multiple file uploads with metadata

BEGIN;

-- Add new JSONB column
ALTER TABLE public.patient_management_daily_medical_updates
ADD COLUMN IF NOT EXISTS vitals_photos JSONB DEFAULT '[]'::jsonb;

-- Migrate existing data: if photo_of_vitals_medical_notes_url has a value, convert it to JSONB array
UPDATE public.patient_management_daily_medical_updates
SET vitals_photos = CASE
  WHEN photo_of_vitals_medical_notes_url IS NOT NULL AND photo_of_vitals_medical_notes_url != '' THEN
    jsonb_build_array(
      jsonb_build_object(
        'url', photo_of_vitals_medical_notes_url,
        'fileName', 'Vitals Photo',
        'fileType', 'image/jpeg'
      )
    )
  ELSE
    '[]'::jsonb
END
WHERE vitals_photos IS NULL OR vitals_photos = '[]'::jsonb;

-- Keep the old column for backward compatibility (can be removed later)
-- ALTER TABLE public.patient_management_daily_medical_updates
-- DROP COLUMN IF EXISTS photo_of_vitals_medical_notes_url;

COMMIT;
