import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Eye, MapPin, MessageCircle, PlayCircle, TicketCheck } from "lucide-react";

import { CoverImage } from "@/components/CoverImage";
import { Countdown } from "@/components/Countdown";
import { SaveButton } from "@/components/SaveButton";
import { SampleBadge, VerifiedBadge } from "@/components/TrustBadges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { countryName } from "@/data/countries";
import {
  categoryLabel,
  eventPhase,
  formatPrice,
  formatWhen,
  isWatchable,
  type BukaEvent,
} from "@/lib/buka";
import { destinationImage, destinationsQuery, type VerificationStatus } from "@/lib/destinations";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function EventCard({
  event,
  compactCountdown = true,
}: {
  event: BukaEvent;
  compactCountdown?: boolean;
}) {
  const phase = eventPhase(event);
  const { user } = useAuth();
  const { data: destinations } = useQuery(destinationsQuery);
  const { data: ownsTicket = false } = useQuery({
    queryKey: ["purchase", event.id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select("id")
        .eq("event_id", event.id)
        .eq("viewer_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
  const destination = destinations?.find((d) => d.slug === event.destination_id);
  const country = countryName(event.country_id ?? destination?.country_id);
  const place = destination?.name ?? event.location;

  const destinationPath =
    phase === "ended" && (event.video_path || event.video_url || event.replay_url)
      ? "/replay/$eventId"
      : "/events/$eventId";

  return (
    <article className="card-hover overflow-hidden rounded-2xl bg-card shadow-soft">
      <Link to={destinationPath} params={{ eventId: event.id }} className="group block">
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <CoverImage
            path={event.cover_image_url}
            fallback={destinationImage(destination)}
            alt={event.title}
            className="h-full w-full transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-scrim" aria-hidden />
          <div className="absolute left-3 right-3 top-3 flex flex-wrap items-center gap-2">
            {phase === "live" ? (
              <Badge className="gap-1.5 bg-live text-live-foreground">
                <span className="live-dot" aria-hidden /> LIVE
              </Badge>
            ) : phase === "ended" ? (
              <Badge variant="secondary" className="gap-1">
                <PlayCircle className="h-3 w-3" aria-hidden /> Replay
              </Badge>
            ) : (
              <Badge variant="secondary">Starting soon</Badge>
            )}
            {phase === "live" && (event.viewer_count ?? 0) > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Eye className="h-3 w-3" aria-hidden /> {event.viewer_count} watching
              </Badge>
            )}
            {ownsTicket && (
              <Badge variant="secondary" className="gap-1">
                <TicketCheck className="h-3.5 w-3.5" aria-hidden /> Ticket owned
              </Badge>
            )}
            {event.is_sample && <SampleBadge />}
          </div>
          <div className="absolute bottom-3 left-3 right-3 text-primary-foreground">
            <div className="flex items-center gap-1 text-xs font-medium">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              <span className="line-clamp-1">
                {[place, country].filter(Boolean).join(", ") || "Online"}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            {categoryLabel(event.category_id ?? event.category)}
          </p>
          <h3 className="line-clamp-2 font-display text-lg leading-snug">{event.title}</h3>
          {event.business && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="line-clamp-1">by {event.business.name}</span>
              <VerifiedBadge
                status={event.business.verification_status as VerificationStatus}
                compact
              />
            </div>
          )}
          <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>{formatWhen(event.scheduled_at)}</span>
            {phase === "upcoming" ? (
              <Countdown target={event.scheduled_at} compact={compactCountdown} />
            ) : (
              <span className="font-medium text-foreground">
                {formatPrice(event.price_cents, event.currency)}
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="flex items-center justify-between border-t px-3 py-2">
        <SaveButton itemType="experience" itemId={event.id} like size="sm" variant="ghost" />
        {phase !== "ended" && (
          <Button variant="ghost" size="sm" asChild>
            <Link
              to={ownsTicket && isWatchable(event) ? "/watch/$eventId" : "/events/$eventId"}
              params={{ eventId: event.id }}
              aria-label={`Comment on ${event.title}`}
            >
              <MessageCircle className="mr-1.5 h-4 w-4" aria-hidden /> Comment
            </Link>
          </Button>
        )}
      </div>
    </article>
  );
}
