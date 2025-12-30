-- Create table to store uploaded documents for existing patients
CREATE TABLE IF NOT EXISTS public.existing_patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to partial intake form (existing patient entry)
  partial_intake_form_id UUID REFERENCES public.partial_intake_forms(id) ON DELETE CASCADE,
  
  -- Form type this document represents
  form_type TEXT NOT NULL CHECK (form_type IN ('intake', 'medical', 'service', 'ibogaine')),
  
  -- Document information
  document_url TEXT NOT NULL,
  document_path TEXT, -- Storage path if uploaded to Supabase Storage
  document_name TEXT, -- Original file name
  
  -- Metadata
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS existing_patient_documents_partial_form_id_idx ON public.existing_patient_documents(partial_intake_form_id);
CREATE INDEX IF NOT EXISTS existing_patient_documents_form_type_idx ON public.existing_patient_documents(form_type);
CREATE INDEX IF NOT EXISTS existing_patient_documents_uploaded_by_idx ON public.existing_patient_documents(uploaded_by);

-- Enable RLS
ALTER TABLE public.existing_patient_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Owners and admins can view existing patient documents"
  ON public.existing_patient_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'manager', 'doctor', 'nurse')
    )
  );

CREATE POLICY "Owners and admins can insert existing patient documents"
  ON public.existing_patient_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can update existing patient documents"
  ON public.existing_patient_documents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can delete existing patient documents"
  ON public.existing_patient_documents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_existing_patient_document_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS set_existing_patient_document_updated_at ON public.existing_patient_documents;
CREATE TRIGGER set_existing_patient_document_updated_at
  BEFORE UPDATE ON public.existing_patient_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_existing_patient_document_updated_at();

COMMENT ON TABLE public.existing_patient_documents IS 'Stores uploaded documents for existing patients added to the system';

