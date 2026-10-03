import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";

import { AdSlot } from "@/components/AdSlot";
import { EventCard } from "@/components/EventCard";
import { CountrySelector } from "@/components/browse/CountrySelector";
import { CategorySelector } from "@/components/browse/CategorySelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { type BukaEvent } from "@/lib/buka";
import { EVENT_SELECT } from "@/lib/destinations";

type BrowseSearch = {
  q?: string | undefined;
  when?: "all" | "live" | "upcoming" | undefined;
  country?: string | undefined;
  tourism_category?: string | undefined;
};

export const Route = createFileRoute("/browse")({
  validateSearch: (search: Record<string, unknown>): BrowseSearch => {
    const when = search["when"];
    return {
      q: typeof search["q"] === "string" && search["q"] ? (search["q"] as string) : undefined,
      when: when === "live" || when === "upcoming" || when === "all" ? when : undefined,
      country: typeof search["country"] === "string" ? (search["country"] as string) : undefined,
      tourism_category:
        typeof search["tourism_category"] === "string"
          ? (search["tourism_category"] as string)
          : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Browse live & upcoming events — BukaLive" },
      {
        name: "description",
        content:
          "Search live and upcoming BukaLive broadcasts by category, keyword and destination — safaris, festivals, concerts, sports and more.",
      },
      { property: "og:title", content: "Browse live & upcoming events — BukaLive" },
      {
        property: "og:description",
        content: "Find a live moment to watch, filtered by country and category.",
      },
    ],
  }),
  component: Browse,
});

function Browse() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/browse" });
  const when = search.when ?? "all";
  const q = search.q ?? "";
  const country = search.country;
  const tourism_category = search.tourism_category;

  const setSearch = (next: Partial<BrowseSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...next }) });

  const hasFilters = !!(country || tourism_category);

  const clearFilters = () => setSearch({ country: undefined, tourism_category: undefined });

  const { data, isLoading } = useQuery({
    queryKey: ["events", "browse", q, when, country, tourism_category],
    queryFn: async () => {
      let query = supabase
        .from("events")
        .select(EVENT_SELECT)
        .eq("is_published", true)
        .eq("is_flagged", false);

      if (when === "live") query = query.eq("status", "live");
      if (when === "upcoming") {
        query = query.neq("status", "ended").gte("scheduled_at", new Date().toISOString());
      }
      if (q.trim()) query = query.or(`title.ilike.%${q}%,location.ilike.%${q}%,description.ilike.%${q}%,subcategory.ilike.%${q}%`);
      if (tourism_category) query = query.eq("category_id", tourism_category);
      if (country) query = query.eq("country_id", country);

      const { data, error } = await query.order("scheduled_at", { ascending: true }).limit(60);
      if (error) throw error;
      return (data ?? []) as unknown as BukaEvent[];
    },
  });

  const events = data ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl">Find your next live moment</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Filter by country and category — or search by keyword.
      </p>

      <div className="mt-6 space-y-4">
        {/* Keyword search */}
        <div className="relative max-w-xl">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={q}
            onChange={(e) => setSearch({ q: e.target.value || undefined })}
            placeholder="Try “Serengeti”, “jazz”, “marathon”…"
            className="h-12 rounded-full pl-9"
            aria-label="Search events"
          />
        </div>

        {/* When filter */}
        <div className="flex flex-wrap gap-2">
          {(["all", "live", "upcoming"] as const).map((option) => (
            <Button
              key={option}
              size="sm"
              variant={when === option ? "default" : "secondary"}
              onClick={() => setSearch({ when: option })}
            >
              {option === "all" ? "Everything" : option === "live" ? "Live now" : "Upcoming"}
            </Button>
          ))}
        </div>

        {/* Location & category selectors */}
        <CountrySelector value={country} onChange={(id) => setSearch({ country: id })} allowAll />
        <CategorySelector
          value={tourism_category}
          onChange={(id) => setSearch({ tourism_category: id })}
        />

        {hasFilters && (
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-muted-foreground"
            onClick={clearFilters}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Clear all filters
          </Button>
        )}
      </div>

      <div className="my-8">
        <AdSlot placement="discovery-banner" />
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl bg-muted px-6 py-16 text-center">
          <p className="font-display text-xl">No events match that yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try a different filter or clear your search.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {events.length} event{events.length === 1 ? "" : "s"}
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
