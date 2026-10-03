import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";

import { SampleBadge } from "@/components/TrustBadges";
import { LISTING_KINDS, listingsQuery } from "@/lib/destinations";

/** The "Go There" journey: everything around a destination, grouped by need. */
export function GoTherePanel({ destinationSlug, bookUrl }: { destinationSlug: string; bookUrl?: string | null | undefined }) {
  const { data: listings = [], isLoading } = useQuery(listingsQuery(destinationSlug));

  return (
    <div className="space-y-6">
      {isLoading && <p className="text-sm text-muted-foreground">Loading nearby options…</p>}
      {!isLoading && listings.length === 0 && (
        <p className="rounded-2xl bg-muted p-5 text-sm text-muted-foreground">
          No nearby listings have been added for this destination yet.
        </p>
      )}
      {LISTING_KINDS.map(({ kind, label, icon }) => {
        const items = listings.filter((l) => l.kind === kind);
        if (!items.length) return null;
        return (
          <section key={kind}>
            <h3 className="mb-2 font-display text-lg">
              <span aria-hidden>{icon}</span> {label}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((l) => (
                <div key={l.id} className="rounded-2xl border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{l.name}</p>
                    {l.is_sample && <SampleBadge />}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{l.summary}</p>
                  {l.price_from && <p className="mt-1 text-xs font-medium">{l.price_from}</p>}
                  {l.url && (
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary">
                      View <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })}
      <section className="rounded-2xl bg-sand p-5 text-sand-foreground">
        <h3 className="font-display text-lg">Plan your trip</h3>
        <p className="mt-1 text-sm">
          {bookUrl
            ? "Book directly with the provider, then explore the rest of the destination."
            : "Online booking for this experience isn't connected yet. Save it and we'll keep it in My BukaLive."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {bookUrl && (
            <a href={bookUrl} target="_blank" rel="noopener noreferrer" className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              Book with provider
            </a>
          )}
          <Link to="/destinations/$slug" params={{ slug: destinationSlug }} className="rounded-full bg-background px-4 py-2 text-sm font-medium text-foreground">
            Explore the destination
          </Link>
        </div>
      </section>
    </div>
  );
}
