-- Rename pay_rate_per_hour to pay_rate_per_day for employee payroll calculations

-- Rename the column
ALTER TABLE public.profiles
RENAME COLUMN pay_rate_per_hour TO pay_rate_per_day;

-- Update comment for documentation
COMMENT ON COLUMN public.profiles.pay_rate_per_day IS 'Daily pay rate for employees, stored as numeric for future payroll calculations';

