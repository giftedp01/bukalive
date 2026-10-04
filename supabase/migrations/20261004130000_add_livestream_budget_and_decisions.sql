ALTER TABLE public.livestream_requests
  ADD COLUMN requested_budget_cents integer NOT NULL DEFAULT 0
    CHECK (requested_budget_cents >= 0),
  ADD COLUMN approved_budget_cents integer
    CHECK (approved_budget_cents IS NULL OR approved_budget_cents > 0),
  ADD COLUMN rejection_reason text
    CHECK (
      rejection_reason IS NULL
      OR char_length(trim(rejection_reason)) BETWEEN 1 AND 1000
    ),
  ADD COLUMN payment_status text NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid')),
  ADD COLUMN paid_at timestamptz,
  ADD CONSTRAINT livestream_requests_approval_details_check
    CHECK (status <> 'approved' OR approved_budget_cents IS NOT NULL),
  ADD CONSTRAINT livestream_requests_rejection_reason_check
    CHECK (status <> 'rejected' OR rejection_reason IS NOT NULL),
  ADD CONSTRAINT livestream_requests_payment_timestamp_check
    CHECK ((payment_status = 'paid') = (paid_at IS NOT NULL));

ALTER TABLE public.livestream_requests
  DROP CONSTRAINT livestream_requests_status_check,
  ADD CONSTRAINT livestream_requests_status_check
    CHECK (status IN ('new', 'reviewing', 'approved', 'rejected', 'scheduled', 'closed', 'canceled'));

CREATE FUNCTION public.require_livestream_request_budget()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.requested_budget_cents < 1 THEN
    RAISE EXCEPTION 'A livestream request budget must be greater than zero';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER require_livestream_request_budget
  BEFORE INSERT ON public.livestream_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.require_livestream_request_budget();

CREATE POLICY "Users update own livestream requests"
  ON public.livestream_requests FOR UPDATE TO authenticated
  USING (
    requester_id = auth.uid()
    AND status IN ('new', 'reviewing', 'approved', 'rejected')
  )
  WITH CHECK (
    requester_id = auth.uid()
    AND status IN ('new', 'reviewing', 'approved', 'rejected', 'canceled')
  );

CREATE FUNCTION public.protect_livestream_request_updates()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  request_details_changed boolean;
BEGIN
  IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF OLD.requester_id <> auth.uid() THEN
    RAISE EXCEPTION 'You can only update your own livestream requests';
  END IF;

  IF NEW.requester_id IS DISTINCT FROM OLD.requester_id
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR NEW.approved_budget_cents IS DISTINCT FROM OLD.approved_budget_cents
    OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
    OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
    OR NEW.paid_at IS DISTINCT FROM OLD.paid_at THEN
    RAISE EXCEPTION 'Only an admin can change approval or payment details';
  END IF;

  request_details_changed :=
    NEW.location IS DISTINCT FROM OLD.location
    OR NEW.description IS DISTINCT FROM OLD.description
    OR NEW.format IS DISTINCT FROM OLD.format
    OR NEW.preferred_date IS DISTINCT FROM OLD.preferred_date
    OR NEW.requested_budget_cents IS DISTINCT FROM OLD.requested_budget_cents;

  IF NEW.requested_budget_cents IS DISTINCT FROM OLD.requested_budget_cents
    AND NEW.requested_budget_cents < 1 THEN
    RAISE EXCEPTION 'A livestream request budget must be greater than zero';
  END IF;

  IF request_details_changed AND OLD.status NOT IN ('new', 'rejected') THEN
    RAISE EXCEPTION 'This livestream request can no longer be edited';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
    AND NOT (
      NEW.status = 'canceled'
      AND OLD.status IN ('new', 'reviewing', 'approved', 'rejected')
        AND OLD.payment_status = 'pending'
    )
    AND NOT (OLD.status = 'rejected' AND NEW.status = 'new') THEN
    RAISE EXCEPTION 'Only an admin can change this livestream request status';
  END IF;

  IF request_details_changed AND OLD.status = 'rejected' THEN
    NEW.status := 'new';
    NEW.rejection_reason := NULL;
  ELSIF OLD.status = 'rejected' AND NEW.status = 'new' THEN
    NEW.rejection_reason := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_livestream_request_updates
  BEFORE UPDATE ON public.livestream_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_livestream_request_updates();
