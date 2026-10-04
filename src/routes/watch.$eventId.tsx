import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Lock, Send } from "lucide-react";

const LivePlayer = lazy(() => import("@/components/LivePlayer"));
import { toast } from "sonner";

import { AccessibilityPanel } from "@/components/AccessibilityPanel";
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
  validateSearch: (search: Record<string, unknown>) => {
    const subExperienceId = search["subExperienceId"];
    return typeof subExperienceId === "string" ? { subExperienceId } : {};
  },
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
  is_question: boolean;
  answer: string | null;
  answered_at: string | null;
  answered_by: string | null;
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

function ChatPanel({ eventId, isHost }: { eventId: string; isHost: boolean }) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
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

  const { data: blockedUserIds = [] } = useQuery({
    queryKey: ["blocked-user-ids", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [] as string[];
      const { data, error } = await supabase
        .from("blocks")
        .select("blocked_id")
        .eq("blocker_id", user.id);
      if (error) throw error;
      return (data ?? []).map((row) => row.blocked_id as string);
    },
  });

  const visibleMessages = [...(messages ?? [])]
    .filter((message) => !blockedUserIds.includes(message.user_id))
    .sort((a, b) => {
      const questionPriority = Number(b.is_question) - Number(a.is_question);
      if (questionPriority !== 0) return questionPriority;
      if (!!a.answer !== !!b.answer) return Number(!!b.answer) - Number(!!a.answer);
      return new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime();
    });

  useEffect(() => {
    const channel = supabase
      .channel(`chat-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `event_id=eq.${eventId}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ["chat", eventId] }),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `event_id=eq.${eventId}`,
        },
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

  const updateMessage = async (messageId: string, updates: Partial<ChatMessage>) => {
    const { error } = await supabase.from("chat_messages").update(updates).eq("id", messageId);
    if (error) {
      toast.error("Could not update the question");
      return false;
    }

    queryClient.invalidateQueries({ queryKey: ["chat", eventId] });
    return true;
  };

  const toggleQuestion = async (message: ChatMessage) => {
    if (!user) return;
    const nextValue = !message.is_question;
    const ok = await updateMessage(message.id, {
      is_question: nextValue,
      answer: null,
      answered_at: null,
      answered_by: null,
    });

    if (ok && nextValue) {
      toast.success("Question flagged for the host");
    }
  };

  const answerQuestion = async (message: ChatMessage) => {
    if (!user || !isHost) return;
    const answer = (answerDrafts[message.id] ?? message.answer ?? "").trim();
    if (!answer) {
      toast.error("Write an answer before sending it");
      return;
    }

    const ok = await updateMessage(message.id, {
      is_question: true,
      answer,
      answered_at: new Date().toISOString(),
      answered_by: user.id,
    });

    if (ok) {
      setAnswerDrafts((current) => ({ ...current, [message.id]: "" }));
      toast.success("Answer sent");
    }
  };

  const clearQuestion = async (message: ChatMessage) => {
    if (!user) return;
    const ok = await updateMessage(message.id, {
      is_question: false,
      answer: null,
      answered_at: null,
      answered_by: null,
    });

    if (ok) {
      toast.success("Question resolved");
    }
  };

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
        {visibleMessages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet — start the conversation.</p>
        ) : (
          visibleMessages.map((message) => (
            <div key={message.id} className="rounded-xl border p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-medium">
                    {message.user_id === user?.id ? profile?.full_name || "You" : "Viewer"}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {new Date(message.sent_at).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {!isHost && user && (
                  <button
                    type="button"
                    onClick={() => toggleQuestion(message)}
                    className="text-[11px] font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {message.is_question ? "Unflag" : "Question"}
                  </button>
                )}
              </div>

              <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{message.message}</p>

              {message.is_question && (
                <div className="mt-2 rounded-lg bg-sand px-2.5 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sand-foreground">Question flagged</span>
                    {isHost && (
                      <button
                        type="button"
                        onClick={() => clearQuestion(message)}
                        className="text-[11px] text-primary underline-offset-2 hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {message.answer ? (
                    <div className="mt-2 rounded-md bg-background/70 p-2 text-left text-muted-foreground">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-foreground">Host reply</p>
                        {message.answered_at && (
                          <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-primary">
                            Answered
                          </span>
                        )}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap">{message.answer}</p>
                    </div>
                  ) : isHost ? (
                    <div className="mt-2 space-y-2">
                      <textarea
                        value={answerDrafts[message.id] ?? ""}
                        onChange={(event) =>
                          setAnswerDrafts((current) => ({
                            ...current,
                            [message.id]: event.target.value,
                          }))
                        }
                        rows={3}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 placeholder:text-muted-foreground"
                        placeholder="Reply to the question…"
                      />
                      <Button type="button" size="sm" onClick={() => answerQuestion(message)}>
                        Mark as answered
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-2 text-muted-foreground">The host is preparing a reply.</p>
                  )}
                </div>
              )}
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
  const { subExperienceId } = Route.useSearch();
  const { user, loading } = useAuth();

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
          <AccessibilityPanel
            eventTitle={event.title}
            category={event.category_id ?? event.category}
          />

          <ClientOnly fallback={<Skeleton className="aspect-video w-full rounded-3xl" />}>
            <Suspense fallback={<Skeleton className="aspect-video w-full rounded-3xl" />}>
              <LivePlayer eventId={event.id} subExperienceId={subExperienceId} />
            </Suspense>
          </ClientOnly>

          <p className="whitespace-pre-line text-sm text-muted-foreground">{event.description}</p>
          <AdSlot placement="watch-sidebar" />
        </div>

        <ChatPanel eventId={event.id} isHost={isHostOfEvent} />
      </div>
    </div>
  );
}
