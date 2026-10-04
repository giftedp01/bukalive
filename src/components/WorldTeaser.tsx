import { useCallback, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";

import { CoverImage } from "@/components/CoverImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorldMap, type MapMarker } from "@/components/WorldMap";
import { eventPhase, formatWhen, type BukaEvent } from "@/lib/buka";
import { destinationImage, type Destination } from "@/lib/destinations";

type MapExperience = {
  event: BukaEvent;
  destination: Destination | undefined;
  marker: MapMarker;
};

const STATUS_PRIORITY: Record<MapMarker["kind"], number> = {
  live: 0,
  upcoming: 1,
  recorded: 2,
  destination: 3,
};

const STATUS_LABEL: Record<MapMarker["kind"], string> = {
  live: "Live now",
  upcoming: "Starting soon",
  recorded: "Recorded",
  destination: "Destination",
};

const STATUS_CLASS: Record<MapMarker["kind"], string> = {
  live: "bg-live text-live-foreground",
  upcoming: "bg-primary text-primary-foreground",
  recorded: "bg-accent text-accent-foreground",
  destination: "bg-accent text-accent-foreground",
};

export function WorldTeaser({
  destinations,
  events,
  loading = false,
  error = false,
}: {
  destinations: Destination[];
  events: BukaEvent[];
  loading?: boolean;
  error?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const experiences = useMemo(() => {
    const byDestination = new Map<string, MapExperience>();

    for (const event of events) {
      const destination = destinations.find((item) => item.slug === event.destination_id);
      const lat = event.latitude ?? destination?.latitude;
      const lng = event.longitude ?? destination?.longitude;
      if (
        lat == null ||
        lng == null ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        continue;
      }

      const phase = eventPhase(event);
      if (phase === "draft") continue;
      const kind: MapMarker["kind"] =
        phase === "live" ? "live" : phase === "upcoming" ? "upcoming" : "recorded";
      const key = destination?.slug ?? event.id;
      const candidate: MapExperience = {
        event,
        destination,
        marker: {
          id: event.id,
          lat,
          lng,
          kind,
          title: event.title,
          destinationName: destination?.name ?? event.location,
        },
      };
      const current = byDestination.get(key);

      if (
        !current ||
        STATUS_PRIORITY[kind] < STATUS_PRIORITY[current.marker.kind] ||
        (STATUS_PRIORITY[kind] === STATUS_PRIORITY[current.marker.kind] &&
          event.scheduled_at < current.event.scheduled_at)
      ) {
        byDestination.set(key, candidate);
      }
    }

    return [...byDestination.values()];
  }, [destinations, events]);

  const markers = useMemo(() => experiences.map(({ marker }) => marker), [experiences]);
  const selected = experiences.find(({ event }) => event.id === selectedId);
  const onSelect = useCallback((id: string) => setSelectedId(id), []);

  return (
    <div className="relative h-[360px] w-full overflow-hidden rounded-3xl sm:h-[480px] lg:h-[560px]">
      <WorldMap markers={markers} onSelect={onSelect} />

      <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-2 rounded-2xl border bg-background/95 px-3 py-2 text-xs shadow-soft sm:bottom-4 sm:left-4 sm:gap-3">
        {(["live", "upcoming", "recorded"] as const).map((status) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                status === "live" ? "bg-live" : status === "upcoming" ? "bg-primary" : "bg-accent"
              }`}
              aria-hidden
            />
            {STATUS_LABEL[status]}
          </span>
        ))}
      </div>

      <p className="absolute bottom-4 right-14 z-10 hidden rounded-lg bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow-soft sm:block">
        Drag to pan · use + / − to zoom
      </p>

      {!loading && (error || experiences.length === 0) && (
        <div className="absolute left-1/2 top-1/2 z-10 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card/95 p-5 text-center shadow-soft">
          {error ? (
            <>
              <p className="font-display text-lg">Experiences couldn’t be loaded</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Refresh the page to try loading mapped experiences again.
              </p>
            </>
          ) : (
            <>
              <p className="font-display text-lg">No mapped experiences yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                New experiences will appear here when they have a verified destination location.
              </p>
              <Button className="mt-4" variant="outline" asChild>
                <Link to="/destinations">Explore destinations</Link>
              </Button>
            </>
          )}
        </div>
      )}

      {selected && (
        <div className="absolute left-3 right-14 top-3 z-20 flex gap-3 rounded-2xl border bg-card p-3 shadow-lg sm:left-4 sm:right-auto sm:top-4 sm:w-[380px]">
          <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl sm:w-28">
            <CoverImage
              path={selected.event.cover_image_url}
              fallback={destinationImage(selected.destination)}
              alt={selected.event.title}
              className="h-full w-full"
            />
          </div>
          <div className="min-w-0 flex-1">
            <Badge className={`mb-1 ${STATUS_CLASS[selected.marker.kind]}`}>
              {STATUS_LABEL[selected.marker.kind]}
            </Badge>
            <p className="truncate font-medium">
              {selected.destination?.name ?? selected.event.location}
            </p>
            <p className="truncate text-sm text-muted-foreground">{selected.event.title}</p>
            {selected.marker.kind === "upcoming" && (
              <p className="truncate text-xs text-muted-foreground">
                Starts {formatWhen(selected.event.scheduled_at)}
              </p>
            )}
            <Button size="sm" className="mt-2" asChild>
              <Link to="/events/$eventId" params={{ eventId: selected.event.id }}>
                View experience
              </Link>
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label="Close selected experience"
            onClick={() => setSelectedId(null)}
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      )}
    </div>
  );
}
