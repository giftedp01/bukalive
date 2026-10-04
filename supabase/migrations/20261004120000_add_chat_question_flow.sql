ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS is_question boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS answer text,
  ADD COLUMN IF NOT EXISTS answered_at timestamptz,
  ADD COLUMN IF NOT EXISTS answered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

GRANT UPDATE ON public.chat_messages TO authenticated;

CREATE POLICY "Ticket holders flag chat questions"
ON public.chat_messages FOR UPDATE TO authenticated
USING (public.has_access(event_id, auth.uid()))
WITH CHECK (
  public.has_access(event_id, auth.uid()) AND
  answer IS NULL AND
  answered_at IS NULL AND
  answered_by IS NULL
);

CREATE POLICY "Hosts answer chat questions"
ON public.chat_messages FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = event_id
      AND e.host_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = event_id
      AND e.host_id = auth.uid()
  ) AND
  is_question = true AND
  answered_by = auth.uid() AND
  answered_at IS NOT NULL AND
  answer IS NOT NULL AND
  TRIM(answer) <> ''
);

CREATE INDEX chat_question_idx
ON public.chat_messages (event_id, is_question, answered_at);
