-- Covers of published events are served to visitors through a server-side
-- signer that verifies the event is published and unflagged. Direct storage
-- reads are now limited to the uploading host and admins.
DROP POLICY IF EXISTS "Event covers readable when published or owned" ON storage.objects;
CREATE POLICY "Covers readable by owner or admin"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'event-covers'
  AND (
    (storage.foldername(name))[1] = (select auth.uid())::text
    OR public.has_role((select auth.uid()), 'admin')
  )
);