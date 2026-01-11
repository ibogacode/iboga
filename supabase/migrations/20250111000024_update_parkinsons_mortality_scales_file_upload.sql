-- =============================================================================
-- Update Parkinson's Mortality Scales Form to Support File Uploads
-- =============================================================================
-- Changes scanned_mds_updrs_form_url from single TEXT URL to JSONB array
-- to support multiple file uploads with metadata (like medical history form)
-- =============================================================================

BEGIN;

-- Add new JSONB column for multiple file uploads
ALTER TABLE public.patient_management_parkinsons_mortality_scales
  ADD COLUMN IF NOT EXISTS scanned_mds_updrs_forms JSONB DEFAULT '[]'::jsonb;

-- Migrate existing data: if scanned_mds_updrs_form_url has a value, convert it to JSONB array
UPDATE public.patient_management_parkinsons_mortality_scales
SET scanned_mds_updrs_forms = CASE
  WHEN scanned_mds_updrs_form_url IS NOT NULL AND scanned_mds_updrs_form_url != '' THEN
    jsonb_build_array(
      jsonb_build_object(
        'url', scanned_mds_updrs_form_url,
        'fileName', 'MDS-UPDRS Form'
      )
    )
  ELSE
    '[]'::jsonb
END
WHERE scanned_mds_updrs_forms IS NULL OR scanned_mds_updrs_forms = '[]'::jsonb;

-- Keep the old column for backward compatibility (can be removed later if needed)
-- ALTER TABLE public.patient_management_parkinsons_mortality_scales
--   DROP COLUMN IF EXISTS scanned_mds_updrs_form_url;

-- Add comment
COMMENT ON COLUMN public.patient_management_parkinsons_mortality_scales.scanned_mds_updrs_forms IS 
  'JSONB array of uploaded MDS-UPDRS form files. Each object contains: url, fileName, fileType';

COMMIT;
