import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";

import { CoverImage } from "@/components/CoverImage";
import { Countdown } from "@/components/Countdown";
import { Badge } from "@/components/ui/badge";
import { countryName } from "@/data/countries";
import { categoryLabel, eventPhase, formatPrice, formatWhen, type BukaEvent } from "@/lib/buka";

export function EventCard({ event }: { event: BukaEvent }) {
  const phase = eventPhase(event);
  const location = [event.location, countryName(event.country_id)].filter(Boolean).join(", ");

  return (
    <Link
      to="/events/$eventId"
      params={{ eventId: event.id }}
      className="card-hover group block overflow-hidden rounded-2xl bg-card shadow-soft"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <CoverImage path={event.cover_image_url} alt={event.title} className="h-full w-full" />
        <div className="absolute inset-0 bg-scrim" aria-hidden />
        <div className="absolute left-3 top-3 flex gap-2">
          {phase === "live" ? (
            <Badge className="gap-1.5 bg-live text-live-foreground">
              <span className="live-dot" aria-hidden /> LIVE
            </Badge>
          ) : (
            <Badge variant="secondary">{categoryLabel(event.category_id ?? event.category)}</Badge>
          )}
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2 text-primary-foreground">
          <div className="flex items-center gap-1 text-xs font-medium">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            <span className="line-clamp-1">{location || "Online"}</span>
          </div>
          <span className="rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold text-foreground">
            {formatPrice(event.price_cents, event.currency)}
          </span>
        </div>
      </div>

      <div className="space-y-2 p-4">
        <h3 className="line-clamp-2 font-display text-lg leading-snug">{event.title}</h3>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{formatWhen(event.scheduled_at)}</span>
          {phase === "upcoming" && <Countdown target={event.scheduled_at} compact />}
          {phase === "ended" && <span>Ended</span>}
        </div>
      </div>
    </Link>
  );
}
