-- Billing payment records: admin records payment received (full or partial) and can schedule balance reminder
CREATE TABLE IF NOT EXISTS public.patient_billing_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_agreement_id UUID NOT NULL REFERENCES public.service_agreements(id) ON DELETE CASCADE,
  amount_received DECIMAL(10, 2) NOT NULL CHECK (amount_received >= 0),
  is_full_payment BOOLEAN NOT NULL DEFAULT false,
  payment_received_at TIMESTAMPTZ NOT NULL,
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  next_reminder_date DATE,
  balance_reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS patient_billing_payments_patient_id_idx ON public.patient_billing_payments(patient_id);
CREATE INDEX IF NOT EXISTS patient_billing_payments_service_agreement_id_idx ON public.patient_billing_payments(service_agreement_id);
CREATE INDEX IF NOT EXISTS patient_billing_payments_payment_received_at_idx ON public.patient_billing_payments(payment_received_at DESC);

ALTER TABLE public.patient_billing_payments ENABLE ROW LEVEL SECURITY;

-- Staff (admin, owner, manager) can manage billing payments
CREATE POLICY "Staff can select patient_billing_payments"
  ON public.patient_billing_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner', 'manager')
    )
  );

CREATE POLICY "Staff can insert patient_billing_payments"
  ON public.patient_billing_payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner', 'manager')
    )
  );

CREATE POLICY "Staff can update patient_billing_payments"
  ON public.patient_billing_payments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner', 'manager')
    )
  );

COMMENT ON TABLE public.patient_billing_payments IS 'Records of payments received for a patient; links to service agreement. Admin can record full/partial payment and schedule balance reminder email.';
