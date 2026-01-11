-- Add filled_by_name column to daily psychological updates
-- This stores the name of the staff member who filled the form

ALTER TABLE public.patient_management_daily_psychological_updates
  ADD COLUMN IF NOT EXISTS filled_by_name TEXT;

COMMENT ON COLUMN public.patient_management_daily_psychological_updates.filled_by_name IS 'Name of the staff member who filled/submitted the form';
