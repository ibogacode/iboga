-- Add pay_rate_per_hour field to profiles table for employee payroll calculations

-- Add pay_rate_per_hour column (numeric with 2 decimal places for currency)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS pay_rate_per_hour NUMERIC(10, 2);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.pay_rate_per_hour IS 'Hourly pay rate for employees, stored as numeric for future payroll calculations';
