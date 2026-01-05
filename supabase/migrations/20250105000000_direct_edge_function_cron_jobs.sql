-- Migration: Direct Edge Function Cron Jobs
-- This migration removes intermediate database functions and makes cron jobs call edge functions directly
-- 
-- IMPORTANT: Replace the following placeholders with your actual values:
-- 1. YOUR_SUPABASE_URL - Your Supabase project URL (e.g., https://xxxxx.supabase.co)
-- 2. YOUR_SERVICE_ROLE_KEY - Your Supabase service role key

-- ============================================================================
-- STEP 1: Drop existing database functions
-- ============================================================================

DROP FUNCTION IF EXISTS public.send_patient_login_reminders() CASCADE;
DROP FUNCTION IF EXISTS public.send_form_reminders() CASCADE;

-- ============================================================================
-- STEP 2: Remove existing cron jobs
-- ============================================================================

DO $$
BEGIN
  -- Remove patient login reminders cron job
  PERFORM cron.unschedule('send-patient-login-reminders-daily')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'send-patient-login-reminders-daily'
  );
  
  -- Remove form reminders cron job
  PERFORM cron.unschedule('send-form-reminders-48h')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'send-form-reminders-48h'
  );
END $$;

-- ============================================================================
-- STEP 3: Create new cron jobs that call edge functions directly
-- ============================================================================

-- Cron job for patient login reminders (runs daily at 1:00 PM UTC)
-- Schedule: '0 13 * * *' = Every day at 13:00 UTC
SELECT cron.schedule(
  'send-patient-login-reminders-daily',
  '0 13 * * *',
  $$
  SELECT net.http_post(
    url := 'YOUR_SUPABASE_URL/functions/v1/send-patient-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Cron job for form reminders (runs every 2 days at 3:00 AM UTC)
-- Schedule: '0 3 */2 * *' = Every 2 days at 03:00 UTC
SELECT cron.schedule(
  'send-form-reminders-24h',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url := 'YOUR_SUPABASE_URL/functions/v1/send-form-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. Replace YOUR_SUPABASE_URL with your actual Supabase project URL
--    Example: 'https://abcdefghijklmnop.supabase.co'
--
-- 2. Replace YOUR_SERVICE_ROLE_KEY with your actual service role key
--    You can find this in: Supabase Dashboard > Settings > API > service_role key
--
-- 3. The cron schedules are:
--    - Patient reminders: Daily at 1:00 PM UTC (13:00)
--    - Form reminders: Every 2 days at 3:00 AM UTC
--
-- 4. To verify cron jobs are scheduled, run:
--    SELECT * FROM cron.job;
--
-- 5. To check cron job execution history, run:
--    SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

