-- Create storage bucket for medical history documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical-history-documents',
  'medical-history-documents',
  false, -- Private bucket for medical documents
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for medical history documents bucket

-- Owners and admins can view documents
CREATE POLICY "Owners and admins can view medical history documents"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'medical-history-documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

-- Public can upload documents (for form submissions)
CREATE POLICY "Public can upload medical history documents"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'medical-history-documents');

-- Owners and admins can update documents
CREATE POLICY "Owners and admins can update medical history documents"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'medical-history-documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    bucket_id = 'medical-history-documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

-- Owners and admins can delete documents
CREATE POLICY "Owners and admins can delete medical history documents"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'medical-history-documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );
