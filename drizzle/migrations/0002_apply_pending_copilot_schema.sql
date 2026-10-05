ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS answer text,
  ADD COLUMN IF NOT EXISTS answered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
GRANT UPDATE ON public.chat_messages TO authenticated;
CREATE POLICY "Authors flag own chat questions" ON public.chat_messages FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND public.has_access(event_id, auth.uid()))
WITH CHECK (user_id = auth.uid() AND public.has_access(event_id, auth.uid()) AND answer IS NULL AND answered_at IS NULL AND answered_by IS NULL);
DROP POLICY IF EXISTS "Hosts mark questions answered" ON public.chat_messages;
CREATE POLICY "Hosts answer chat questions" ON public.chat_messages FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.host_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.host_id = auth.uid())
  AND is_question = true AND answered_by = auth.uid() AND answered_at IS NOT NULL AND answer IS NOT NULL AND trim(answer) <> '');
CREATE INDEX IF NOT EXISTS chat_question_idx ON public.chat_messages (event_id, is_question, answered_at);

CREATE OR REPLACE FUNCTION public.protect_chat_message_text()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.message IS DISTINCT FROM OLD.message OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.event_id IS DISTINCT FROM OLD.event_id OR NEW.sent_at IS DISTINCT FROM OLD.sent_at THEN
    RAISE EXCEPTION 'Chat messages cannot be edited';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER chat_messages_protect_text BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.protect_chat_message_text();

CREATE TABLE public.livestream_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  location text NOT NULL CHECK (char_length(trim(location)) BETWEEN 2 AND 160),
  description text NOT NULL CHECK (char_length(trim(description)) BETWEEN 10 AND 1500),
  format text NOT NULL CHECK (format IN ('drone','360','either')),
  preferred_date date,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','approved','rejected','scheduled','closed','canceled')),
  requested_budget_cents integer NOT NULL DEFAULT 0 CHECK (requested_budget_cents >= 0),
  approved_budget_cents integer CHECK (approved_budget_cents IS NULL OR approved_budget_cents > 0),
  rejection_reason text CHECK (rejection_reason IS NULL OR char_length(trim(rejection_reason)) BETWEEN 1 AND 1000),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lr_approval_requires_budget CHECK (status <> 'approved' OR approved_budget_cents IS NOT NULL),
  CONSTRAINT lr_rejection_requires_reason CHECK (status <> 'rejected' OR rejection_reason IS NOT NULL),
  CONSTRAINT lr_paid_requires_timestamp CHECK ((payment_status = 'paid') = (paid_at IS NOT NULL))
);
CREATE INDEX livestream_requests_status_created_idx ON public.livestream_requests (status, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.livestream_requests TO authenticated;
GRANT ALL ON public.livestream_requests TO service_role;
ALTER TABLE public.livestream_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users create own livestream requests" ON public.livestream_requests FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid() AND status = 'new' AND payment_status = 'pending' AND approved_budget_cents IS NULL);
CREATE POLICY "Users read own livestream requests" ON public.livestream_requests FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update livestream requests" ON public.livestream_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users update own livestream requests" ON public.livestream_requests FOR UPDATE TO authenticated
  USING (requester_id = auth.uid() AND status IN ('new','reviewing','approved','rejected'))
  WITH CHECK (requester_id = auth.uid() AND status IN ('new','reviewing','approved','rejected','canceled'));

CREATE FUNCTION public.require_livestream_request_budget() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.requested_budget_cents < 1 THEN RAISE EXCEPTION 'A livestream request budget must be greater than zero'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER require_livestream_request_budget BEFORE INSERT ON public.livestream_requests
  FOR EACH ROW EXECUTE FUNCTION public.require_livestream_request_budget();

CREATE FUNCTION public.protect_livestream_request_updates() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE changed boolean;
BEGIN
  IF auth.role() = 'service_role' OR public.has_role(auth.uid(),'admin') THEN RETURN NEW; END IF;
  IF OLD.requester_id <> auth.uid() THEN RAISE EXCEPTION 'You can only update your own livestream requests'; END IF;
  IF NEW.requester_id IS DISTINCT FROM OLD.requester_id OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR NEW.approved_budget_cents IS DISTINCT FROM OLD.approved_budget_cents OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
    OR NEW.payment_status IS DISTINCT FROM OLD.payment_status OR NEW.paid_at IS DISTINCT FROM OLD.paid_at THEN
    RAISE EXCEPTION 'Only an admin can change approval or payment details';
  END IF;
  changed := NEW.location IS DISTINCT FROM OLD.location OR NEW.description IS DISTINCT FROM OLD.description
    OR NEW.format IS DISTINCT FROM OLD.format OR NEW.preferred_date IS DISTINCT FROM OLD.preferred_date
    OR NEW.requested_budget_cents IS DISTINCT FROM OLD.requested_budget_cents;
  IF NEW.requested_budget_cents IS DISTINCT FROM OLD.requested_budget_cents AND NEW.requested_budget_cents < 1 THEN
    RAISE EXCEPTION 'A livestream request budget must be greater than zero';
  END IF;
  IF changed AND OLD.status NOT IN ('new','rejected') THEN RAISE EXCEPTION 'This livestream request can no longer be edited'; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
    AND NOT (NEW.status = 'canceled' AND OLD.status IN ('new','reviewing','approved','rejected') AND OLD.payment_status = 'pending')
    AND NOT (OLD.status = 'rejected' AND NEW.status = 'new') THEN
    RAISE EXCEPTION 'Only an admin can change this livestream request status';
  END IF;
  IF (changed AND OLD.status = 'rejected') OR (OLD.status = 'rejected' AND NEW.status = 'new') THEN
    NEW.status := 'new'; NEW.rejection_reason := NULL;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER protect_livestream_request_updates BEFORE UPDATE ON public.livestream_requests
  FOR EACH ROW EXECUTE FUNCTION public.protect_livestream_request_updates();

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS booking_url text;
UPDATE public.events SET booking_url = book_url WHERE booking_url IS NULL AND book_url IS NOT NULL;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS link_url text;
UPDATE public.listings SET link_url = url WHERE link_url IS NULL AND url IS NOT NULL;

ALTER TABLE public.reports ADD CONSTRAINT reports_reporter_profile_fkey FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) ON DELETE CASCADE;