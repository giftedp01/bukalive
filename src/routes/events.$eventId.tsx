import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Clock, MapPin, MessageCircle, Radio, Ticket } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { AccessibilityPanel } from "@/components/AccessibilityPanel";
import { AdSlot } from "@/components/AdSlot";
import { BlockButton } from "@/components/BlockButton";
import { ReportButton } from "@/components/ReportButton";
import { SaveButton } from "@/components/SaveButton";
import { SubExperienceList } from "@/components/SubExperienceList";
import { Countdown } from "@/components/Countdown";
import { CoverImage } from "@/components/CoverImage";
import { ExperienceJourney } from "@/components/ExperienceJourney";
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
import { trackEvent } from "@/lib/track";

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

  const { data: recommendations = [] } = useQuery({
    queryKey: [
      "recommendations",
      eventId,
      event?.destination_id,
      event?.category,
      event?.category_id,
    ],
    enabled: !!event,
    queryFn: async () => {
      if (!event) return [] as BukaEvent[];

      const seen = new Set<string>();
      const list: BukaEvent[] = [];

      if (event.destination_id) {
        const { data: destinationMatches, error: destinationError } = await supabase
          .from("events")
          .select("*")
          .eq("is_published", true)
          .eq("is_flagged", false)
          .eq("destination_id", event.destination_id)
          .neq("id", eventId)
          .order("scheduled_at", { ascending: false })
          .limit(6);

        if (destinationError) throw destinationError;

        for (const item of destinationMatches ?? []) {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            list.push(item as BukaEvent);
          }
        }
      }

      const categoryQuery = event.category_id ?? event.category;
      if (categoryQuery) {
        const { data: categoryMatches, error: categoryError } = await supabase
          .from("events")
          .select("*")
          .eq("is_published", true)
          .eq("is_flagged", false)
          .neq("id", eventId)
          .or(`category.eq.${categoryQuery},category_id.eq.${categoryQuery}`)
          .order("scheduled_at", { ascending: false })
          .limit(6);

        if (categoryError) throw categoryError;

        for (const item of categoryMatches ?? []) {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            list.push(item as BukaEvent);
          }
        }
      }

      return list.slice(0, 4);
    },
  });

  useEffect(() => {
    if (!event || !user) return;
    trackEvent(event.id, "view", user.id);
  }, [event, user]);

  const buy = useMutation({
    mutationFn: async () => {
      if (!user || !event) throw new Error("Please sign in first");
      trackEvent(event.id, "booking_click", user.id);
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
      if (!event) return;

      queryClient.invalidateQueries({ queryKey: ["purchase", eventId] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });

      if (event.price_cents === 0) {
        if (eventPhase(event) === "ended" && hasReplay) {
          navigate({ to: "/replay/$eventId", params: { eventId: event.id } });
          return;
        }

        if (isWatchable(event)) {
          navigate({ to: "/watch/$eventId", params: { eventId: event.id } });
          return;
        }
      }

      toast.success("Access unlocked — find it under My tickets");
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
  const hasReplay = !!(event.video_path || event.video_url || event.replay_url);

  const openComments = () => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (!owned) {
      document.getElementById("event-access")?.scrollIntoView({ behavior: "smooth" });
      toast.info("Get a ticket to join the comments");
      return;
    }
    if (phase === "ended" && hasReplay) {
      navigate({ to: "/replay/$eventId", params: { eventId: event.id } });
      return;
    }
    if (isWatchable(event)) {
      navigate({ to: "/watch/$eventId", params: { eventId: event.id } });
      return;
    }
    toast.info("Comments open when the stream starts");
  };

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

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SaveButton itemType="experience" itemId={event.id} like />
        <Button variant="outline" onClick={openComments}>
          <MessageCircle className="mr-2 h-4 w-4" aria-hidden />
          Comment
        </Button>
        {!owned && (
          <p className="text-sm text-muted-foreground">
            Get a ticket to join the comments and count yourself among the viewers.
          </p>
        )}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section>
            <h2 className="font-display text-xl">About this broadcast</h2>
            <p className="mt-2 whitespace-pre-line text-muted-foreground">
              {event.description || "The host hasn't added a description yet."}
            </p>
          </section>

          <AccessibilityPanel
            eventTitle={event.title}
            category={event.category_id ?? event.category}
          />

          <ExperienceJourney event={event} />

          {event.subExperiences && event.subExperiences.length > 0 && (
            <SubExperienceList subExperiences={event.subExperiences} eventId={event.id} />
          )}

          <section>
            <h2 className="font-display text-xl">Your host</h2>
            <Card className="mt-2">
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sunset text-primary-foreground">
                    <Radio className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <p className="font-medium">{host?.full_name || "BukaLive host"}</p>
                    <p className="text-sm text-muted-foreground">
                      {host?.host_bio || host?.bio || "Verified BukaLive host."}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ReportButton itemType="experience" itemId={event.id} label="Report event" />
                  <BlockButton blockedId={event.host_id} label="Block host" />
                </div>
              </CardContent>
            </Card>
          </section>

          <section>
            <h2 className="font-display text-xl">More like this</h2>
            {recommendations.length === 0 ? (
              <p className="mt-2 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                No similar experiences are live right now. Check back soon for more from this
                destination or category.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {recommendations.map((recommendation) => (
                  <Link
                    key={recommendation.id}
                    to="/events/$eventId"
                    params={{ eventId: recommendation.id }}
                    className="block rounded-2xl border bg-card p-3 transition-colors hover:border-primary/50"
                  >
                    <div className="flex items-center gap-3">
                      <CoverImage
                        path={recommendation.cover_image_url}
                        alt={recommendation.title}
                        className="h-16 w-20 rounded-xl"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{recommendation.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {recommendation.location || "Online"}
                          {" · "}
                          {formatWhen(recommendation.scheduled_at)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <AdSlot placement="event-detail" />
        </div>

        <aside className="space-y-4">
          <Card id="event-access" className="scroll-mt-24 shadow-soft">
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
                  {phase === "ended" &&
                  (event.video_path || event.video_url || event.replay_url) ? (
                    <Button className="w-full" asChild>
                      <Link to="/replay/$eventId" params={{ eventId: event.id }}>
                        <Radio className="mr-2 h-4 w-4" aria-hidden /> Watch replay
                      </Link>
                    </Button>
                  ) : (
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
                  )}
                  <p className="text-center text-xs text-muted-foreground">
                    {phase === "ended" && (event.video_path || event.video_url || event.replay_url)
                      ? "This event has a replay available."
                      : isWatchable(event)
                        ? "The stream opens on this page."
                        : "The watch page opens at the scheduled start time."}
                  </p>
                </div>
              ) : phase === "ended" && !hasReplay ? (
                <Button className="w-full" disabled>
                  This event has ended
                </Button>
              ) : (
                <Button className="w-full" onClick={() => buy.mutate()} disabled={buy.isPending}>
                  {buy.isPending
                    ? "Processing…"
                    : event.price_cents === 0
                      ? phase === "ended"
                        ? "Get free replay ticket"
                        : "Get free ticket"
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
