ALTER TABLE public.events ADD COLUMN IF NOT EXISTS country_id text;

UPDATE public.events
SET country_id = 'ZA'
WHERE country_id IS NULL;