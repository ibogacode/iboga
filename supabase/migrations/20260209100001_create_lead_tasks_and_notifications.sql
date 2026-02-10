-- Lead tasks: custom tasks for a lead (patient profile page identified by lead_id = page param)
CREATE TABLE IF NOT EXISTS public.lead_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  due_date DATE,
  assigned_to_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_tasks_lead_id ON public.lead_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_assigned_to ON public.lead_tasks(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_due_date ON public.lead_tasks(due_date);

ALTER TABLE public.lead_tasks ENABLE ROW LEVEL SECURITY;

-- Staff can manage tasks for any lead
CREATE POLICY "Staff can view lead tasks"
  ON public.lead_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'admin', 'manager', 'doctor', 'nurse', 'psych')
    )
  );

CREATE POLICY "Staff can insert lead tasks"
  ON public.lead_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'admin', 'manager', 'doctor', 'nurse', 'psych')
    )
  );

CREATE POLICY "Staff can update lead tasks"
  ON public.lead_tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'admin', 'manager', 'doctor', 'nurse', 'psych')
    )
  );

CREATE POLICY "Staff can delete lead tasks"
  ON public.lead_tasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'admin', 'manager', 'doctor', 'nurse', 'psych')
    )
  );

-- User notifications (e.g. task assigned to you)
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'task_assigned',
  entity_type TEXT NOT NULL DEFAULT 'lead_task',
  entity_id UUID,
  title TEXT NOT NULL,
  body TEXT,
  link_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read_at ON public.user_notifications(user_id, read_at);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.user_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications (e.g. mark read)"
  ON public.user_notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Staff can create notifications (e.g. when assigning a task to someone)
CREATE POLICY "Staff can insert notifications"
  ON public.user_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'admin', 'manager', 'doctor', 'nurse', 'psych')
    )
  );
