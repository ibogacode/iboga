-- Create storage buckets for existing patient documents
-- These buckets will be used for uploading documents when adding existing patients

-- Intake Form Documents Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'intake-form-documents',
  'intake-form-documents',
  false, -- Private bucket
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for intake form documents bucket
CREATE POLICY "Owners and admins can view intake form documents"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'intake-form-documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'manager', 'doctor', 'nurse')
    )
  );

CREATE POLICY "Owners and admins can upload intake form documents"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'intake-form-documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can update intake form documents"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'intake-form-documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    bucket_id = 'intake-form-documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can delete intake form documents"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'intake-form-documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

-- Ibogaine Consent Documents Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ibogaine-consent-documents',
  'ibogaine-consent-documents',
  false, -- Private bucket
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for ibogaine consent documents bucket
CREATE POLICY "Owners and admins can view ibogaine consent documents"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'ibogaine-consent-documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'manager', 'doctor', 'nurse')
    )
  );

CREATE POLICY "Owners and admins can upload ibogaine consent documents"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'ibogaine-consent-documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can update ibogaine consent documents"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'ibogaine-consent-documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    bucket_id = 'ibogaine-consent-documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can delete ibogaine consent documents"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'ibogaine-consent-documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

