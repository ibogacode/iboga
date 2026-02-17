-- Update beds/capacity limit from 4 to 5
-- Default for new rows
ALTER TABLE public.treatment_schedule
  ALTER COLUMN capacity_max SET DEFAULT 5;

-- Optionally update existing rows that still have 4 (so UI and logic use 5)
UPDATE public.treatment_schedule
  SET capacity_max = 5
  WHERE capacity_max = 4;

COMMENT ON COLUMN public.treatment_schedule.capacity_max IS 'Max capacity (beds) per day; default 5.';
