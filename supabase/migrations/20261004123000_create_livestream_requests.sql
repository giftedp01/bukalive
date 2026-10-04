CREATE TABLE public.livestream_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  location text NOT NULL CHECK (char_length(trim(location)) BETWEEN 2 AND 160),
  description text NOT NULL CHECK (char_length(trim(description)) BETWEEN 10 AND 1500),
  format text NOT NULL CHECK (format IN ('drone', '360', 'either')),
  preferred_date date,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'scheduled', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX livestream_requests_status_created_idx
  ON public.livestream_requests (status, created_at DESC);

ALTER TABLE public.livestream_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.livestream_requests TO authenticated;
GRANT ALL ON public.livestream_requests TO service_role;

CREATE POLICY "Users create own livestream requests"
  ON public.livestream_requests FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Users read own livestream requests"
  ON public.livestream_requests FOR SELECT TO authenticated
  USING (requester_id = auth.uid());

CREATE POLICY "Admins read livestream requests"
  ON public.livestream_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update livestream requests"
  ON public.livestream_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
