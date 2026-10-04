import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, Lightbulb, MapPin, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, formatWhen, type BukaEvent } from "@/lib/buka";

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

type AiSuggestion = {
  event: BukaEvent;
  score: number;
};

function scoreEvent(event: BukaEvent, prompt: string) {
  const haystack = [
    event.title,
    event.description ?? "",
    event.location ?? "",
    event.category ?? "",
    event.destination_id ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const tokens = prompt
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter((token) => token.length > 2);

  if (tokens.length === 0) return 0;

  let score = 0;
  for (const token of tokens) {
    if (haystack.includes(token)) score += 2;
    if (token === "live" && event.status === "live") score += 3;
    if (token === "night" && /night|sunset|dj|party|music|late/.test(haystack)) score += 2;
    if (token === "food" && /food|dinner|tasting|eat|restaurant|market/.test(haystack)) score += 2;
    if (token === "culture" && /culture|art|history|museum|music|festival/.test(haystack))
      score += 2;
    if (token === "nature" && /nature|hike|trail|wild|beach|safari|sunrise/.test(haystack))
      score += 2;
  }

  if (event.status === "live") score += 1;
  return score;
}

function buildReply(prompt: string, events: BukaEvent[]) {
  const lower = prompt.toLowerCase();
  const suggestions = events
    .map((event) => ({ event, score: scoreEvent(event, prompt) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const vibe = lower.includes("food")
    ? "a delicious evening"
    : lower.includes("nature") || lower.includes("outdoor")
      ? "an outdoorsy escape"
      : lower.includes("culture") || lower.includes("art")
        ? "a culture-first adventure"
        : lower.includes("night") || lower.includes("party") || lower.includes("dj")
          ? "a vibrant night out"
          : "an easy, memorable city stop";

  const intro =
    suggestions.length > 0
      ? `Buka AI suggests ${vibe} with these options.`
      : "Buka AI is scanning the live schedule for experiences that match your mood.";

  return { intro, suggestions } as const;
}

function AiPage() {
  const [prompt, setPrompt] = useState("I want a warm, social night with music and good food");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["ai-suggestions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("is_sample", false)
        .order("scheduled_at", { ascending: true })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as BukaEvent[];
    },
  });

  const { intro, suggestions } = useMemo(
    () => buildReply(prompt || "live experiences", events),
    [events, prompt],
  );

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

      <div className="rounded-3xl border bg-card p-4 shadow-soft sm:p-6">
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
          <Button type="button">Get ideas</Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {samplePrompts.map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => setPrompt(sample)}
              className="rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary hover:text-foreground"
            >
              {sample}
            </button>
          ))}
        </div>
      </div>

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
          ) : suggestions.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  No exact matches yet. Try a broader description like “food”, “music”, or “nature”.
                </p>
              </CardContent>
            </Card>
          ) : (
            suggestions.map(({ event }) => (
              <Card key={event.id} className="mb-3 overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col gap-4 p-4 sm:flex-row">
                    <div className="h-28 w-full rounded-2xl bg-gradient-to-br from-primary/20 via-sunset/10 to-sand sm:w-32" />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-xl">{event.title}</h2>
                        {event.status === "live" && (
                          <Badge className="bg-live text-live-foreground">Live</Badge>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" aria-hidden />
                          {event.location || "Online"}
                        </span>
                        <span>{formatWhen(event.scheduled_at)}</span>
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
        </div>

        <aside className="rounded-3xl border bg-muted/30 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Lightbulb className="h-4 w-4" aria-hidden />
            Buka AI summary
          </div>
          <h2 className="mt-3 font-display text-2xl">{intro}</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li>• Lean into local energy: food, music, and cultural depth tend to perform best.</li>
            <li>
              • If you want an easy evening, start with live events and then add a dinner stop.
            </li>
            <li>• For slow travel, pick nature-led or sunrise-first experiences.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
