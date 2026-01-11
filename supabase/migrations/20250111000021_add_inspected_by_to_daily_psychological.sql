-- Add inspected_by column to patient_management_daily_psychological_updates table
ALTER TABLE patient_management_daily_psychological_updates
ADD COLUMN IF NOT EXISTS inspected_by TEXT;

-- Add comment for the column
COMMENT ON COLUMN patient_management_daily_psychological_updates.inspected_by IS 'Name of staff member who inspected the patient';
