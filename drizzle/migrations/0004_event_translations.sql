CREATE TABLE public.event_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  language text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  source_updated_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, language)
);
GRANT SELECT ON public.event_translations TO anon, authenticated;
GRANT ALL ON public.event_translations TO service_role;
ALTER TABLE public.event_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Translations of published events are public"
ON public.event_translations FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.is_published AND NOT e.is_flagged));