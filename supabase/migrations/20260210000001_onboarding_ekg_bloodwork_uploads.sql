-- =============================================================================
-- Onboarding EKG and Bloodwork uploads
-- Clients in onboarding must upload EKG and Bloodwork results; when both are
-- uploaded, Omar is notified that the client is ready for tapering schedule.
-- =============================================================================

BEGIN;

-- 1. Table for onboarding medical documents (EKG, Bloodwork)
CREATE TABLE IF NOT EXISTS public.onboarding_medical_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id UUID NOT NULL REFERENCES public.patient_onboarding(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('ekg', 'bloodwork')),
  document_path TEXT NOT NULL,
  document_name TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (onboarding_id, document_type)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_medical_documents_onboarding_id
  ON public.onboarding_medical_documents(onboarding_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_medical_documents_type
  ON public.onboarding_medical_documents(document_type);

ALTER TABLE public.onboarding_medical_documents ENABLE ROW LEVEL SECURITY;

-- Staff can view all
CREATE POLICY "Staff can view onboarding medical documents"
  ON public.onboarding_medical_documents FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin', 'manager', 'doctor', 'nurse', 'psych')
    )
  );

-- Patient can view their own (via onboarding they own)
CREATE POLICY "Patients can view own onboarding medical documents"
  ON public.onboarding_medical_documents FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patient_onboarding o
      WHERE o.id = onboarding_id AND (o.patient_id = auth.uid() OR o.email = (SELECT email FROM public.profiles WHERE id = auth.uid()))
    )
  );

-- Patient can insert for their own onboarding (one row per type; replace via app logic)
CREATE POLICY "Patients can insert own onboarding medical documents"
  ON public.onboarding_medical_documents FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patient_onboarding o
      WHERE o.id = onboarding_id AND (o.patient_id = auth.uid() OR o.email = (SELECT email FROM public.profiles WHERE id = auth.uid()))
    )
  );

-- Patient can update/delete their own (for replace)
CREATE POLICY "Patients can update own onboarding medical documents"
  ON public.onboarding_medical_documents FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patient_onboarding o
      WHERE o.id = onboarding_id AND (o.patient_id = auth.uid() OR o.email = (SELECT email FROM public.profiles WHERE id = auth.uid()))
    )
  );

CREATE POLICY "Patients can delete own onboarding medical documents"
  ON public.onboarding_medical_documents FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patient_onboarding o
      WHERE o.id = onboarding_id AND (o.patient_id = auth.uid() OR o.email = (SELECT email FROM public.profiles WHERE id = auth.uid()))
    )
  );

-- 2. Track when we notified Omar (client ready for tapering) to avoid duplicate emails
ALTER TABLE public.patient_onboarding
  ADD COLUMN IF NOT EXISTS ready_for_tapering_notified_at TIMESTAMPTZ;

-- 3. Storage bucket for EKG/Bloodwork uploads (path: {onboarding_id}/{ekg|bloodwork}/{filename})
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'onboarding-medical-documents',
  'onboarding-medical-documents',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Staff can view all objects in bucket
CREATE POLICY "Staff can view onboarding medical documents storage"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'onboarding-medical-documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin', 'manager', 'doctor', 'nurse', 'psych')
    )
  );

-- Patient can view objects under their onboarding folder
-- Path format: {onboarding_id}/{type}/{filename} - first segment is onboarding_id
CREATE POLICY "Patients can view own onboarding medical documents storage"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'onboarding-medical-documents' AND
    (storage.foldername(name))[1] IN (
      SELECT o.id::text FROM public.patient_onboarding o
      WHERE o.patient_id = auth.uid() OR o.email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Patient can upload to their onboarding folder only
CREATE POLICY "Patients can upload onboarding medical documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'onboarding-medical-documents' AND
    (storage.foldername(name))[1] IN (
      SELECT o.id::text FROM public.patient_onboarding o
      WHERE o.patient_id = auth.uid() OR o.email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Patient can update/delete their own files (for replace)
CREATE POLICY "Patients can update own onboarding medical documents storage"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'onboarding-medical-documents' AND
    (storage.foldername(name))[1] IN (
      SELECT o.id::text FROM public.patient_onboarding o
      WHERE o.patient_id = auth.uid() OR o.email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Patients can delete own onboarding medical documents storage"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'onboarding-medical-documents' AND
    (storage.foldername(name))[1] IN (
      SELECT o.id::text FROM public.patient_onboarding o
      WHERE o.patient_id = auth.uid() OR o.email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    )
  );

COMMIT;
