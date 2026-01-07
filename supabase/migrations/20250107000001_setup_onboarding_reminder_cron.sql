-- ============================================================================
-- ONBOARDING REMINDER CRON JOB SETUP
-- ============================================================================
-- Sets up daily email reminders for patients with incomplete onboarding forms
-- Requires pg_cron and pg_net extensions (available on Supabase Pro plans)
-- ============================================================================

-- Note: This migration may fail on Supabase Free tier or local development
-- where pg_cron is not available. The main onboarding functionality will 
-- still work - reminders can be triggered manually via the edge function.

DO $$
BEGIN
  -- Check if pg_cron extension exists before trying to use it
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Schedule daily reminder at 9 AM UTC
    PERFORM cron.schedule(
      'send-onboarding-form-reminders',
      '0 9 * * *', -- Every day at 9:00 AM UTC
      $$
      SELECT
        net.http_post(
          url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-onboarding-reminders',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
          ),
          body := '{}'::jsonb
        ) AS request_id;
      $$
    );
    RAISE NOTICE 'Onboarding reminder cron job scheduled successfully';
  ELSE
    RAISE NOTICE 'pg_cron extension not available - skipping cron job setup. Reminders can be triggered manually.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not setup cron job: %. Reminders can be triggered manually via edge function.', SQLERRM;
END;
$$;

