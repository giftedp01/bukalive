import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Radio, Square } from "lucide-react";
import { toast } from "sonner";

import { CoverImage } from "@/components/CoverImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { eventPhase, formatPrice, formatWhen, type BukaEvent } from "@/lib/buka";

export const Route = createFileRoute("/host/")({
  head: () => ({
    meta: [
      { title: "Host dashboard — BukaLive" },
      {
        name: "description",
        content: "Manage your BukaLive broadcasts, go live, and track viewers and revenue per event.",
      },
      { property: "og:title", content: "Host dashboard — BukaLive" },
      { property: "og:description", content: "Your events, viewers and earnings in one place." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HostDashboard,
});

function HostDashboard() {
  const { user, profile, loading } = useAuth();
  const queryClient = useQueryClient();

  const { data: events, isLoading } = useQuery({
    queryKey: ["host-events", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("host_id", user!.id)
        .eq("is_sample" as never, false)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BukaEvent[];
    },
  });

  const { data: sales } = useQuery({
    queryKey: ["host-sales", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("purchases").select("event_id, amount_cents");
      if (error) throw error;
      const totals = new Map<string, { count: number; cents: number }>();
      for (const row of data ?? []) {
        const current = totals.get(row.event_id) ?? { count: 0, cents: 0 };
        totals.set(row.event_id, {
          count: current.count + 1,
          cents: current.cents + row.amount_cents,
        });
      }
      return totals;
    },
  });

  const setStatus = async (event: BukaEvent, status: BukaEvent["status"]) => {
    const { error } = await supabase.from("events").update({ status }).eq("id", event.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(status === "live" ? "You're live" : "Session ended");
    queryClient.invalidateQueries({ queryKey: ["host-events"] });
    queryClient.invalidateQueries({ queryKey: ["events"] });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl">Sign in to host</h1>
        <Button className="mt-5" asChild>
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (profile?.host_status !== "approved") {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl">Hosting not active yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {profile?.host_status === "pending"
            ? "Your host application is being reviewed."
            : "Apply to host to create and publish live events."}
        </p>
        <Button className="mt-5" asChild>
          <Link to="/host/apply">
            {profile?.host_status === "pending" ? "View application" : "Apply to host"}
          </Link>
        </Button>
      </div>
    );
  }

  const list = events ?? [];
  const totalCents = list.reduce((sum, event) => sum + (sales?.get(event.id)?.cents ?? 0), 0);
  const totalTickets = list.reduce((sum, event) => sum + (sales?.get(event.id)?.count ?? 0), 0);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Host dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage broadcasts, go live, and track earnings.
          </p>
        </div>
        <Button asChild>
          <Link to="/host/events/new">
            <Plus className="mr-2 h-4 w-4" aria-hidden /> New event
          </Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Events", value: String(list.length) },
          { label: "Tickets sold", value: String(totalTickets) },
          { label: "Gross revenue", value: formatPrice(totalCents) },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="font-display text-2xl">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Payouts are not processed yet — revenue shown is gross ticket value.
      </p>

      <h2 className="mt-10 font-display text-xl">Your events</h2>
      {isLoading ? (
        <div className="mt-4 space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-muted px-6 py-14 text-center">
          <p className="font-display text-lg">No events yet</p>
          <Button className="mt-4" asChild>
            <Link to="/host/events/new">Create your first event</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {list.map((event) => {
            const phase = eventPhase(event);
            const stat = sales?.get(event.id);
            return (
              <div
                key={event.id}
                className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center"
              >
                <CoverImage
                  path={event.cover_image_url}
                  alt={event.title}
                  className="h-20 w-full rounded-xl sm:w-28"
                />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-lg">{event.title}</h3>
                    <Badge
                      className={phase === "live" ? "gap-1.5 bg-live text-live-foreground" : ""}
                      variant={phase === "live" ? "default" : "secondary"}
                    >
                      {phase === "live" && <span className="live-dot" aria-hidden />}
                      {phase}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{formatWhen(event.scheduled_at)}</p>
                  <p className="text-xs text-muted-foreground">
                    {stat?.count ?? 0} ticket{(stat?.count ?? 0) === 1 ? "" : "s"} ·{" "}
                    {formatPrice(stat?.cents ?? 0)} · {event.view_count} views
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {event.status === "live" ? (
                    <Button size="sm" variant="destructive" onClick={() => setStatus(event, "ended")}>
                      <Square className="mr-2 h-4 w-4" aria-hidden /> End session
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => setStatus(event, "live")}
                      disabled={!event.is_published}
                    >
                      <Radio className="mr-2 h-4 w-4" aria-hidden /> Go live
                    </Button>
                  )}
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/host/events/$eventId" params={{ eventId: event.id }}>
                      Edit
                    </Link>
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
