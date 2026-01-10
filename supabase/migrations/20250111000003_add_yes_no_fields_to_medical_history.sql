-- Add Yes/No fields and separate file upload columns for physical examination, cardiac evaluation, and liver function tests

ALTER TABLE public.medical_history_forms
  ADD COLUMN IF NOT EXISTS has_physical_examination BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS physical_examination_file_url TEXT,
  ADD COLUMN IF NOT EXISTS physical_examination_file_name TEXT,
  ADD COLUMN IF NOT EXISTS has_cardiac_evaluation BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cardiac_evaluation_file_url TEXT,
  ADD COLUMN IF NOT EXISTS cardiac_evaluation_file_name TEXT,
  ADD COLUMN IF NOT EXISTS has_liver_function_tests BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS liver_function_tests_file_url TEXT,
  ADD COLUMN IF NOT EXISTS liver_function_tests_file_name TEXT;

COMMENT ON COLUMN public.medical_history_forms.has_physical_examination IS 'Whether client has had a physical examination in the last 12 months';
COMMENT ON COLUMN public.medical_history_forms.physical_examination_file_url IS 'URL to uploaded physical examination report file';
COMMENT ON COLUMN public.medical_history_forms.physical_examination_file_name IS 'Name of uploaded physical examination report file';
COMMENT ON COLUMN public.medical_history_forms.has_cardiac_evaluation IS 'Whether client has undergone any cardiac evaluations';
COMMENT ON COLUMN public.medical_history_forms.cardiac_evaluation_file_url IS 'URL to uploaded cardiac evaluation report file';
COMMENT ON COLUMN public.medical_history_forms.cardiac_evaluation_file_name IS 'Name of uploaded cardiac evaluation report file';
COMMENT ON COLUMN public.medical_history_forms.has_liver_function_tests IS 'Whether client has had any liver function tests';
COMMENT ON COLUMN public.medical_history_forms.liver_function_tests_file_url IS 'URL to uploaded liver function test report file';
COMMENT ON COLUMN public.medical_history_forms.liver_function_tests_file_name IS 'Name of uploaded liver function test report file';
