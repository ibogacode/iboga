-- Add program_type column to patient_intake_forms table
ALTER TABLE public.patient_intake_forms 
ADD COLUMN IF NOT EXISTS program_type TEXT CHECK (program_type IN ('neurological', 'mental_health', 'addiction'));

-- Add comment to explain the column
COMMENT ON COLUMN public.patient_intake_forms.program_type IS 'The type of program the patient is applying for: neurological, mental_health, or addiction';
