CREATE OR REPLACE FUNCTION public.send_patient_login_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  api_url TEXT;
  request_id BIGINT;
BEGIN
  api_url := 'https://portal.theibogainstitute.org/api/cron/send-patient-reminders';
  
  SELECT net.http_get(
    url := api_url,
    headers := jsonb_build_object('Content-Type', 'application/json')
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
  '0 14 * * *',
  $$
  SELECT public.send_patient_login_reminders();
  $$
);
