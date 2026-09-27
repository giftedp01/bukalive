ALTER TABLE public.events
  ADD COLUMN video_path text,
  ADD COLUMN video_url text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-videos',
  'event-videos',
  false,
  524288000,
  ARRAY['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Ticket holders read event videos" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'event-videos'
  AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.video_path = name
      AND (public.has_access(e.id, auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Hosts upload own event videos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'event-videos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Hosts update own event videos" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'event-videos' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'event-videos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Hosts delete own event videos" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'event-videos' AND (storage.foldername(name))[1] = auth.uid()::text);