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
      { title: "My tickets — BukaLive" },
      {
        name: "description",
        content: "Every BukaLive broadcast you've unlocked, with countdowns and watch links.",
      },
      { property: "og:title", content: "My tickets — BukaLive" },
      { property: "og:description", content: "Your unlocked live broadcasts on BukaLive." },
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

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="font-display text-3xl">My tickets</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Everything you've unlocked, newest first.
      </p>

      {isLoading ? (
        <div className="mt-8 space-y-4">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="mt-8 rounded-2xl bg-muted px-6 py-16 text-center">
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
        <div className="mt-8 space-y-4">
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
                    <h2 className="font-display text-lg">{event.title}</h2>
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
                  <Button size="sm" disabled={!isWatchable(event)} asChild={isWatchable(event)}>
                    {isWatchable(event) ? (
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
    </div>
  );
}
