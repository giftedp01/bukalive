import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  CalendarClock,
  Clapperboard,
  Heart,
  MapPin,
  MessageCircle,
  Send,
  Ticket,
} from "lucide-react";

import { CoverImage } from "@/components/CoverImage";
import { EventVideo } from "@/components/EventVideo";
import { SaveButton } from "@/components/SaveButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { categoryLabel, eventPhase, formatWhen, type BukaEvent } from "@/lib/buka";
import { toast } from "sonner";

type ReplayComment = {
  id: string;
  user_id: string;
  message: string;
  sent_at: string;
};

export const Route = createFileRoute("/replay/$eventId")({
  head: () => ({
    meta: [
      { title: "Replay — BukaLive" },
      {
        name: "description",
        content: "Watch the recorded replay of this BukaLive experience.",
      },
      { property: "og:title", content: "Replay — BukaLive" },
      { property: "og:description", content: "Watch the recorded replay of this BukaLive event." },
    ],
  }),
  component: ReplayPage,
});

function ReplayPage() {
  const { eventId } = Route.useParams();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();
      if (error) throw error;
      return (data as BukaEvent | null) ?? null;
    },
  });

  const { data: purchase } = useQuery({
    queryKey: ["purchase", eventId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select("id")
        .eq("event_id", eventId)
        .eq("viewer_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: comments = [], isError: commentsError } = useQuery({
    queryKey: ["replay-comments", eventId],
    enabled: !!event && (!!purchase || user?.id === event.host_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, user_id, message, sent_at")
        .eq("event_id", eventId)
        .order("sent_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as ReplayComment[];
    },
  });

  const postComment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const message = comment.trim();
    if (!user || !message) return;

    setPosting(true);
    const { error } = await supabase
      .from("chat_messages")
      .insert({ event_id: eventId, user_id: user.id, message });
    setPosting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setComment("");
    queryClient.invalidateQueries({ queryKey: ["replay-comments", eventId] });
    toast.success("Comment posted");
  };

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
        <h1 className="font-display text-2xl">Replay unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">This recording is no longer available.</p>
        <Button className="mt-6" asChild>
          <Link to="/browse">Browse events</Link>
        </Button>
      </div>
    );
  }

  const phase = eventPhase(event);
  const hasReplay = !!(event.video_path || event.video_url || event.replay_url);
  const hasAccess = !!purchase || user?.id === event.host_id;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="gap-1.5">
          <Clapperboard className="h-3.5 w-3.5" aria-hidden /> Replay
        </Badge>
        <Badge variant="outline">{categoryLabel(event.category_id ?? event.category)}</Badge>
      </div>

      <div className="relative overflow-hidden rounded-3xl">
        <CoverImage
          path={event.cover_image_url}
          alt={event.title}
          className="h-64 w-full sm:h-80"
        />
        <div className="absolute inset-0 bg-scrim" aria-hidden />
        <div className="absolute bottom-5 left-5 right-5 text-primary-foreground">
          <h1 className="font-display text-3xl sm:text-4xl">{event.title}</h1>
          <div className="mt-2 flex flex-wrap gap-4 text-sm">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" aria-hidden /> {event.location || "Online"}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-4 w-4" aria-hidden /> {formatWhen(event.scheduled_at)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SaveButton itemType="experience" itemId={event.id} like />
        {!hasAccess && (
          <Button variant="outline" asChild>
            <Link to="/events/$eventId" params={{ eventId: event.id }}>
              <Ticket className="mr-2 h-4 w-4" aria-hidden />
              {event.price_cents === 0 ? "Get free ticket" : "Get ticket"}
            </Link>
          </Button>
        )}
        <Button variant="outline" asChild>
          {hasAccess ? (
            <a href="#replay-comments">
              <MessageCircle className="mr-2 h-4 w-4" aria-hidden /> Comment
            </a>
          ) : (
            <Link to="/events/$eventId" params={{ eventId: event.id }}>
              <MessageCircle className="mr-2 h-4 w-4" aria-hidden /> Comment
            </Link>
          )}
        </Button>
      </div>

      {!hasReplay ? (
        <div className="mt-8 rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">
          This replay isn’t available yet.
        </div>
      ) : !hasAccess ? (
        <div className="mt-8 rounded-3xl border bg-muted p-8 text-center">
          <Heart className="mx-auto h-8 w-8 text-primary" aria-hidden />
          <h2 className="mt-3 font-display text-xl">Get a ticket to watch and comment</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Claiming a free ticket or purchasing access helps the host count their audience.
          </p>
          <Button className="mt-4" asChild>
            <Link to="/events/$eventId" params={{ eventId: event.id }}>
              View ticket options
            </Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 rounded-3xl border bg-card p-3 sm:p-4">
          <EventVideo
            {...(event.video_path !== undefined ? { videoPath: event.video_path } : {})}
            {...((event.video_url ?? event.replay_url) !== undefined
              ? { videoUrl: event.video_url ?? event.replay_url }
              : {})}
            title={event.title}
          />
        </div>
      )}

      {hasAccess && (
        <section id="replay-comments" className="mt-8 max-w-2xl scroll-mt-24">
          <h2 className="font-display text-xl">Comments</h2>
          {commentsError ? (
            <p className="mt-3 rounded-xl border border-destructive/30 p-4 text-sm text-destructive">
              Could not load replay comments.
            </p>
          ) : comments.length === 0 ? (
            <p className="mt-3 rounded-xl bg-muted p-4 text-sm text-muted-foreground">
              Be the first to comment on this replay.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {comments.map((item) => (
                <article key={item.id} className="rounded-xl border bg-card p-3">
                  <p className="text-xs text-muted-foreground">
                    {item.user_id === user?.id
                      ? profile?.full_name || "You"
                      : `Viewer ${item.user_id.slice(0, 8)}`}
                    {" · "}
                    {new Date(item.sent_at).toLocaleString()}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm">{item.message}</p>
                </article>
              ))}
            </div>
          )}
          <form className="mt-3 flex gap-2" onSubmit={postComment}>
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
              placeholder="Write a comment…"
              aria-label="Replay comment"
              required
            />
            <Button type="submit" size="icon" disabled={posting || !comment.trim()}>
              <Send className="h-4 w-4" aria-hidden />
              <span className="sr-only">Post comment</span>
            </Button>
          </form>
        </section>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/events/$eventId" params={{ eventId: event.id }}>
            Event details
          </Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link to="/browse">Explore more</Link>
        </Button>
      </div>

      <div className="mt-8 max-w-2xl rounded-2xl bg-sand p-5 text-sm text-sand-foreground">
        <p className="font-medium">Replay status</p>
        <p className="mt-1">
          {phase === "ended"
            ? "This experience has finished and is available as a replay."
            : "This event is scheduled for replay later."}
        </p>
      </div>
    </div>
  );
}
