
-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin','host','viewer');
CREATE TYPE public.event_category AS ENUM ('sports','festival','conference','wedding','safari','concert','extreme_sports','arts','fashion','other');
CREATE TYPE public.event_status AS ENUM ('draft','upcoming','live','ended');
CREATE TYPE public.host_status AS ENUM ('none','pending','approved','rejected');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text,
  avatar_url text,
  bio text,
  host_status public.host_status NOT NULL DEFAULT 'none',
  host_bio text,
  host_applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_approved_host(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND host_status = 'approved')
$$;

-- EVENTS
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category public.event_category NOT NULL DEFAULT 'other',
  location text NOT NULL DEFAULT '',
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status public.event_status NOT NULL DEFAULT 'draft',
  cover_image_url text,
  is_published boolean NOT NULL DEFAULT false,
  is_flagged boolean NOT NULL DEFAULT false,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT SELECT ON public.events TO anon;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  provider text NOT NULL DEFAULT 'mock',
  provider_ref text,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, viewer_id)
);
GRANT SELECT, INSERT ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_access(_event_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.purchases WHERE event_id = _event_id AND viewer_id = _user_id)
      OR EXISTS (SELECT 1 FROM public.events WHERE id = _event_id AND host_id = _user_id)
$$;

-- POLICIES
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Admins update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Published events are public" ON public.events FOR SELECT USING (is_published AND NOT is_flagged);
CREATE POLICY "Hosts read own events" ON public.events FOR SELECT TO authenticated USING (host_id = auth.uid());
CREATE POLICY "Admins read all events" ON public.events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Approved hosts create events" ON public.events FOR INSERT TO authenticated WITH CHECK (host_id = auth.uid() AND public.is_approved_host(auth.uid()));
CREATE POLICY "Hosts update own events" ON public.events FOR UPDATE TO authenticated USING (host_id = auth.uid()) WITH CHECK (host_id = auth.uid());
CREATE POLICY "Admins update any event" ON public.events FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Hosts delete own events" ON public.events FOR DELETE TO authenticated USING (host_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Viewers read own purchases" ON public.purchases FOR SELECT TO authenticated USING (viewer_id = auth.uid());
CREATE POLICY "Hosts read purchases for their events" ON public.purchases FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.host_id = auth.uid()));
CREATE POLICY "Admins read purchases" ON public.purchases FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Viewers create own purchases" ON public.purchases FOR INSERT TO authenticated WITH CHECK (viewer_id = auth.uid());

CREATE POLICY "Ticket holders read chat" ON public.chat_messages FOR SELECT TO authenticated USING (public.has_access(event_id, auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Ticket holders post chat" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.has_access(event_id, auth.uid()));

-- TRIGGERS
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER events_touch BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE wants_host boolean := coalesce(NEW.raw_user_meta_data->>'intended_role','viewer') = 'host';
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url, host_status, host_applied_at)
  VALUES (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    CASE WHEN wants_host THEN 'pending'::public.host_status ELSE 'none'::public.host_status END,
    CASE WHEN wants_host THEN now() ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN wants_host THEN 'host'::public.app_role ELSE 'viewer'::public.app_role END)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE INDEX events_scheduled_idx ON public.events (scheduled_at);
CREATE INDEX events_category_idx ON public.events (category);
CREATE INDEX chat_event_idx ON public.chat_messages (event_id, sent_at);

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
