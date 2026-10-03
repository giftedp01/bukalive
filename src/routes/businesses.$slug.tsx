import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, MapPin } from "lucide-react";

import { EventCard } from "@/components/EventCard";
import { SaveButton } from "@/components/SaveButton";
import { SampleBadge, VerifiedBadge } from "@/components/TrustBadges";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { countryName } from "@/data/countries";
import { supabase } from "@/integrations/supabase/client";
import { categoryLabel, eventPhase, type BukaEvent } from "@/lib/buka";
import { BUSINESS_TYPES, EVENT_SELECT, type Business } from "@/lib/destinations";

export const Route = createFileRoute("/businesses/$slug")({
  head: () => ({
    meta: [
      { title: "Tourism business — BukaLive" },
      { name: "description", content: "Live experiences, upcoming broadcasts and booking links from this tourism provider." },
      { property: "og:title", content: "Tourism business — BukaLive" },
      { property: "og:description", content: "Watch, follow and book with this provider on BukaLive." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BusinessPage,
});

function BusinessPage() {
  const { slug } = Route.useParams();
  const { data: b, isLoading } = useQuery({
    queryKey: ["business", slug],
    queryFn: async () => {
      const { data } = await supabase.from("businesses" as never).select("*").eq("slug", slug).maybeSingle();
      return (data as unknown as Business) ?? null;
    },
  });
  const { data: events = [] } = useQuery({
    queryKey: ["events", "business", b?.id],
    enabled: !!b,
    queryFn: async () => {
      const { data } = await supabase.from("events").select(EVENT_SELECT).eq("business_id" as never, b!.id).eq("is_published", true).order("scheduled_at");
      return (data ?? []) as unknown as BukaEvent[];
    },
  });

  if (isLoading) return <div className="mx-auto max-w-5xl px-4 py-10"><Skeleton className="h-60 rounded-3xl" /></div>;
  if (!b) return <div className="py-20 text-center"><h1 className="font-display text-2xl">Business not found</h1></div>;

  const live = events.filter((e) => eventPhase(e) === "live");
  const upcoming = events.filter((e) => eventPhase(e) === "upcoming");
  const past = events.filter((e) => eventPhase(e) === "ended");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="rounded-3xl bg-sand p-6 text-sand-foreground sm:p-10">
        <div className="flex flex-wrap gap-2">
          <VerifiedBadge status={b.verification_status} />
          {b.is_sample && <SampleBadge />}
        </div>
        <h1 className="mt-3 font-display text-4xl">{b.name}</h1>
        <p className="mt-1 flex items-center gap-1 text-sm"><MapPin className="h-4 w-4" /> {[b.city, countryName(b.country_id)].filter(Boolean).join(", ")}</p>
        <p className="mt-1 text-sm">{BUSINESS_TYPES[b.business_type] ?? b.business_type}{b.category_id ? ` · ${categoryLabel(b.category_id)}` : ""}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {b.website && <Button asChild><a href={b.website} target="_blank" rel="noopener noreferrer">Book <ExternalLink className="ml-1 h-4 w-4" /></a></Button>}
          <SaveButton itemType="business" itemId={b.slug} />
          {b.destination_slug && <Button variant="outline" asChild><Link to="/destinations/$slug" params={{ slug: b.destination_slug }} hash="plan">Go there</Link></Button>}
        </div>
      </div>
      <section className="mt-8"><h2 className="font-display text-2xl">About</h2><p className="mt-2 text-muted-foreground">{b.description || b.summary}</p></section>
      {[["Live experiences", live], ["Upcoming", upcoming], ["Replays", past]].map(([t, list]) =>
        (list as BukaEvent[]).length ? (
          <section key={t as string} className="mt-10">
            <h2 className="mb-4 font-display text-2xl">{t as string}</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{(list as BukaEvent[]).map((e) => <EventCard key={e.id} event={e} />)}</div>
          </section>
        ) : null,
      )}
    </div>
  );
}
