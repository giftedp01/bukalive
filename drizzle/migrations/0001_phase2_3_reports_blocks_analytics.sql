CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('experience','chat_message','user','business')),
  item_id text NOT NULL,
  reason text NOT NULL,
  details text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','actioned','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users file reports" ON public.reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid() AND status = 'open');
CREATE POLICY "Users see own reports, admins all" ON public.reports FOR SELECT TO authenticated USING (reporter_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update reports" ON public.reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.blocks TO authenticated;
GRANT ALL ON public.blocks TO service_role;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own blocks" ON public.blocks FOR ALL TO authenticated USING (blocker_id = auth.uid()) WITH CHECK (blocker_id = auth.uid());

CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('view','booking_click','go_there','share','save')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX analytics_events_event_idx ON public.analytics_events(event_id, kind);
GRANT INSERT ON public.analytics_events TO anon, authenticated;
GRANT SELECT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone logs analytics" ON public.analytics_events FOR INSERT TO anon, authenticated
  WITH CHECK ((user_id IS NULL OR user_id = auth.uid()) AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.is_published));
CREATE POLICY "Hosts read own analytics" ON public.analytics_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.host_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.watch_history (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  watched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watch_history TO authenticated;
GRANT ALL ON public.watch_history TO service_role;
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own history" ON public.watch_history FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Chat: blocked authors hidden is client-side; allow askers to flag own messages as questions on insert (already allowed by column).