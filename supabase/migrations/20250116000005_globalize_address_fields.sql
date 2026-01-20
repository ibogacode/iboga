-- Globalize address fields: Add address_line_1, address_line_2, remove state dropdown, make country free text
-- This migration converts existing address structure to a global format

BEGIN;

-- ============================================================================
-- PATIENT_INTAKE_FORMS
-- ============================================================================

-- Add new address fields
ALTER TABLE public.patient_intake_forms
ADD COLUMN IF NOT EXISTS address_line_1 TEXT,
ADD COLUMN IF NOT EXISTS address_line_2 TEXT;

-- Migrate existing data: address -> address_line_1
UPDATE public.patient_intake_forms
SET address_line_1 = address
WHERE address IS NOT NULL AND address_line_1 IS NULL;

-- Remove country constraint (make it free text for any country)
ALTER TABLE public.patient_intake_forms
DROP CONSTRAINT IF EXISTS patient_intake_forms_country_check;

-- Keep state field for backward compatibility but make it optional
-- (We won't delete it to preserve existing data, but it won't be used in forms)

-- Add comments
COMMENT ON COLUMN public.patient_intake_forms.address_line_1 IS 'Address Line 1 (required) - Street address';
COMMENT ON COLUMN public.patient_intake_forms.address_line_2 IS 'Address Line 2 (optional) - Apartment, suite, unit, building, floor, etc.';
COMMENT ON COLUMN public.patient_intake_forms.country IS 'Country name (free text, no restrictions)';
COMMENT ON COLUMN public.patient_intake_forms.state IS 'State/Province (deprecated - kept for backward compatibility)';

-- ============================================================================
-- PARTIAL_INTAKE_FORMS
-- ============================================================================

-- Add new address fields
ALTER TABLE public.partial_intake_forms
ADD COLUMN IF NOT EXISTS address_line_1 TEXT,
ADD COLUMN IF NOT EXISTS address_line_2 TEXT;

-- Migrate existing data: address -> address_line_1
UPDATE public.partial_intake_forms
SET address_line_1 = address
WHERE address IS NOT NULL AND address_line_1 IS NULL;

-- Remove country constraint (make it free text for any country)
ALTER TABLE public.partial_intake_forms
DROP CONSTRAINT IF EXISTS partial_intake_forms_country_check;

-- Add comments
COMMENT ON COLUMN public.partial_intake_forms.address_line_1 IS 'Address Line 1 (required) - Street address';
COMMENT ON COLUMN public.partial_intake_forms.address_line_2 IS 'Address Line 2 (optional) - Apartment, suite, unit, building, floor, etc.';
COMMENT ON COLUMN public.partial_intake_forms.country IS 'Country name (free text, no restrictions)';
COMMENT ON COLUMN public.partial_intake_forms.state IS 'State/Province (deprecated - kept for backward compatibility)';

COMMIT;
