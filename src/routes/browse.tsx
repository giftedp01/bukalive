import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";

import { AdSlot } from "@/components/AdSlot";
import { EventCard } from "@/components/EventCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, type BukaEvent } from "@/lib/buka";

type BrowseSearch = { q?: string; category?: string; when?: "all" | "live" | "upcoming" };

export const Route = createFileRoute("/browse")({
  validateSearch: (search: Record<string, unknown>): BrowseSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
    category: typeof search.category === "string" ? search.category : undefined,
    when:
      search.when === "live" || search.when === "upcoming" || search.when === "all"
        ? search.when
        : undefined,
  }),
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
        content: "Find a live moment to watch, filtered by category, keyword and destination.",
      },
    ],
  }),
  component: Browse,
});

function Browse() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/browse" });
  const when = search.when ?? "all";
  const category = search.category;
  const q = search.q ?? "";

  const setSearch = (next: Partial<BrowseSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...next }) });

  const { data, isLoading } = useQuery({
    queryKey: ["events", "browse", q, category, when],
    queryFn: async () => {
      let query = supabase
        .from("events")
        .select("*")
        .eq("is_published", true)
        .eq("is_flagged", false);

      if (category) query = query.eq("category", category as BukaEvent["category"]);
      if (when === "live") query = query.eq("status", "live");
      if (when === "upcoming") {
        query = query.neq("status", "ended").gte("scheduled_at", new Date().toISOString());
      }
      if (q.trim()) query = query.or(`title.ilike.%${q}%,location.ilike.%${q}%`);

      const { data, error } = await query.order("scheduled_at", { ascending: true }).limit(60);
      if (error) throw error;
      return (data ?? []) as BukaEvent[];
    },
  });

  const events = data ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl">Find your next live moment</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Search by keyword or destination, then filter by category.
      </p>

      <div className="mt-6 space-y-4">
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

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={!category ? "default" : "outline"}
            onClick={() => setSearch({ category: undefined })}
          >
            All categories
          </Button>
          {CATEGORIES.map((item) => (
            <Button
              key={item.value}
              size="sm"
              variant={category === item.value ? "default" : "outline"}
              onClick={() => setSearch({ category: item.value })}
            >
              {item.label}
            </Button>
          ))}
        </div>
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
            Try a different category or clear your search.
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
