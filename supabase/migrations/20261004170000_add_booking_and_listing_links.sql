ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS booking_url text;

UPDATE public.events
SET booking_url = book_url
WHERE booking_url IS NULL
  AND book_url IS NOT NULL;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS link_url text;

UPDATE public.listings
SET link_url = url
WHERE link_url IS NULL
  AND url IS NOT NULL;
