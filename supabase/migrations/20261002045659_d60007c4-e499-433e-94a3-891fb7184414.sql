ALTER TABLE public.events ADD CONSTRAINT events_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE SET NULL;
NOTIFY pgrst, 'reload schema';