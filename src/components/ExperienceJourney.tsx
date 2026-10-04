import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Compass, Eye, MapPin, Navigation, Share2, Ticket } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { GoTherePanel } from "@/components/GoTherePanel";
import { SaveButton } from "@/components/SaveButton";
import { SampleBadge, VerifiedBadge } from "@/components/TrustBadges";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { countryName } from "@/data/countries";
import { categoryLabel, eventPhase, type BukaEvent } from "@/lib/buka";
import { destinationsQuery, type VerificationStatus } from "@/lib/destinations";

/** Watch → Discover → Book → Go there. Sits on every experience page. */
export function ExperienceJourney({ event }: { event: BukaEvent }) {
  const [open, setOpen] = useState(false);
  const { data: destinations } = useQuery(destinationsQuery);
  const d = destinations?.find((x) => x.slug === event.destination_id);
  const phase = eventPhase(event);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: event.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {phase === "live" && (event.viewer_count ?? 0) > 0 && (
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            <Eye className="h-4 w-4" /> {event.viewer_count} watching
          </span>
        )}
        <span>
          {categoryLabel(event.category_id ?? event.category)}
          {event.subcategory ? ` · ${event.subcategory}` : ""}
        </span>
        {event.is_sample && <SampleBadge />}
      </div>

      {event.business && (
        <Link
          to="/businesses/$slug"
          params={{ slug: event.business.slug }}
          className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-4 transition-colors hover:bg-muted"
        >
          <div>
            <p className="text-xs text-muted-foreground">Hosted by</p>
            <p className="font-medium">{event.business.name}</p>
          </div>
          <VerifiedBadge
            status={event.business.verification_status as VerificationStatus}
            compact
          />
        </Link>
      )}

      <div className="rounded-3xl bg-sand p-5 text-sand-foreground">
        <p className="font-display text-xl">Want to experience this yourself?</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {event.book_url ? (
            <Button asChild>
              <a href={event.book_url} target="_blank" rel="noopener noreferrer">
                <Ticket className="mr-1.5 h-4 w-4" /> Book experience
              </a>
            </Button>
          ) : (
            <Button disabled title="This provider hasn't connected booking yet">
              <Ticket className="mr-1.5 h-4 w-4" /> Booking coming soon
            </Button>
          )}
          {d && (
            <Button
              variant="default"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => setOpen(true)}
            >
              <Navigation className="mr-1.5 h-4 w-4" /> GO THERE
            </Button>
          )}
          <SaveButton itemType="experience" itemId={event.id} />
          <Button variant="secondary" onClick={share}>
            <Share2 className="mr-1.5 h-4 w-4" /> Share
          </Button>
          {d && (
            <Button variant="outline" asChild>
              <Link to="/destinations/$slug" params={{ slug: d.slug }}>
                <Compass className="mr-1.5 h-4 w-4" /> Explore nearby
              </Link>
            </Button>
          )}
        </div>
      </div>

      {d && (
        <div className="rounded-2xl border p-4">
          <p className="flex items-center gap-1 text-sm font-medium">
            <MapPin className="h-4 w-4" /> {d.name}, {countryName(d.country_id)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{d.summary}</p>
          {event.latitude != null && (
            <a
              className="mt-2 inline-block text-sm font-medium text-primary underline"
              target="_blank"
              rel="noopener noreferrer"
              href={`https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`}
            >
              See it on the map
            </a>
          )}
        </div>
      )}

      {d && (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
            <SheetHeader>
              <SheetTitle className="font-display text-2xl">Go there: {d.name}</SheetTitle>
              <SheetDescription>
                Where to stay, what else to do, how to get there — then book.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              <GoTherePanel destinationSlug={d.slug} bookUrl={event.book_url} />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </section>
  );
}
