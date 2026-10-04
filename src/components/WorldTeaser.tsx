import { Link } from "@tanstack/react-router";

import type { BukaEvent } from "@/lib/buka";
import { eventPhase } from "@/lib/buka";
import type { Destination } from "@/lib/destinations";

/** Lightweight equirectangular "living world" panel — dots placed by lat/lng. */
export function WorldTeaser({
  destinations,
  events,
}: {
  destinations: Destination[];
  events: BukaEvent[];
}) {
  const statusFor = (slug: string) => {
    const evs = events.filter((e) => e.destination_id === slug);
    if (evs.some((e) => eventPhase(e) === "live")) return "live";
    if (evs.some((e) => eventPhase(e) === "upcoming")) return "upcoming";
    if (evs.length) return "replay";
    return "none";
  };

  return (
    <div className="relative aspect-[2/1] w-full overflow-hidden rounded-3xl bg-foreground">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: "radial-gradient(circle, var(--background) 1px, transparent 1.4px)",
          backgroundSize: "14px 14px",
        }}
        aria-hidden
      />
      {destinations
        .filter((d) => d.latitude != null && d.longitude != null)
        .map((d) => {
          const x = ((d.longitude! + 180) / 360) * 100;
          const y = ((90 - d.latitude!) / 180) * 100;
          const status = statusFor(d.slug);
          const color =
            status === "live" ? "bg-live" : status === "upcoming" ? "bg-primary" : "bg-accent";
          return (
            <Link
              key={d.slug}
              to="/destinations/$slug"
              params={{ slug: d.slug }}
              className="group absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x}%`, top: `${y}%` }}
              aria-label={`${d.name}${status === "live" ? " — live now" : ""}`}
            >
              {status === "live" && (
                <span
                  className={`absolute inset-0 animate-ping rounded-full ${color} opacity-60`}
                  aria-hidden
                />
              )}
              <span
                className={`relative block h-3 w-3 rounded-full ring-2 ring-background ${color}`}
              />
              <span className="pointer-events-none absolute left-1/2 top-5 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-background px-2 py-1 text-xs font-medium text-foreground shadow-soft group-hover:block group-focus:block">
                {d.name}
              </span>
            </Link>
          );
        })}
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-3 rounded-full bg-background/90 px-3 py-1.5 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-live" /> Live now
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" /> Starting soon
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-accent" /> Recorded
        </span>
      </div>
    </div>
  );
}
