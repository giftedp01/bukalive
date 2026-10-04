import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Clapperboard, MapPin } from "lucide-react";

import { CoverImage } from "@/components/CoverImage";
import { EventVideo } from "@/components/EventVideo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { categoryLabel, eventPhase, formatWhen, type BukaEvent } from "@/lib/buka";

export const Route = createFileRoute("/replay/$eventId")({
  head: () => ({
    meta: [
      { title: "Replay — BukaLive" },
      {
        name: "description",
        content: "Watch the recorded replay of this BukaLive experience.",
      },
      { property: "og:title", content: "Replay — BukaLive" },
      { property: "og:description", content: "Watch the recorded replay of this BukaLive event." },
    ],
  }),
  component: ReplayPage,
});

function ReplayPage() {
  const { eventId } = Route.useParams();

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();
      if (error) throw error;
      return (data as BukaEvent | null) ?? null;
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <Skeleton className="h-80 w-full rounded-3xl" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl">Replay unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">This recording is no longer available.</p>
        <Button className="mt-6" asChild>
          <Link to="/browse">Browse events</Link>
        </Button>
      </div>
    );
  }

  const phase = eventPhase(event);
  const hasReplay = !!(event.video_path || event.video_url || event.replay_url);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="gap-1.5">
          <Clapperboard className="h-3.5 w-3.5" aria-hidden /> Replay
        </Badge>
        <Badge variant="outline">{categoryLabel(event.category_id ?? event.category)}</Badge>
      </div>

      <div className="relative overflow-hidden rounded-3xl">
        <CoverImage
          path={event.cover_image_url}
          alt={event.title}
          className="h-64 w-full sm:h-80"
        />
        <div className="absolute inset-0 bg-scrim" aria-hidden />
        <div className="absolute bottom-5 left-5 right-5 text-primary-foreground">
          <h1 className="font-display text-3xl sm:text-4xl">{event.title}</h1>
          <div className="mt-2 flex flex-wrap gap-4 text-sm">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" aria-hidden /> {event.location || "Online"}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-4 w-4" aria-hidden /> {formatWhen(event.scheduled_at)}
            </span>
          </div>
        </div>
      </div>

      {!hasReplay ? (
        <div className="mt-8 rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">
          This event has ended, but no replay is available yet.
        </div>
      ) : (
        <div className="mt-8 rounded-3xl border bg-card p-3 sm:p-4">
          <EventVideo
            videoPath={event.video_path}
            videoUrl={event.video_url ?? event.replay_url ?? undefined}
            title={event.title}
          />
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/events/$eventId" params={{ eventId: event.id }}>
            Event details
          </Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link to="/browse">Explore more</Link>
        </Button>
      </div>

      <div className="mt-8 max-w-2xl rounded-2xl bg-sand p-5 text-sm text-sand-foreground">
        <p className="font-medium">Replay status</p>
        <p className="mt-1">
          {phase === "ended"
            ? "This experience has finished and is available as a replay."
            : "This event is scheduled for replay later."}
        </p>
      </div>
    </div>
  );
}
