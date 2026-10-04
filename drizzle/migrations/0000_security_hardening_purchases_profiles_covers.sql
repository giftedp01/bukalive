-- Purchases: only the server may record purchases
DROP POLICY IF EXISTS "Viewers create own purchases" ON public.purchases;
REVOKE INSERT ON public.purchases FROM authenticated, anon;

-- Profiles: emails no longer public
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_barrier = true) AS
  SELECT id, full_name, avatar_url, bio, host_bio, host_status FROM public.profiles;
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Event covers: published events, own files, or admin
DROP POLICY IF EXISTS "Event covers are readable" ON storage.objects;
CREATE POLICY "Event covers readable when published or owned" ON storage.objects FOR SELECT
USING (
  bucket_id = 'event-covers' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.is_published AND NOT e.is_flagged
        AND e.cover_image_url IS NOT NULL
        AND (e.cover_image_url = storage.objects.name OR e.cover_image_url LIKE '%' || storage.objects.name)
    )
  )
);