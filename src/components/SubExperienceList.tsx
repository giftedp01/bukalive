import { Link } from "@tanstack/react-router";
import { BookOpen, MapPin, Utensils, Map, Hotel, Radio } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SubExperience } from "@/lib/buka";

// ─── Status badge ────────────────────────────────────────────────────────────

function StatusBadge({ sub }: { sub: SubExperience }) {
  if (sub.status === "live") {
    return (
      <Badge className="gap-1.5 bg-live text-live-foreground">
        <span className="live-dot" aria-hidden /> LIVE
      </Badge>
    );
  }
  if (sub.status === "upcoming") {
    const when = sub.scheduledAt
      ? new Date(sub.scheduledAt).toLocaleString(undefined, {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Coming soon";
    return <Badge variant="secondary">Upcoming · {when}</Badge>;
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Ended
    </Badge>
  );
}

// ─── Action buttons ───────────────────────────────────────────────────────────

function ActionButtons({ sub, eventId }: { sub: SubExperience; eventId: string }) {
  const { actions, status } = sub;
  if (!actions) return null;

  const showWatchLive = status === "live" && actions.watchLive;

  return (
    <div className="flex flex-wrap gap-2">
      {showWatchLive && (
        <Button size="sm" className="gap-1.5 bg-live text-live-foreground hover:bg-live/90" asChild>
          <Link
            to="/watch/$eventId"
            params={{ eventId }}
            search={{ subExperienceId: sub.id } as Record<string, string>}
          >
            <Radio className="h-3.5 w-3.5" aria-hidden />
            Watch Live
          </Link>
        </Button>
      )}

      {actions.book && (
        <Button size="sm" variant="outline" className="gap-1.5" asChild>
          <a href={actions.book.url} target="_blank" rel="noopener noreferrer">
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
            {actions.book.label}
          </a>
        </Button>
      )}

      {actions.visit && (
        <Button size="sm" variant="outline" className="gap-1.5" asChild>
          <a href={actions.visit.url} target="_blank" rel="noopener noreferrer">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {actions.visit.label}
          </a>
        </Button>
      )}

      {actions.stay && (
        <Button size="sm" variant="outline" className="gap-1.5" asChild>
          <a href={actions.stay.url} target="_blank" rel="noopener noreferrer">
            <Hotel className="h-3.5 w-3.5" aria-hidden />
            {actions.stay.label}
          </a>
        </Button>
      )}

      {actions.eat && (
        <Button size="sm" variant="outline" className="gap-1.5" asChild>
          <a href={actions.eat.url} target="_blank" rel="noopener noreferrer">
            <Utensils className="h-3.5 w-3.5" aria-hidden />
            {actions.eat.label}
          </a>
        </Button>
      )}

      {actions.explore && (
        <Button size="sm" variant="outline" className="gap-1.5" asChild>
          <a href={actions.explore.url} target="_blank" rel="noopener noreferrer">
            <Map className="h-3.5 w-3.5" aria-hidden />
            {actions.explore.label}
          </a>
        </Button>
      )}
    </div>
  );
}

// ─── Sub-experience card ──────────────────────────────────────────────────────

function SubExperienceCard({ sub, eventId }: { sub: SubExperience; eventId: string }) {
  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-base font-semibold">{sub.name}</h3>
          <StatusBadge sub={sub} />
        </div>

        {sub.description && <p className="text-sm text-muted-foreground">{sub.description}</p>}

        <ActionButtons sub={sub} eventId={eventId} />
      </CardContent>
    </Card>
  );
}

// ─── Public list component ────────────────────────────────────────────────────

export function SubExperienceList({
  subExperiences,
  eventId,
}: {
  subExperiences: SubExperience[];
  eventId: string;
}) {
  if (!subExperiences.length) return null;

  return (
    <section>
      <h2 className="font-display text-xl">Experiences</h2>
      <div className="mt-3 space-y-3">
        {subExperiences.map((sub) => (
          <SubExperienceCard key={sub.id} sub={sub} eventId={eventId} />
        ))}
      </div>
    </section>
  );
}
