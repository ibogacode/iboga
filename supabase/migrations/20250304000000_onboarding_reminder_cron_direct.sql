-- ============================================================================
-- CRON: Onboarding form reminders (same pattern as patient/form reminder crons)
-- ============================================================================
-- Daily at 9:00 AM UTC: call send-onboarding-reminders edge function.
-- Requires pg_cron and pg_net. Replace placeholders with your project values.
--
-- IMPORTANT: Replace before running in Supabase SQL Editor:
-- 1. YOUR_SUPABASE_URL - Your Supabase project URL (e.g. https://xxxxx.supabase.co)
-- 2. YOUR_SERVICE_ROLE_KEY - Your Supabase service role key (Settings > API)
-- ============================================================================

-- Remove existing onboarding reminder cron if present (from previous migration)
DO $$
BEGIN
  PERFORM cron.unschedule('send-onboarding-form-reminders')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'send-onboarding-form-reminders'
  );
END $$;

-- Schedule onboarding form reminders (daily at 9:00 AM UTC)
SELECT cron.schedule(
  'send-onboarding-form-reminders',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'YOUR_SUPABASE_URL/functions/v1/send-onboarding-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);
