-- Remove file size limit for medical history documents bucket
-- Setting to NULL removes the limit (subject to Supabase project limits)

UPDATE storage.buckets
SET file_size_limit = NULL
WHERE id = 'medical-history-documents';
