import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Radio, Search, Video } from "lucide-react";
import { useState } from "react";

import heroImage from "@/assets/hero-safari.jpg";
import { EventCard } from "@/components/EventCard";
import { SaveButton } from "@/components/SaveButton";
import { WorldTeaser } from "@/components/WorldTeaser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TOURISM_CATEGORIES } from "@/data/categories";
import { countryName } from "@/data/countries";
import { supabase } from "@/integrations/supabase/client";
import { eventPhase, type BukaEvent } from "@/lib/buka";
import { destinationImage, destinationsQuery, EVENT_SELECT } from "@/lib/destinations";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BukaLive — Explore the world live" },
      {
        name: "description",
        content:
          "Watch destinations, experiences and events as they happen. Interact with the people there, discover what's nearby and turn inspiration into travel.",
      },
      { property: "og:title", content: "BukaLive — Explore the world live" },
      {
        property: "og:description",
        content:
          "Watch the world live, discover destinations and book the experience. Then go there.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const EXAMPLES = [
  "Kruger National Park",
  "Safari in Kenya",
  "Kyoto",
  "Whale watching",
  "Marrakech food",
];

function useAllEvents() {
  return useQuery({
    queryKey: ["events", "home"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(EVENT_SELECT)
        .eq("is_published", true)
        .eq("is_flagged", false)
        .order("scheduled_at", { ascending: true })
        .limit(80);
      if (error) throw error;
      return (data ?? []) as unknown as BukaEvent[];
    },
  });
}

function Row({
  title,
  subtitle,
  events,
  loading,
  empty,
  search,
  expandedCountdown = false,
}: {
  title: string;
  subtitle: string;
  events: BukaEvent[];
  loading: boolean;
  empty: string;
  search?: { when: "live" | "upcoming" };
  expandedCountdown?: boolean;
}) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Button variant="ghost" asChild>
          <Link to="/browse" search={search ?? {}}>
            See all <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-80 rounded-2xl" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="rounded-2xl bg-muted px-5 py-8 text-center text-sm text-muted-foreground">
          {empty}
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {events.map((event) => (
            <div key={event.id} className="space-y-2">
              <EventCard event={event} compactCountdown={!expandedCountdown} />
              {eventPhase(event) === "upcoming" && (
                <SaveButton
                  itemType="experience"
                  itemId={event.id}
                  reminder
                  size="sm"
                  variant="outline"
                  className="w-full"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const { data: events = [], isLoading } = useAllEvents();
  const { data: destinations = [] } = useQuery(destinationsQuery);

  const live = events
    .filter((e) => eventPhase(e) === "live")
    .sort((a, b) => (b.viewer_count ?? 0) - (a.viewer_count ?? 0));
  const soon = events.filter((e) => eventPhase(e) === "upcoming").slice(0, 8);
  const popular = [...events]
    .sort((a, b) => (b.viewer_count ?? 0) + b.view_count - ((a.viewer_count ?? 0) + a.view_count))
    .slice(0, 4);
  const featured = destinations.filter((d) => d.is_featured).slice(0, 6);

  const submit = (value: string) =>
    navigate({ to: "/browse", search: { q: value.trim() || undefined } });

  return (
    <div>
      <section className="relative isolate overflow-hidden">
        <img
          src={heroImage}
          alt="Elephants at a waterhole at golden hour, streamed live"
          width={1600}
          height={1008}
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-scrim" aria-hidden />
        <div className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-20 sm:pb-24 sm:pt-32">
          <span className="inline-flex items-center gap-2 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            <span className="live-dot" aria-hidden /> Only drone &amp; 360° livestreams
          </span>
          <h1 className="mt-5 max-w-3xl font-display text-5xl leading-[1.05] text-primary-foreground sm:text-7xl">
            Feel like you’re there.
          </h1>
          <p className="mt-5 max-w-xl text-base text-primary-foreground/90 sm:text-lg">
            Step inside the moment with immersive drone and 360° views. Meet the people on the
            ground, discover what’s nearby, and turn “wish I was there” into your next trip.
          </p>

          <form
            className="mt-8 flex max-w-2xl gap-2 rounded-full bg-background p-1.5 shadow-soft"
            onSubmit={(e) => {
              e.preventDefault();
              submit(q);
            }}
          >
            <Search className="ml-3 mt-3 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search destinations, experiences, places, events or tourism businesses"
              aria-label="Search BukaLive"
              className="h-11 border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
            <Button type="submit" className="h-11 rounded-full px-5">
              Search
            </Button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => submit(ex)}
                className="rounded-full bg-background/20 px-3 py-1 text-xs text-primary-foreground backdrop-blur transition-colors hover:bg-background/40"
              >
                “{ex}”
              </button>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link to="/browse" search={{ when: "live" }}>
                <Radio className="mr-2 h-4 w-4" aria-hidden /> EXPLORE LIVE
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link to="/host/apply">BECOME A HOST</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/request-livestream">
                <Video className="mr-2 h-4 w-4" aria-hidden /> ASK FOR A LIVESTREAM
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-b bg-sand/40">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-4 px-4 py-6 text-center text-sm sm:grid-cols-3 lg:grid-cols-5">
          {["Watch", "Interact", "Discover", "Book", "Go there"].map((step, i) => (
            <div key={step}>
              <span className="font-display text-2xl text-primary">0{i + 1}</span>
              <p className="font-medium">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <Row
        title="Live now"
        subtitle="Experiences happening around the world right now"
        events={live.slice(0, 8)}
        loading={isLoading}
        empty="Nothing is live this second. Check what's starting soon below."
        search={{ when: "live" }}
      />

      <Row
        title="Starting soon"
        subtitle="Set a reminder and be there when it begins"
        events={soon}
        loading={isLoading}
        empty="No scheduled experiences yet — hosts are lining them up."
        search={{ when: "upcoming" }}
        expandedCountdown
      />

      <section className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl">Explore destinations</h2>
            <p className="text-sm text-muted-foreground">
              A few places to start — BukaLive works anywhere in the world
            </p>
          </div>
          <Button variant="ghost" asChild>
            <Link to="/destinations">
              All destinations <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((d, i) => (
            <Link
              key={d.slug}
              to="/destinations/$slug"
              params={{ slug: d.slug }}
              className={`group relative block overflow-hidden rounded-3xl ${i === 0 ? "sm:row-span-2" : ""}`}
            >
              <img
                src={destinationImage(d)}
                alt={d.name}
                loading="lazy"
                width={1280}
                height={800}
                className={`w-full object-cover transition-transform duration-500 group-hover:scale-105 ${i === 0 ? "h-64 sm:h-full" : "h-64"}`}
              />
              <div className="absolute inset-0 bg-scrim" aria-hidden />
              <div className="absolute bottom-4 left-4 right-4 text-primary-foreground">
                <p className="text-xs uppercase tracking-widest opacity-90">
                  {countryName(d.country_id)}
                </p>
                <p className="font-display text-2xl">{d.name}</p>
                <p className="line-clamp-1 text-sm opacity-90">{d.summary}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <Row
        title="Popular experiences"
        subtitle="What travellers are watching and saving most"
        events={popular}
        loading={isLoading}
        empty="Popular experiences will appear here."
      />

      <section className="mx-auto w-full max-w-6xl px-4 py-10">
        <h2 className="font-display text-2xl sm:text-3xl">Discover the world</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Every dot is a destination with live or recorded experiences. Tap one to go there.
        </p>
        <WorldTeaser destinations={destinations} events={events} />
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-6">
        <h2 className="mb-4 font-display text-2xl">Browse by category</h2>
        <div className="flex flex-wrap gap-2">
          {TOURISM_CATEGORIES.map((category) => (
            <Link
              key={category.id}
              to="/browse"
              search={{ tourism_category: category.id }}
              className="rounded-full bg-sand px-4 py-2 text-sm font-medium text-sand-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <span aria-hidden>{category.icon}</span> {category.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto my-10 w-full max-w-6xl px-4">
        <div className="rounded-3xl bg-sunset px-6 py-12 text-center text-primary-foreground sm:px-12">
          <h2 className="font-display text-3xl">Run a lodge, tour, attraction or event?</h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/90">
            Show travellers what it's really like, answer their questions live, and send them
            straight to your booking page.
          </p>
          <Button size="lg" variant="secondary" className="mt-6" asChild>
            <Link to="/host/apply">Become a host</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
