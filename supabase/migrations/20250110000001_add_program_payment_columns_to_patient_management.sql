-- =============================================================================
-- Add Program Tracking Columns to patient_management
-- =============================================================================
-- This migration adds columns for tracking program details for patient 
-- management records. Payment information is not included as existing 
-- patients already have payment completed.
-- =============================================================================

BEGIN;

-- Program Details
ALTER TABLE public.patient_management
  ADD COLUMN IF NOT EXISTS program_start_date DATE,
  ADD COLUMN IF NOT EXISTS program_end_date DATE,
  ADD COLUMN IF NOT EXISTS program_status TEXT CHECK (program_status IN ('scheduled', 'active', 'completed', 'cancelled', 'on_hold')),
  ADD COLUMN IF NOT EXISTS program_notes TEXT,
  ADD COLUMN IF NOT EXISTS program_name TEXT,
  ADD COLUMN IF NOT EXISTS program_duration INTEGER; -- Duration in days

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_patient_management_program_status ON public.patient_management(program_status);
CREATE INDEX IF NOT EXISTS idx_patient_management_program_start_date ON public.patient_management(program_start_date);
CREATE INDEX IF NOT EXISTS idx_patient_management_program_end_date ON public.patient_management(program_end_date);

COMMIT;
