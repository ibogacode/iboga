-- =============================================================================
-- Add Document Upload Support for Onboarding Forms
-- =============================================================================
-- This migration adds support for admins to upload physically completed forms
-- =============================================================================

BEGIN;

-- 1. Add document_url and uploaded_by fields to onboarding form tables

-- Release Form
ALTER TABLE public.onboarding_release_forms
  ADD COLUMN IF NOT EXISTS document_url TEXT,
  ADD COLUMN IF NOT EXISTS document_path TEXT,
  ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ;

-- Outing Consent Form
ALTER TABLE public.onboarding_outing_consent_forms
  ADD COLUMN IF NOT EXISTS document_url TEXT,
  ADD COLUMN IF NOT EXISTS document_path TEXT,
  ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ;

-- Internal Regulations Form
ALTER TABLE public.onboarding_internal_regulations_forms
  ADD COLUMN IF NOT EXISTS document_url TEXT,
  ADD COLUMN IF NOT EXISTS document_path TEXT,
  ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ;

-- 2. Create storage bucket for onboarding form documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'onboarding-form-documents',
  'onboarding-form-documents',
  false, -- Private bucket
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS Policies for onboarding form documents bucket

-- View policy: Staff can view onboarding form documents
CREATE POLICY "Staff can view onboarding form documents"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'onboarding-form-documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'manager', 'doctor', 'nurse', 'psych')
    )
  );

-- Upload policy: Admin staff can upload onboarding form documents
CREATE POLICY "Admin staff can upload onboarding form documents"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'onboarding-form-documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'manager')
    )
  );

-- Update policy: Admin staff can update onboarding form documents
CREATE POLICY "Admin staff can update onboarding form documents"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'onboarding-form-documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'manager')
    )
  )
  WITH CHECK (
    bucket_id = 'onboarding-form-documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'manager')
    )
  );

-- Delete policy: Admin staff can delete onboarding form documents
CREATE POLICY "Admin staff can delete onboarding form documents"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'onboarding-form-documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'manager')
    )
  );

COMMIT;
