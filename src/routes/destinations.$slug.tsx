import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin } from "lucide-react";

import { EventCard } from "@/components/EventCard";
import { GoTherePanel } from "@/components/GoTherePanel";
import { SaveButton } from "@/components/SaveButton";
import { SampleBadge } from "@/components/TrustBadges";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { countryName } from "@/data/countries";
import { supabase } from "@/integrations/supabase/client";
import { categoryLabel, eventPhase, type BukaEvent } from "@/lib/buka";
import { destinationImage, destinationsQuery, EVENT_SELECT } from "@/lib/destinations";

export const Route = createFileRoute("/destinations/$slug")({
  head: () => ({
    meta: [
      { title: "Destination — BukaLive" },
      {
        name: "description",
        content:
          "Live and recorded experiences, nearby stays, food and attractions for this destination.",
      },
      { property: "og:title", content: "Destination — BukaLive" },
      { property: "og:description", content: "Watch it live, then plan your visit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DestinationPage,
});

function Section({ title, events }: { title: string; events: BukaEvent[] }) {
  if (!events.length) return null;
  return (
    <section className="mt-10">
      <h2 className="mb-4 font-display text-2xl">{title}</h2>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </div>
    </section>
  );
}

function DestinationPage() {
  const { slug } = Route.useParams();
  const { data: destinations, isLoading } = useQuery(destinationsQuery);
  const d = destinations?.find((x) => x.slug === slug);

  const { data: events = [] } = useQuery({
    queryKey: ["events", "destination", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(EVENT_SELECT)
        .eq("destination_id", slug)
        .eq("is_published", true)
        .eq("is_flagged", false)
        .order("scheduled_at");
      if (error) throw error;
      return (data ?? []) as unknown as BukaEvent[];
    },
  });

  if (isLoading)
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    );
  if (!d) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl">Destination not found</h1>
        <Button className="mt-6" asChild>
          <Link to="/destinations">All destinations</Link>
        </Button>
      </div>
    );
  }

  const live = events.filter((e) => eventPhase(e) === "live");
  const upcoming = events.filter((e) => eventPhase(e) === "upcoming");
  const replays = events.filter((e) => eventPhase(e) === "ended");

  return (
    <div>
      <section className="relative isolate">
        <img
          src={destinationImage(d)}
          alt={d.name}
          width={1280}
          height={800}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-scrim" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-32 text-primary-foreground sm:pt-48">
          <div className="mb-3 flex flex-wrap gap-2">
            {d.is_sample && <SampleBadge />}
            {live.length > 0 && (
              <span className="inline-flex items-center gap-2 rounded-full bg-live px-3 py-1 text-xs font-semibold text-live-foreground">
                <span className="live-dot" /> {live.length} live now
              </span>
            )}
          </div>
          <p className="text-sm uppercase tracking-widest opacity-90">
            {[d.city, d.region, countryName(d.country_id)].filter(Boolean).join(" · ")}
          </p>
          <h1 className="font-display text-5xl sm:text-6xl">{d.name}</h1>
          <p className="mt-3 max-w-2xl text-lg opacity-90">{d.summary}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild>
              <a href="#plan">Plan your visit</a>
            </Button>
            <SaveButton itemType="destination" itemId={d.slug} />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-6 md:grid-cols-[1fr_280px]">
          <div>
            <h2 className="font-display text-2xl">Overview</h2>
            <p className="mt-2 text-muted-foreground">{d.description}</p>
          </div>
          <div className="space-y-2 rounded-2xl bg-sand p-5 text-sm text-sand-foreground">
            {d.category_id && (
              <p>
                <strong>Known for:</strong> {categoryLabel(d.category_id)}
              </p>
            )}
            {d.best_time && (
              <p className="flex gap-2">
                <CalendarDays className="h-4 w-4 shrink-0" /> Best time: {d.best_time}
              </p>
            )}
            {d.latitude != null && (
              <a
                className="flex gap-2 font-medium underline"
                target="_blank"
                rel="noopener noreferrer"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  [d.name, d.city, d.region, countryName(d.country_id)].filter(Boolean).join(", "),
                )}`}
              >
                <MapPin className="h-4 w-4 shrink-0" /> Open in maps
              </a>
            )}
          </div>
        </div>

        <Section title="Live now in this destination" events={live} />
        <Section title="Upcoming" events={upcoming} />
        <Section title="Watch replays" events={replays} />
        {!events.length && (
          <p className="mt-10 rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">
            No experiences scheduled here yet.
          </p>
        )}

        <section id="plan" className="mt-12 scroll-mt-20">
          <h2 className="mb-4 font-display text-3xl">Plan your visit</h2>
          <GoTherePanel destinationSlug={d.slug} />
        </section>
      </div>
    </div>
  );
}
