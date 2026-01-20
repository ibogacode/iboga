-- Check existing country data before migration
-- Run this query to see what country values currently exist in your database

-- Check patient_intake_forms
SELECT 
  country,
  COUNT(*) as count
FROM public.patient_intake_forms
GROUP BY country
ORDER BY count DESC;

-- Check partial_intake_forms
SELECT 
  country,
  COUNT(*) as count
FROM public.partial_intake_forms
GROUP BY country
ORDER BY count DESC;

-- Show sample records with country codes (if any)
SELECT 
  id,
  first_name,
  last_name,
  email,
  country,
  state,
  zip_code
FROM public.patient_intake_forms
WHERE country IN ('US', 'CA')
LIMIT 10;

SELECT 
  id,
  first_name,
  last_name,
  email,
  country,
  state,
  zip_code
FROM public.partial_intake_forms
WHERE country IN ('US', 'CA')
LIMIT 10;
