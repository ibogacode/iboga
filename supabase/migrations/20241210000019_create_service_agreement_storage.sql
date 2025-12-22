-- Create storage bucket for service agreement documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-agreement-documents',
  'service-agreement-documents',
  false, -- Private bucket for service agreement documents
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for service agreement documents bucket

-- Owners and admins can view documents
CREATE POLICY "Owners and admins can view service agreement documents"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'service-agreement-documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

-- Owners and admins can upload documents
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
