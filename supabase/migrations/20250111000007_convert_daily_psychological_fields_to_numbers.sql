-- =============================================================================
-- Convert daily psychological update fields from TEXT to INTEGER
-- =============================================================================
-- Changes how_guest_looks_physically and how_guest_describes_feeling from
-- TEXT to INTEGER (1-10 scale) to support slider/bar inputs
-- =============================================================================

BEGIN;

-- Convert how_guest_looks_physically from TEXT NOT NULL to INTEGER NOT NULL
-- First, make it nullable temporarily to allow conversion
ALTER TABLE public.patient_management_daily_psychological_updates
  ALTER COLUMN how_guest_looks_physically DROP NOT NULL;

-- Convert the column type, handling existing text values
ALTER TABLE public.patient_management_daily_psychological_updates
  ALTER COLUMN how_guest_looks_physically TYPE INTEGER
  USING CASE 
    WHEN how_guest_looks_physically ~ '^[0-9]+$' THEN how_guest_looks_physically::INTEGER
    WHEN how_guest_looks_physically IS NULL OR how_guest_looks_physically = '' THEN 5
    ELSE 5 -- Default to 5 for non-numeric values
  END;

-- Set default value and make it NOT NULL again
ALTER TABLE public.patient_management_daily_psychological_updates
  ALTER COLUMN how_guest_looks_physically SET DEFAULT 5,
  ALTER COLUMN how_guest_looks_physically SET NOT NULL;

-- Add constraint to ensure values are between 1 and 10
ALTER TABLE public.patient_management_daily_psychological_updates
  ADD CONSTRAINT daily_psychological_how_guest_looks_check 
  CHECK (how_guest_looks_physically >= 1 AND how_guest_looks_physically <= 10);

-- Convert how_guest_describes_feeling from TEXT NOT NULL to INTEGER NOT NULL
-- First, make it nullable temporarily to allow conversion
ALTER TABLE public.patient_management_daily_psychological_updates
  ALTER COLUMN how_guest_describes_feeling DROP NOT NULL;

-- Convert the column type, handling existing text values
ALTER TABLE public.patient_management_daily_psychological_updates
  ALTER COLUMN how_guest_describes_feeling TYPE INTEGER
  USING CASE 
    WHEN how_guest_describes_feeling ~ '^[0-9]+$' THEN how_guest_describes_feeling::INTEGER
    WHEN how_guest_describes_feeling IS NULL OR how_guest_describes_feeling = '' THEN 5
    ELSE 5 -- Default to 5 for non-numeric values
  END;

-- Set default value and make it NOT NULL again
ALTER TABLE public.patient_management_daily_psychological_updates
  ALTER COLUMN how_guest_describes_feeling SET DEFAULT 5,
  ALTER COLUMN how_guest_describes_feeling SET NOT NULL;

-- Add constraint to ensure values are between 1 and 10
ALTER TABLE public.patient_management_daily_psychological_updates
  ADD CONSTRAINT daily_psychological_how_guest_feeling_check 
  CHECK (how_guest_describes_feeling >= 1 AND how_guest_describes_feeling <= 10);

COMMIT;
