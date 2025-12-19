-- Remove service_agreement_accepted and signature fields
-- Add form filler information fields

-- Remove service_agreement_accepted column (no longer used)
ALTER TABLE public.patient_intake_forms
DROP COLUMN IF EXISTS service_agreement_accepted;

-- Remove signature fields (no longer used)
ALTER TABLE public.patient_intake_forms
DROP COLUMN IF EXISTS signature_data;
ALTER TABLE public.patient_intake_forms
DROP COLUMN IF EXISTS signature_date;

-- Add form filler information fields
ALTER TABLE public.patient_intake_forms
ADD COLUMN IF NOT EXISTS filled_by TEXT CHECK (filled_by IN ('self', 'someone_else')) DEFAULT 'self';

ALTER TABLE public.patient_intake_forms
ADD COLUMN IF NOT EXISTS filler_relationship TEXT;

ALTER TABLE public.patient_intake_forms
ADD COLUMN IF NOT EXISTS filler_first_name TEXT;
ALTER TABLE public.patient_intake_forms
ADD COLUMN IF NOT EXISTS filler_last_name TEXT;
ALTER TABLE public.patient_intake_forms
ADD COLUMN IF NOT EXISTS filler_email TEXT;
ALTER TABLE public.patient_intake_forms
ADD COLUMN IF NOT EXISTS filler_phone TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.patient_intake_forms.filled_by IS 'Indicates if the form was filled by the patient themselves or someone else';
COMMENT ON COLUMN public.patient_intake_forms.filler_relationship IS 'Relationship of the person filling out the form to the patient (if not self)';
COMMENT ON COLUMN public.patient_intake_forms.filler_first_name IS 'First name of the person filling out the form (if not patient)';
COMMENT ON COLUMN public.patient_intake_forms.filler_last_name IS 'Last name of the person filling out the form (if not patient)';
COMMENT ON COLUMN public.patient_intake_forms.filler_email IS 'Email of the person filling out the form (if not patient)';
COMMENT ON COLUMN public.patient_intake_forms.filler_phone IS 'Phone number of the person filling out the form (if not patient)';
