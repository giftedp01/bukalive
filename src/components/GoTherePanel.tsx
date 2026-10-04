import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ExternalLink, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

import { SampleBadge } from "@/components/TrustBadges";
import { LISTING_KINDS, destinationsQuery, listingsQuery } from "@/lib/destinations";

/** The "Go There" journey: everything around a destination, grouped by need. */
export function GoTherePanel({
  destinationSlug,
  bookingUrl,
}: {
  destinationSlug: string;
  bookingUrl?: string | null | undefined;
}) {
  const { data: listings = [], isLoading, isError } = useQuery(listingsQuery(destinationSlug));
  const { data: destinations = [] } = useQuery(destinationsQuery);
  const destination = destinations.find((item) => item.slug === destinationSlug);
  const destinationLabel = [
    destination?.name ?? destinationSlug,
    destination?.city,
    destination?.region,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-6">
      {isLoading && <p className="text-sm text-muted-foreground">Loading nearby options…</p>}
      {isError && (
        <p className="rounded-2xl bg-muted p-5 text-sm text-muted-foreground">
          Nearby options couldn’t be loaded. Please try refreshing the page.
        </p>
      )}
      {!isLoading && !isError && listings.length === 0 && (
        <p className="rounded-2xl bg-muted p-5 text-sm text-muted-foreground">
          No nearby listings have been added for this destination yet.
        </p>
      )}
      {LISTING_KINDS.map(({ kind, label, icon }) => {
        const items = isError ? [] : listings.filter((l) => l.kind === kind);
        if (!items.length) return null;
        return (
          <section key={kind}>
            <h3 className="mb-2 font-display text-lg">
              <span aria-hidden>{icon}</span> {label}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((l) => (
                <div key={l.id} className="flex min-w-0 flex-col rounded-2xl border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{l.name}</p>
                    {l.is_sample && <SampleBadge />}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{l.summary}</p>
                  {l.price_from && <p className="mt-1 text-xs font-medium">{l.price_from}</p>}
                  <Button className="mt-3 w-full" size="sm" variant="outline" asChild>
                    <a
                      href={
                        l.link_url ??
                        l.url ??
                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          [l.name, destinationLabel].filter(Boolean).join(", "),
                        )}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {l.link_url || l.url ? (
                        <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
                      ) : (
                        <MapPin className="mr-2 h-4 w-4" aria-hidden />
                      )}
                      {l.link_url || l.url
                        ? l.kind === "stay" || l.kind === "activity"
                          ? "Book"
                          : l.kind === "food"
                            ? "View menu"
                            : "Details"
                        : "View on map"}
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </section>
        );
      })}
      <section className="rounded-2xl bg-sand p-5 text-sand-foreground">
        <h3 className="font-display text-lg">Plan your trip</h3>
        <p className="mt-1 text-sm">
          {bookingUrl
            ? "Book directly with the provider, then explore the rest of the destination."
            : "Online booking for this experience isn't connected yet. Save it and we'll keep it in My BukaLive."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {bookingUrl && (
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Book this experience
            </a>
          )}
          <Link
            to="/destinations/$slug"
            params={{ slug: destinationSlug }}
            className="rounded-full bg-background px-4 py-2 text-sm font-medium text-foreground"
          >
            Explore the destination
          </Link>
        </div>
      </section>
    </div>
  );
}
