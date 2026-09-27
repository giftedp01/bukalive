ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'ticketed';

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_event_type_check;

ALTER TABLE public.events
  ADD CONSTRAINT events_event_type_check
  CHECK (event_type IN ('ticketed', 'free_ad_slot'));

NOTIFY pgrst, 'reload schema';