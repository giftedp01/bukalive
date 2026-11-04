import { useQuery, useServerFn } from "@tanstack/react-start";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, Lightbulb, MapPin, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { askBuka, type BukaAiReply } from "@/lib/buka-ai.functions";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CoverImage } from "@/components/CoverImage";
import { SampleBadge } from "@/components/TrustBadges";
import { supabase } from "@/integrations/supabase/client";
import { TOURISM_CATEGORIES } from "@/data/categories";
import { eventPhase, formatEventWhen, formatPrice, formatWhen, type BukaEvent } from "@/lib/buka";

export const Route = createFileRoute("/ai")({
  head: () => ({
    meta: [
      { title: "Ask Buka AI — BukaLive" },
      {
        name: "description",
        content:
          "Ask Buka AI for live travel ideas, city moods, and event picks from the BukaLive schedule.",
      },
      { property: "og:title", content: "Ask Buka AI — BukaLive" },
      {
        property: "og:description",
        content: "Explore the next unforgettable moment in the world.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AiPage,
});

type AiEvent = BukaEvent & { hostName: string };

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "around",
  "at",
  "can",
  "for",
  "give",
  "i",
  "im",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "please",
  "show",
  "some",
  "the",
  "to",
  "want",
  "with",
  "looking",
  "find",
  "get",
  "near",
  "that",
  "this",
  "from",
  "we",
  "us",
]);

const INTENTS = [
  {
    terms: ["concert", "music", "jazz", "band", "gig", "performance", "song", "festival"],
    categories: ["events-festivals"],
    keywords: ["music", "concert", "jazz", "band", "gig", "performance", "festival"],
    label: "music and events",
  },
  {
    terms: ["food", "dinner", "eat", "restaurant", "meal", "cuisine", "wine", "tasting"],
    categories: ["food-wine"],
    keywords: ["food", "dinner", "eat", "restaurant", "meal", "cuisine", "wine", "tasting"],
    label: "food and wine",
  },
  {
    terms: ["nature", "calm", "sunrise", "hike", "outdoor", "wildlife", "safari", "adventure"],
    categories: ["nature-adventure", "wildlife-safari"],
    keywords: ["nature", "calm", "sunrise", "hike", "outdoor", "wildlife", "safari", "trail"],
    label: "nature and wildlife",
  },
  {
    terms: ["culture", "heritage", "local", "history", "art", "museum"],
    categories: ["culture-heritage"],
    keywords: ["culture", "heritage", "local", "history", "art", "museum"],
    label: "culture and heritage",
  },
  {
    terms: ["beach", "whale", "ocean", "coast", "marine", "sea", "surf"],
    categories: ["coastal-marine"],
    keywords: ["beach", "whale", "ocean", "coast", "marine", "sea", "surf"],
    label: "coastal experiences",
  },
] as const;

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/i['’]m/g, " ")
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

function popularity(event: AiEvent) {
  return (event.viewer_count ?? 0) + event.view_count;
}

function scoreEvent(event: AiEvent, tokens: string[], intents: (typeof INTENTS)[number][]) {
  const category = `${event.category_id ?? ""} ${event.category ?? ""} ${
    TOURISM_CATEGORIES.find((item) => item.id === event.category_id)?.label ?? ""
  }`.toLowerCase();
  const title = `${event.title} ${event.subcategory ?? ""}`.toLowerCase();
  const description = (event.description ?? "").toLowerCase();
  const location = (event.location ?? "").toLowerCase();
  const fields = [
    { value: title, weight: 5 },
    { value: description, weight: 2 },
    { value: location, weight: 4 },
    { value: (event.hostName ?? "").toLowerCase(), weight: 3 },
    { value: `${category} ${event.destination_id ?? ""}`.toLowerCase(), weight: 8 },
  ];

  let score = 0;
  for (const token of tokens) {
    for (const field of fields) {
      if (field.value.includes(token)) score += field.weight;
    }
  }
  for (const intent of intents) {
    if (intent.categories.some((id) => category.includes(id))) score += 12;
    for (const keyword of intent.keywords) {
      if (title.includes(keyword)) score += 4;
      if (description.includes(keyword)) score += 2;
      if (location.includes(keyword)) score += 3;
    }
  }
  if (
    tokens.some((token) => ["friday", "night", "evening"].includes(token)) &&
    ["live", "upcoming"].includes(eventPhase(event))
  ) {
    score += 8;
  }
  return score;
}

function buildReply(prompt: string, events: AiEvent[]) {
  const tokens = tokenize(prompt);
  const intents = INTENTS.filter((intent) => intent.terms.some((term) => tokens.includes(term)));
  const ranked = events
    .map((event) => ({
      event,
      score: scoreEvent(event, tokens, intents),
      popularity: popularity(event),
    }))
    .sort((a, b) => b.score - a.score || b.popularity - a.popularity);
  const exact = ranked.some((item) => item.score > 0);
  const fallbackPool = ranked.filter(({ event }) =>
    ["live", "upcoming"].includes(eventPhase(event)),
  );
  const suggestions = (exact ? ranked : fallbackPool.length > 0 ? fallbackPool : ranked)
    .slice(0, 6)
    .map(({ event, score }) => ({ event, score }));
  const first = suggestions[0]?.event;
  const interest = intents.map((intent) => intent.label).join(", ");
  const intro = first
    ? exact
      ? `I found ${suggestions.length} ${suggestions.length === 1 ? "experience" : "experiences"}${
          interest ? ` around ${interest}` : ""
        }, starting with ${first.title}.`
      : `I found ${suggestions.length} popular ${
          suggestions.length === 1 ? "experience" : "experiences"
        }, starting with ${first.title}.`
    : "There are no published experiences to recommend yet.";
  const tips = suggestions
    .slice(0, 3)
    .map(({ event }) => {
      const phase = eventPhase(event);
      const status =
        phase === "live"
          ? "Live now"
          : phase === "upcoming"
            ? `Starting ${formatWhen(event.scheduled_at)}`
            : "Ended";
      return `${event.title} · ${event.location || "Online"} · ${status}`;
    })
    .filter((tip, index, all) => all.indexOf(tip) === index);

  return { intro, suggestions, tips, fallback: !exact && suggestions.length > 0 };
}

function AiPage() {
  const initialPrompt = "I want a warm, social night with music and good food";
  const [prompt, setPrompt] = useState(initialPrompt);
  const [submittedPrompt, setSubmittedPrompt] = useState(initialPrompt);
  const [aiReply, setAiReply] = useState<BukaAiReply | null>(null);
  const [pending, setPending] = useState(false);
  const askBukaFn = useServerFn(askBuka);

  const runAsk = async (value: string) => {
    setPrompt(value);
    setSubmittedPrompt(value);
    setAiReply(null);
    setPending(true);
    try {
      const result = await askBukaFn({ data: { prompt: value } });
      setAiReply(result);
    } catch {
      setAiReply({
        available: false,
        error: "AI_UNAVAILABLE",
        intro: "",
        eventIds: [],
        tips: [],
      });
    } finally {
      setPending(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runAsk(prompt.trim() || initialPrompt);
  };

  const {
    data: events = [],
    isLoading,
    isError,
  } = useQuery<AiEvent[]>({
    queryKey: ["ai-suggestions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("is_published", true)
        .eq("is_flagged", false)
        .order("scheduled_at", { ascending: true })
        .limit(500);
      if (error) throw error;
      const rows = (data ?? []) as BukaEvent[];
      if (rows.length === 0) return [];

      const hostIds = [...new Set(rows.map((event) => event.host_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", hostIds);
      if (profilesError) throw profilesError;

      const hostNames = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));
      return rows.map((event) => ({
        ...event,
        hostName: hostNames.get(event.host_id) ?? "",
      }));
    },
  });

  const local = useMemo(
    () => buildReply(submittedPrompt || "live experiences", events),
    [events, submittedPrompt],
  );

  const aiEvents = useMemo(() => {
    if (!aiReply?.available || aiReply.eventIds.length === 0) return null;
    const byId = new Map(events.map((event) => [event.id, event]));
    return aiReply.eventIds
      .map((id) => byId.get(id))
      .filter((event): event is AiEvent => Boolean(event))
      .slice(0, 6);
  }, [aiReply, events]);

  const suggestions = (aiEvents ?? local.suggestions.map(({ event }) => event)) as AiEvent[];
  const intro = aiReply?.available && aiReply.intro ? aiReply.intro : local.intro;
  const tips = aiReply?.available && aiReply.tips.length > 0 ? aiReply.tips : local.tips;
  const aiOffline = Boolean(aiReply && !aiReply.available);

  const samplePrompts = [
    "I want a warm, social night with music and good food",
    "Give me a calm nature escape with a sunrise feel",
    "Show me culture-heavy experiences with deep local energy",
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sunset text-primary-foreground">
          <Bot className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Travel concierge
          </p>
          <h1 className="font-display text-3xl">Ask Buka AI</h1>
        </div>
      </div>

      <form className="rounded-3xl border bg-card p-4 shadow-soft sm:p-6" onSubmit={handleSubmit}>
        <label className="mb-3 block text-sm font-medium">
          Tell Buka AI what kind of trip you want
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Example: I want a city night out with rooftop views and live music"
            aria-label="Ask Buka AI"
          />
          <Button type="submit">Get ideas</Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {samplePrompts.map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => void runAsk(sample)}
              className="rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary hover:text-foreground"
            >
              {sample}
            </button>
          ))}
        </div>
      </form>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Sparkles className="h-4 w-4" aria-hidden />
            Best matches
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
          ) : isError ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  Couldn’t load experiences. Please try again.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {(aiOffline || local.fallback) && (
                <p className="mb-3 text-sm text-muted-foreground">
                  {aiOffline
                    ? "Buka AI is offline right now — here are the closest experiences."
                    : "No exact matches, here are the closest experiences."}
                </p>
              )}
              {suggestions.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">
                      No published experiences are available right now.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                suggestions.map((event) => (
                  <Card key={event.id} className="mb-3 overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex flex-col gap-4 p-4 sm:flex-row">
                        <div className="h-28 w-full shrink-0 overflow-hidden rounded-2xl sm:w-32">
                          <CoverImage
                            path={event.cover_image_url}
                            alt={event.title}
                            className="h-full w-full"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-display text-xl">{event.title}</h2>
                            {eventPhase(event) === "live" && (
                              <Badge className="bg-live text-live-foreground">Live</Badge>
                            )}
                            {event.is_sample && <SampleBadge />}
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" aria-hidden />
                              {event.location || "Online"}
                            </span>
                            <span>{formatEventWhen(event)}</span>
                          </div>

                          <p className="mt-2 text-sm text-muted-foreground">{event.description}</p>

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-medium text-primary">
                              {formatPrice(event.price_cents, event.currency)}
                            </span>
                            <Button asChild size="sm">
                              <Link to="/events/$eventId" params={{ eventId: event.id }}>
                                View experience <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </>
          )}
        </div>

        <aside className="rounded-3xl border bg-muted/30 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Lightbulb className="h-4 w-4" aria-hidden />
            Buka AI summary
          </div>
          <h2 className="mt-3 font-display text-2xl text-primary">
            {pending
              ? "Buka is thinking…"
              : isLoading
                ? "Finding experiences…"
                : isError
                  ? "Couldn’t load experiences. Please try again."
                  : intro}
          </h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            {!pending && !isLoading && !isError && tips.map((tip) => <li key={tip}>• {tip}</li>)}
          </ul>
        </aside>
      </div>
    </div>
  );
}
