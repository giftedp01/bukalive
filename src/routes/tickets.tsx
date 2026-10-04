import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Ticket } from "lucide-react";

import { CoverImage } from "@/components/CoverImage";
import { Countdown } from "@/components/Countdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { eventPhase, formatPrice, formatWhen, isWatchable, type BukaEvent } from "@/lib/buka";

export const Route = createFileRoute("/tickets")({
  head: () => ({
    meta: [
      { title: "My BukaLive — BukaLive" },
      {
        name: "description",
        content: "Your saved experiences, reminders and unlocked broadcasts on BukaLive.",
      },
      { property: "og:title", content: "My BukaLive — BukaLive" },
      {
        property: "og:description",
        content: "Your saved experiences, reminders and unlocked broadcasts on BukaLive.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Tickets,
});

type PurchaseRow = {
  id: string;
  amount_cents: number;
  currency: string;
  purchased_at: string;
  event: BukaEvent | null;
};

type SavedExperienceRow = {
  item_id: string;
  created_at: string;
  event: BukaEvent | null;
};

function Tickets() {
  const { user, loading } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["tickets", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select("id, amount_cents, currency, purchased_at, event:events(*)")
        .eq("viewer_id", user!.id)
        .order("purchased_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PurchaseRow[];
    },
  });

  const { data: savedItems, isLoading: savedLoading } = useQuery({
    queryKey: ["saved-experiences", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: rows, error: rowsError } = await supabase
        .from("saves")
        .select("item_id, created_at")
        .eq("user_id", user!.id)
        .eq("item_type", "experience")
        .order("created_at", { ascending: false });
      if (rowsError) throw rowsError;

      const ids = (rows ?? []).map((row) => row.item_id).filter(Boolean);
      if (ids.length === 0) return [] as SavedExperienceRow[];

      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("*, business:businesses(id, slug, name, verification_status, is_sample)")
        .in("id", ids)
        .order("scheduled_at", { ascending: false });
      if (eventsError) throw eventsError;

      const byId = new Map((events ?? []).map((event) => [event.id, event]));
      return (rows ?? [])
        .map((row) => ({
          item_id: row.item_id,
          created_at: row.created_at,
          event: byId.get(row.item_id) as BukaEvent | null,
        }))
        .filter((row) => row.event) as SavedExperienceRow[];
    },
  });

  if (loading)
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl">Sign in to see your tickets</h1>
        <Button className="mt-5" asChild>
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }

  const tickets = data ?? [];
  const reminderEvents = (savedItems ?? []).filter(
    (row) => row.event && eventPhase(row.event) === "upcoming",
  );
  const savedEvents = (savedItems ?? []).filter(
    (row) => row.event && eventPhase(row.event) !== "upcoming",
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="font-display text-3xl">My BukaLive</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Saved experiences, reminders and every live moment you have unlocked.
      </p>

      <div className="mt-8 space-y-8">
        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-display text-xl">Saved & reminders</h2>
            <span className="text-xs text-muted-foreground">{(savedItems ?? []).length} saved</span>
          </div>

          {savedLoading ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
          ) : (savedItems ?? []).length === 0 ? (
            <div className="rounded-2xl bg-muted px-6 py-12 text-center text-sm text-muted-foreground">
              Save a live experience or set a reminder to keep it in your shortlist.
            </div>
          ) : (
            <div className="space-y-3">
              {savedEvents.length > 0 && (
                <div className="space-y-3">
                  {savedEvents.map((row) => {
                    const event = row.event!;
                    return (
                      <div
                        key={row.item_id}
                        className="flex flex-col gap-3 rounded-2xl border bg-card p-3 sm:flex-row sm:items-center"
                      >
                        <CoverImage
                          path={event.cover_image_url}
                          alt={event.title}
                          className="h-20 w-full rounded-xl sm:w-28"
                        />
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-display text-lg">{event.title}</p>
                            <Badge variant="secondary">Saved</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatWhen(event.scheduled_at)} · {event.location || "Online"}
                          </p>
                        </div>
                        <Button size="sm" asChild>
                          <Link to="/events/$eventId" params={{ eventId: event.id }}>
                            View
                          </Link>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {reminderEvents.length > 0 && (
                <div className="space-y-3">
                  {reminderEvents.map((row) => {
                    const event = row.event!;
                    return (
                      <div
                        key={row.item_id}
                        className="flex flex-col gap-3 rounded-2xl border border-dashed bg-sand/40 p-3 sm:flex-row sm:items-center"
                      >
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-display text-lg">{event.title}</p>
                            <Badge className="bg-live text-live-foreground">Reminder</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Starts {formatWhen(event.scheduled_at)} · {event.location || "Online"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Countdown target={event.scheduled_at} compact />
                          <Button size="sm" asChild>
                            <Link to="/events/$eventId" params={{ eventId: event.id }}>
                              Open
                            </Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-display text-xl">Tickets</h2>
            <span className="text-xs text-muted-foreground">{tickets.length} unlocked</span>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="rounded-2xl bg-muted px-6 py-12 text-center">
              <Ticket className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
              <p className="mt-3 font-display text-xl">No tickets yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Find a live moment worth watching and unlock it.
              </p>
              <Button className="mt-5" asChild>
                <Link to="/browse">Browse events</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => {
                const event = ticket.event;
                if (!event) {
                  return (
                    <div
                      key={ticket.id}
                      className="rounded-2xl border px-5 py-4 text-sm text-muted-foreground"
                    >
                      This event is no longer available.
                    </div>
                  );
                }
                const phase = eventPhase(event);
                return (
                  <div
                    key={ticket.id}
                    className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center"
                  >
                    <CoverImage
                      path={event.cover_image_url}
                      alt={event.title}
                      className="h-24 w-full rounded-xl sm:w-36"
                    />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-lg">{event.title}</h3>
                        {phase === "live" && (
                          <Badge className="gap-1.5 bg-live text-live-foreground">
                            <span className="live-dot" aria-hidden /> LIVE
                          </Badge>
                        )}
                        {phase === "ended" && <Badge variant="secondary">Ended</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatWhen(event.scheduled_at)} · {event.location || "Online"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Paid {formatPrice(ticket.amount_cents, ticket.currency)} on{" "}
                        {new Date(ticket.purchased_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      {phase === "upcoming" && <Countdown target={event.scheduled_at} compact />}
                      <Button
                        size="sm"
                        disabled={
                          !isWatchable(event) &&
                          !(
                            phase === "ended" &&
                            (event.video_path || event.video_url || event.replay_url)
                          )
                        }
                        asChild={
                          isWatchable(event) ||
                          (phase === "ended" &&
                            !!(event.video_path || event.video_url || event.replay_url))
                        }
                      >
                        {phase === "ended" &&
                        (event.video_path || event.video_url || event.replay_url) ? (
                          <Link to="/replay/$eventId" params={{ eventId: event.id }}>
                            Watch replay
                          </Link>
                        ) : isWatchable(event) ? (
                          <Link to="/watch/$eventId" params={{ eventId: event.id }}>
                            Watch now
                          </Link>
                        ) : (
                          <span>Opens at start time</span>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
