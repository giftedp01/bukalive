WITH sample_schedule AS (
  SELECT
    id,
    row_number() OVER (ORDER BY id) AS sequence
  FROM public.events
  WHERE is_sample
)
UPDATE public.events AS event
SET
  scheduled_at = now() + interval '2 years' + (sample_schedule.sequence - 1) * interval '7 days',
  status = 'upcoming'
FROM sample_schedule
WHERE event.id = sample_schedule.id;
