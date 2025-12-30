-- Fix RLS Policies for service-agreement-documents bucket
-- Ensure policies allow owners and admins to upload from client-side

-- Drop existing policies if they exist (to recreate them)
DROP POLICY IF EXISTS "Owners and admins can view service agreement documents" ON storage.objects;
DROP POLICY IF EXISTS "Owners and admins can upload service agreement documents" ON storage.objects;
DROP POLICY IF EXISTS "Owners and admins can update service agreement documents" ON storage.objects;
DROP POLICY IF EXISTS "Owners and admins can delete service agreement documents" ON storage.objects;

-- Recreate policies with proper checks
-- Owners and admins can view documents
CREATE POLICY "Owners and admins can view service agreement documents"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'service-agreement-documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'manager', 'doctor', 'nurse')
    )
  );

-- Owners and admins can upload documents (for existing patients)
CREATE POLICY "Owners and admins can upload service agreement documents"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'service-agreement-documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

-- Owners and admins can update documents
CREATE POLICY "Owners and admins can update service agreement documents"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'service-agreement-documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    bucket_id = 'service-agreement-documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

-- Owners and admins can delete documents
CREATE POLICY "Owners and admins can delete service agreement documents"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'service-agreement-documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

