import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Lock, Radio, Send } from "lucide-react";
import { toast } from "sonner";

import { AdSlot } from "@/components/AdSlot";
import { Countdown } from "@/components/Countdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatWhen, isWatchable, type BukaEvent } from "@/lib/buka";

export const Route = createFileRoute("/watch/$eventId")({
  head: () => ({
    meta: [
      { title: "Watch live — BukaLive" },
      {
        name: "description",
        content: "Your BukaLive watch room: the live stream plus chat with other viewers.",
      },
      { property: "og:title", content: "Watch live — BukaLive" },
      { property: "og:description", content: "The live stream and viewer chat for your event." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WatchPage,
});

type ChatMessage = {
  id: string;
  event_id: string;
  user_id: string;
  message: string;
  sent_at: string;
};

function Gate({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-20 text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-sand">
        <Lock className="h-5 w-5" aria-hidden />
      </div>
      <h1 className="font-display text-2xl">{title}</h1>
      <div className="mt-3 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

function ChatPanel({ eventId }: { eventId: string }) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const { data: messages } = useQuery({
    queryKey: ["chat", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("event_id", eventId)
        .order("sent_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as ChatMessage[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`chat-${eventId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `event_id=eq.${eventId}` },
        () => queryClient.invalidateQueries({ queryKey: ["chat", eventId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !draft.trim()) return;
    const text = draft.trim();
    setDraft("");
    const { error } = await supabase
      .from("chat_messages")
      .insert({ event_id: eventId, user_id: user.id, message: text });
    if (error) {
      toast.error("Message not sent");
      setDraft(text);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["chat", eventId] });
  };

  return (
    <div className="flex h-[32rem] flex-col rounded-2xl border bg-card lg:h-full">
      <div className="border-b px-4 py-3">
        <p className="font-display text-base">Live chat</p>
        <p className="text-xs text-muted-foreground">Say hello to other viewers</p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {(messages ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet — start the conversation.</p>
        ) : (
          (messages ?? []).map((message) => (
            <div key={message.id} className="text-sm">
              <span className="font-medium">
                {message.user_id === user?.id ? profile?.full_name || "You" : "Viewer"}
              </span>
              <span className="ml-2 text-xs text-muted-foreground">
                {new Date(message.sent_at).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <p className="text-muted-foreground">{message.message}</p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <form className="flex gap-2 border-t p-3" onSubmit={send}>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a message…"
          aria-label="Chat message"
        />
        <Button type="submit" size="icon" aria-label="Send message">
          <Send className="h-4 w-4" aria-hidden />
        </Button>
      </form>
    </div>
  );
}

function WatchPage() {
  const { eventId } = Route.useParams();
  const { user, loading } = useAuth();

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
      if (error) throw error;
      return (data as BukaEvent | null) ?? null;
    },
  });

  const { data: purchase, isLoading: purchaseLoading } = useQuery({
    queryKey: ["purchase", eventId, user?.id],
    enabled: !!user,
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

  if (loading || isLoading || (user && purchaseLoading)) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <Skeleton className="aspect-video w-full rounded-3xl" />
      </div>
    );
  }

  if (!event) {
    return (
      <Gate title="Event unavailable">
        <p>This broadcast is no longer available.</p>
        <Button className="mt-5" asChild>
          <Link to="/browse">Browse events</Link>
        </Button>
      </Gate>
    );
  }

  const isHostOfEvent = user?.id === event.host_id;

  if (!user) {
    return (
      <Gate title="Sign in to watch">
        <p>You need an account and event access to enter the watch room.</p>
        <Button className="mt-5" asChild>
          <Link to="/auth">Sign in</Link>
        </Button>
      </Gate>
    );
  }

  if (!purchase && !isHostOfEvent) {
    return (
      <Gate title="Access locked">
        <p>Buy access to this event to unlock the stream.</p>
        <Button className="mt-5" asChild>
          <Link to="/events/$eventId" params={{ eventId: event.id }}>
            Go to event page
          </Link>
        </Button>
      </Gate>
    );
  }

  if (!isWatchable(event) && !isHostOfEvent) {
    return (
      <Gate title="Not started yet">
        <p>You're in. The stream opens at {formatWhen(event.scheduled_at)}.</p>
        <div className="mt-5 flex justify-center">
          <Countdown target={event.scheduled_at} />
        </div>
      </Gate>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">{event.title}</h1>
          <p className="text-sm text-muted-foreground">{event.location}</p>
        </div>
        {event.status === "live" ? (
          <Badge className="gap-1.5 bg-live text-live-foreground">
            <span className="live-dot" aria-hidden /> LIVE
          </Badge>
        ) : (
          <Badge variant="secondary">Stream standing by</Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {/* ===== LIVEKIT VIDEO PLAYER CONTAINER =====
              Mount the LiveKit room / video track renderer inside this element.
              Everything around it (access gating, chat, layout) is already wired.
              ========================================== */}
          <div
            id="livekit-player-container"
            data-video-player="livekit"
            className="grid aspect-video w-full place-items-center rounded-3xl bg-sunset text-center text-primary-foreground"
          >
            <div className="px-6">
              <Radio className="mx-auto h-10 w-10 opacity-80" aria-hidden />
              <p className="mt-3 font-display text-xl">Video player slot</p>
              <p className="mt-1 text-sm text-primary-foreground/85">
                The LiveKit stream embed mounts here.
              </p>
            </div>
          </div>

          <p className="whitespace-pre-line text-sm text-muted-foreground">{event.description}</p>
          <AdSlot placement="watch-sidebar" />
        </div>

        <ChatPanel eventId={event.id} />
      </div>
    </div>
  );
}
