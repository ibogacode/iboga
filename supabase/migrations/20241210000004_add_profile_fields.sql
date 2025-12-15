-- Add date_of_birth, address, and gender fields to profiles table

-- Add date_of_birth field
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Add address field (using text for flexibility, can store full address)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add gender field with check constraint for valid values
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer-not-to-say') OR gender IS NULL);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.date_of_birth IS 'User date of birth';
COMMENT ON COLUMN public.profiles.address IS 'User street address or full address';
COMMENT ON COLUMN public.profiles.gender IS 'User gender: male, female, other, or prefer-not-to-say';
