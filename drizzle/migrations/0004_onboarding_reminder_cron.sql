CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE public.cron_tokens (
  name text PRIMARY KEY,
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.cron_tokens TO service_role;
ALTER TABLE public.cron_tokens ENABLE ROW LEVEL SECURITY;

INSERT INTO public.cron_tokens (name, token)
VALUES ('onboarding_reminders', encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (name) DO NOTHING;

SELECT cron.schedule(
  'onboarding-reminders-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://remix-of-dreams.lovable.app/api/public/cron/onboarding-reminders',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT token FROM public.cron_tokens WHERE name='onboarding_reminders')),
    body := '{}'::jsonb
  );
  $$
);