import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { SampleBadge } from "@/components/TrustBadges";
import { Skeleton } from "@/components/ui/skeleton";
import { countryName } from "@/data/countries";
import { destinationImage, destinationsQuery } from "@/lib/destinations";

export const Route = createFileRoute("/destinations/")({
  head: () => ({
    meta: [
      { title: "Destinations around the world — BukaLive" },
      { name: "description", content: "Explore destinations worldwide with live and recorded experiences, nearby stays, food and attractions." },
      { property: "og:title", content: "Destinations around the world — BukaLive" },
      { property: "og:description", content: "Pick a place, watch it live, then plan how to get there." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Destinations,
});

function Destinations() {
  const { data = [], isLoading } = useQuery(destinationsQuery);
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="font-display text-4xl">Destinations</h1>
      <p className="mt-1 text-muted-foreground">Places with live and recorded experiences. More are added as hosts join from around the world.</p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-72 rounded-3xl" />)
          : data.map((d) => (
              <Link key={d.slug} to="/destinations/$slug" params={{ slug: d.slug }} className="group relative block overflow-hidden rounded-3xl">
                <img src={destinationImage(d)} alt={d.name} loading="lazy" width={1280} height={800} className="h-72 w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-scrim" aria-hidden />
                {d.is_sample && <div className="absolute right-3 top-3"><SampleBadge /></div>}
                <div className="absolute bottom-4 left-4 right-4 text-primary-foreground">
                  <p className="text-xs uppercase tracking-widest opacity-90">{[d.region, countryName(d.country_id)].filter(Boolean).join(" · ")}</p>
                  <p className="font-display text-2xl">{d.name}</p>
                  <p className="line-clamp-2 text-sm opacity-90">{d.summary}</p>
                </div>
              </Link>
            ))}
      </div>
    </div>
  );
}
