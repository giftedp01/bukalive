import { createFileRoute, Link } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CoverImage } from "@/components/CoverImage";
import { supabase } from "@/integrations/supabase/client";
import { countryName } from "@/data/countries";
import { TOURISM_CATEGORIES as CATEGORIES } from "@/data/categories";
import { destinationImage, destinationsQuery, EVENT_SELECT } from "@/lib/destinations";
import { eventPhase, formatWhen, type BukaEvent } from "@/lib/buka";
import type { MapMarker } from "@/components/WorldMap";

const WorldMap = lazy(() => import("@/components/WorldMap").then((m) => ({ default: m.WorldMap })));

type Filter = "all" | "live" | "upcoming" | "recorded";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Live World Map — BukaLive" },
      {
        name: "description",
        content: "See what's live, starting soon and recorded at destinations around the world.",
      },
      { property: "og:title", content: "Live World Map — BukaLive" },
      { property: "og:description", content: "Explore live tourism experiences on a world map." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MapPage,
});

function MapPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [category, setCategory] = useState<string>("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const hasMapsKey = Boolean(import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"]);
  const { data: destinations } = useQuery(destinationsQuery);
  const { data: events } = useQuery({
    queryKey: ["map-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(EVENT_SELECT)
        .eq("is_published", true)
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as BukaEvent[];
    },
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (events ?? [])
      .map((e) => {
        const d = destinations?.find((x) => x.slug === e.destination_id);
        const lat = e.latitude ?? d?.latitude;
        const lng = e.longitude ?? d?.longitude;
        const phase = eventPhase(e);
        const kind: MapMarker["kind"] =
          phase === "live" ? "live" : phase === "upcoming" ? "upcoming" : "recorded";
        return { e, d, lat, lng, kind };
      })
      .filter((x) => x.lat != null && x.lng != null)
      .filter((x) => filter === "all" || x.kind === filter)
      .filter((x) => !category || x.e.category_id === category)
      .filter(
        (x) =>
          !term ||
          [x.e.title, x.e.location, x.d?.name, countryName(x.e.country_id ?? x.d?.country_id)]
            .filter(Boolean)
            .some((s) => String(s).toLowerCase().includes(term)),
      );
  }, [events, destinations, filter, category, q]);

  const markers = useMemo<MapMarker[]>(
    () =>
      filtered.map((x) => ({
        id: x.e.id,
        lat: x.lat!,
        lng: x.lng!,
        kind: x.kind,
        title: x.e.title,
      })),
    [filtered],
  );
  const onSelect = useCallback((id: string) => setSelected(id), []);
  const sel = filtered.find((x) => x.e.id === selected);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="font-display text-3xl">Live World Map</h1>
      <p className="mt-1 text-muted-foreground">What's happening around the world right now.</p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            className="pl-9"
            placeholder="Search a place or country"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {(["all", "live", "upcoming", "recorded"] as Filter[]).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
          >
            {f === "all"
              ? "All"
              : f === "live"
                ? "🔴 Live now"
                : f === "upcoming"
                  ? "🟡 Starting soon"
                  : "🔵 Recorded"}
          </Button>
        ))}
        <select
          className="h-9 rounded-md border bg-background px-3 text-sm"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Category"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="relative mt-5 h-[60vh] min-h-[420px]">
        <ClientOnly fallback={<Skeleton className="h-full w-full rounded-3xl" />}>
          <Suspense fallback={<Skeleton className="h-full w-full rounded-3xl" />}>
            <WorldMap markers={markers} onSelect={onSelect} />
          </Suspense>
        </ClientOnly>

        {sel && (
          <div className="absolute bottom-4 left-4 right-4 z-10 flex gap-3 rounded-2xl border bg-card p-3 shadow-lg sm:right-auto sm:w-96">
            <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl">
              <CoverImage
                path={sel.e.cover_image_url}
                fallback={destinationImage(sel.d)}
                alt={sel.e.title}
              />
            </div>
            <div className="min-w-0 flex-1">
              <Badge variant={sel.kind === "live" ? "default" : "secondary"} className="mb-1">
                {sel.kind === "live"
                  ? "LIVE NOW"
                  : sel.kind === "upcoming"
                    ? formatWhen(sel.e.scheduled_at)
                    : "Replay"}
              </Badge>
              <p className="truncate font-medium">{sel.e.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {sel.d?.name ?? sel.e.location} ·{" "}
                {countryName(sel.e.country_id ?? sel.d?.country_id)}
              </p>
              <Button size="sm" className="mt-2" asChild>
                <Link to="/events/$eventId" params={{ eventId: sel.e.id }}>
                  Open experience
                </Link>
              </Button>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setSelected(null)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {!hasMapsKey && markers.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {markers.slice(0, 6).map((marker) => {
            const item = filtered.find((x) => x.e.id === marker.id);
            if (!item) return null;
            return (
              <div key={marker.id} className="rounded-2xl border bg-card p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        marker.kind === "live"
                          ? "#e5484d"
                          : marker.kind === "upcoming"
                            ? "#f5b301"
                            : "#2f7de1",
                    }}
                  />
                  <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    {marker.kind === "live"
                      ? "Live now"
                      : marker.kind === "upcoming"
                        ? "Starting soon"
                        : "Replay"}
                  </span>
                </div>
                <p className="font-medium">{item.e.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.d?.name ?? item.e.location} ·{" "}
                  {countryName(item.e.country_id ?? item.d?.country_id)}
                </p>
                <Button size="sm" className="mt-3" asChild>
                  <Link to="/events/$eventId" params={{ eventId: item.e.id }}>
                    Open experience
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        {markers.length} experiences on the map
        {!hasMapsKey ? " (preview list shown while the map key is offline)" : ""}
      </p>
    </div>
  );
}
