import { supabase } from "@/integrations/supabase/client";

export type TrackKind = "view" | "booking_click" | "go_there" | "share" | "save";

/** Fire-and-forget engagement event used for host analytics. */
export function trackEvent(eventId: string, kind: TrackKind, userId?: string | null) {
  void supabase
    .from("analytics_events")
    .insert({ event_id: eventId, kind, user_id: userId ?? null })
    .then(() => undefined);
}
