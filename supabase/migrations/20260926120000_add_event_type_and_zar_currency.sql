ALTER TABLE public.events
  ALTER COLUMN currency SET DEFAULT 'ZAR',
  ADD COLUMN event_type text NOT NULL DEFAULT 'ticketed'
    CHECK (event_type IN ('ticketed', 'free_ad_slot'));

UPDATE public.events
SET currency = 'ZAR'
WHERE currency = 'USD';