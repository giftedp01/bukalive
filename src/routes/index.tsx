import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Radio, Search, Sparkles } from "lucide-react";

import heroImage from "@/assets/hero-safari.jpg";
import { AdSlot } from "@/components/AdSlot";
import { EventCard } from "@/components/EventCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, type BukaEvent } from "@/lib/buka";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BukaLive — Watch tourism & live events as they happen" },
      {
        name: "description",
        content:
          "Browse live and upcoming broadcasts from safaris, festivals, concerts, weddings and sports. Buy access and watch from anywhere.",
      },
      { property: "og:title", content: "BukaLive — Watch the world's moments live" },
      {
        property: "og:description",
        content:
          "A live-streaming marketplace for tourism and live entertainment. Buy access, watch live, wherever you are.",
      },
    ],
  }),
  component: Home,
});

function useEvents(filter: "live" | "upcoming") {
  return useQuery({
    queryKey: ["events", "home", filter],
    queryFn: async () => {
      const query = supabase
        .from("events")
        .select("*")
        .eq("is_published", true)
        .eq("is_flagged", false);

      const { data, error } =
        filter === "live"
          ? await query.eq("status", "live").order("scheduled_at", { ascending: true }).limit(8)
          : await query
              .neq("status", "ended")
              .gte("scheduled_at", new Date().toISOString())
              .order("scheduled_at", { ascending: true })
              .limit(8);

      if (error) throw error;
      return (data ?? []) as BukaEvent[];
    },
  });
}

function Section({
  title,
  subtitle,
  events,
  loading,
  empty,
}: {
  title: string;
  subtitle: string;
  events: BukaEvent[];
  loading: boolean;
  empty: string;
}) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Button variant="ghost" asChild>
          <Link to="/browse">See all</Link>
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="rounded-2xl bg-muted px-5 py-8 text-center text-sm text-muted-foreground">
          {empty}
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </section>
  );
}

function Home() {
  const live = useEvents("live");
  const upcoming = useEvents("upcoming");

  return (
    <div>
      <section className="relative isolate overflow-hidden">
        <img
          src={heroImage}
          alt="Elephants at a waterhole at golden hour, streamed live"
          width={1600}
          height={1008}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-scrim" aria-hidden />
        <div className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-24 sm:pb-24 sm:pt-32">
          <span className="inline-flex items-center gap-2 rounded-full bg-background/90 px-3 py-1 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
            From satellites to safaris — Buka means to see
          </span>
          <h1 className="mt-5 max-w-2xl font-display text-4xl leading-tight text-primary-foreground sm:text-6xl">
            Be there live, from anywhere in the world
          </h1>
          <p className="mt-4 max-w-xl text-base text-primary-foreground/90 sm:text-lg">
            Safaris, festivals, weddings, concerts and sports — streamed live by the people on the
            ground. Buy access to a moment and watch it unfold.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link to="/browse">
                <Search className="mr-2 h-4 w-4" aria-hidden /> Explore events
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link to="/browse" search={{ when: "live" }}>
                <Radio className="mr-2 h-4 w-4" aria-hidden /> Live right now
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pt-10">
        <h2 className="mb-4 font-display text-2xl">Browse by category</h2>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <Link
              key={category.value}
              to="/browse"
              search={{ category: category.value }}
              className="rounded-full bg-sand px-4 py-2 text-sm font-medium text-sand-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              {category.label}
            </Link>
          ))}
        </div>
      </section>

      <Section
        title="Live now"
        subtitle="Streams happening at this moment"
        events={live.data ?? []}
        loading={live.isLoading}
        empty="Nothing is live this second. Check the upcoming broadcasts below."
      />

      <div className="mx-auto w-full max-w-6xl px-4">
        <AdSlot placement="discovery-banner" />
      </div>

      <Section
        title="Coming up"
        subtitle="Reserve your spot before the countdown ends"
        events={upcoming.data ?? []}
        loading={upcoming.isLoading}
        empty="No scheduled broadcasts yet — hosts are lining them up."
      />

      <section className="mx-auto mb-10 w-full max-w-6xl px-4">
        <div className="rounded-3xl bg-sunset px-6 py-12 text-center text-primary-foreground sm:px-12">
          <h2 className="font-display text-3xl">Hosting something worth seeing?</h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/90">
            Guides, organisers, couples, athletes and artists broadcast their events on BukaLive and
            earn from every viewer who tunes in.
          </p>
          <Button size="lg" variant="secondary" className="mt-6" asChild>
            <Link to="/host/apply">Apply to host</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
