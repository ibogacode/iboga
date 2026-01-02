CREATE OR REPLACE FUNCTION public.send_patient_login_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_function_url TEXT;
  request_id BIGINT;
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Get Supabase URL and service role key from environment
  supabase_url := current_setting('app.supabase_url', true);
  service_role_key := current_setting('app.service_role_key', true);
  
  -- Fallback to hardcoded URL if not set (should be set in Supabase secrets)
  IF supabase_url IS NULL OR supabase_url = '' THEN
    supabase_url := 'https://portal.theibogainstitute.org';
  END IF;
  
  -- Call the edge function directly
  edge_function_url := supabase_url || '/functions/v1/send-patient-reminders';
  
  SELECT net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(service_role_key, '')
    ),
    body := '{}'::jsonb
  ) INTO request_id;
  
  RAISE NOTICE 'Patient reminder cron job initiated. Request ID: %', request_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in patient reminder cron job: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_patient_login_reminders() TO postgres;
GRANT EXECUTE ON FUNCTION public.send_patient_login_reminders() TO service_role;

DO $$
BEGIN
  PERFORM cron.unschedule('send-patient-login-reminders-daily')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'send-patient-login-reminders-daily'
  );
END $$;

SELECT cron.schedule(
  'send-patient-login-reminders-daily',
  '0 13 * * *',
  $$
  SELECT public.send_patient_login_reminders();
  $$
);

