
CREATE POLICY "Event covers are readable" ON storage.objects FOR SELECT USING (bucket_id = 'event-covers');
CREATE POLICY "Hosts upload own covers" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'event-covers' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Hosts update own covers" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'event-covers' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Hosts delete own covers" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'event-covers' AND (storage.foldername(name))[1] = auth.uid()::text);
