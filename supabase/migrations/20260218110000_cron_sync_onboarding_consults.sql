-- ============================================================================
-- CRON: Sync onboarding consults from Google Calendar (Clinical Director)
-- ============================================================================
-- Every 15 min: sync calendar attendees to patient_onboarding.consult_scheduled_at
-- Replace URL and Bearer token with your project's if different.
-- ============================================================================

SELECT cron.schedule(
  'sync-onboarding-consults-from-calendar',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ujbclldpvqhtkuoetkep.supabase.co/functions/v1/check-calendar-events',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqYmNsbGRwdnFodGt1b2V0a2VwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTM5NjIwOCwiZXhwIjoyMDgwOTcyMjA4fQ.TjxcCrxbyjOXeLm97Ss_FBGiwSC2ZjK1uJTShcXENqc'
    ),
    body := '{"syncOnboardingConsults": true}'::jsonb
  );
  $$
);
