import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Clock, MapPin, Radio, Ticket } from "lucide-react";
import { toast } from "sonner";

import { AdSlot } from "@/components/AdSlot";
import { SubExperienceList } from "@/components/SubExperienceList";
import { Countdown } from "@/components/Countdown";
import { CoverImage } from "@/components/CoverImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  categoryLabel,
  eventPhase,
  formatPrice,
  formatWhen,
  isWatchable,
  type BukaEvent,
} from "@/lib/buka";

export const Route = createFileRoute("/events/$eventId")({
  head: () => ({
    meta: [
      { title: "Live event on BukaLive" },
      {
        name: "description",
        content:
          "See the schedule, host and price for this BukaLive broadcast, then unlock access to watch it live.",
      },
      { property: "og:title", content: "Live event on BukaLive" },
      {
        property: "og:description",
        content: "Unlock access and watch this moment live on BukaLive.",
      },
    ],
  }),
  component: EventDetail,
});

function EventDetail() {
  const { eventId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const raw = (data as { sub_experiences?: unknown }).sub_experiences;
      return {
        ...(data as unknown as BukaEvent),
        subExperiences: Array.isArray(raw) ? (raw as BukaEvent["subExperiences"]) : [],
      } as BukaEvent;
    },
  });

  const { data: host } = useQuery({
    queryKey: ["host-profile", event?.host_id],
    enabled: !!event?.host_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, bio, host_bio, avatar_url")
        .eq("id", event!.host_id)
        .maybeSingle();
      return data;
    },
  });

  const { data: purchase } = useQuery({
    queryKey: ["purchase", eventId, user?.id],
    enabled: !!user && !!event,
    queryFn: async () => {
      const { data } = await supabase
        .from("purchases")
        .select("id")
        .eq("event_id", eventId)
        .eq("viewer_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const buy = useMutation({
    mutationFn: async () => {
      if (!user || !event) throw new Error("Please sign in first");
      // MOCK PAYMENT: a real provider (Stripe/Paddle) charges here and the
      // purchase row is written after a confirmed payment webhook.
      const { error } = await supabase.from("purchases").insert({
        event_id: event.id,
        viewer_id: user.id,
        amount_cents: event.price_cents,
        currency: event.currency,
        provider: "mock",
        provider_ref: `mock_${crypto.randomUUID()}`,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Access unlocked — find it under My tickets");
      queryClient.invalidateQueries({ queryKey: ["purchase", eventId] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Payment failed"),
  });

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <Skeleton className="h-80 w-full rounded-3xl" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl">Event unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This broadcast may have been unpublished or removed.
        </p>
        <Button className="mt-6" asChild>
          <Link to="/browse">Browse other events</Link>
        </Button>
      </div>
    );
  }

  const phase = eventPhase(event);
  const owned = !!purchase;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="relative overflow-hidden rounded-3xl">
        <CoverImage
          path={event.cover_image_url}
          alt={event.title}
          className="h-72 w-full sm:h-96"
        />
        <div className="absolute inset-0 bg-scrim" aria-hidden />
        <div className="absolute bottom-5 left-5 right-5 text-primary-foreground">
          <div className="mb-3 flex flex-wrap gap-2">
            {phase === "live" ? (
              <Badge className="gap-1.5 bg-live text-live-foreground">
                <span className="live-dot" aria-hidden /> LIVE NOW
              </Badge>
            ) : (
              <Badge variant="secondary">
                {categoryLabel(event.category_id ?? event.category)}
              </Badge>
            )}
            {phase === "ended" && <Badge variant="secondary">Ended</Badge>}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl">{event.title}</h1>
          <div className="mt-2 flex flex-wrap gap-4 text-sm">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" aria-hidden /> {event.location || "Online"}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-4 w-4" aria-hidden /> {formatWhen(event.scheduled_at)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" aria-hidden /> {event.duration_minutes} min
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section>
            <h2 className="font-display text-xl">About this broadcast</h2>
            <p className="mt-2 whitespace-pre-line text-muted-foreground">
              {event.description || "The host hasn't added a description yet."}
            </p>
          </section>

          {event.subExperiences && event.subExperiences.length > 0 && (
            <SubExperienceList subExperiences={event.subExperiences} eventId={event.id} />
          )}

          <section>
            <h2 className="font-display text-xl">Your host</h2>
            <Card className="mt-2">
              <CardContent className="flex items-start gap-4 pt-6">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sunset text-primary-foreground">
                  <Radio className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="font-medium">{host?.full_name || "BukaLive host"}</p>
                  <p className="text-sm text-muted-foreground">
                    {host?.host_bio || host?.bio || "Verified BukaLive host."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          <AdSlot placement="event-detail" />
        </div>

        <aside className="space-y-4">
          <Card className="shadow-soft">
            <CardContent className="space-y-4 pt-6">
              <div>
                <p className="text-sm text-muted-foreground">Access price</p>
                <p className="font-display text-3xl">
                  {formatPrice(event.price_cents, event.currency)}
                </p>
              </div>

              {phase === "upcoming" && (
                <div>
                  <p className="mb-2 text-sm text-muted-foreground">Starts in</p>
                  <Countdown target={event.scheduled_at} />
                </div>
              )}

              {!user ? (
                <Button className="w-full" onClick={() => navigate({ to: "/auth" })}>
                  Sign in to buy access
                </Button>
              ) : owned ? (
                <div className="space-y-2">
                  <Button
                    className="w-full"
                    disabled={!isWatchable(event)}
                    asChild={isWatchable(event)}
                  >
                    {isWatchable(event) ? (
                      <Link to="/watch/$eventId" params={{ eventId: event.id }}>
                        <Radio className="mr-2 h-4 w-4" aria-hidden /> Go to watch page
                      </Link>
                    ) : (
                      <span>
                        <Ticket className="mr-2 inline h-4 w-4" aria-hidden /> Access unlocked
                      </span>
                    )}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    {isWatchable(event)
                      ? "The stream opens on this page."
                      : "The watch page opens at the scheduled start time."}
                  </p>
                </div>
              ) : phase === "ended" ? (
                <Button className="w-full" disabled>
                  This event has ended
                </Button>
              ) : (
                <Button className="w-full" onClick={() => buy.mutate()} disabled={buy.isPending}>
                  {buy.isPending
                    ? "Processing…"
                    : event.price_cents === 0
                      ? "Get free access"
                      : `Pay ${formatPrice(event.price_cents, event.currency)}`}
                </Button>
              )}

              <p className="text-center text-xs text-muted-foreground">
                Demo checkout — no card is charged yet.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
