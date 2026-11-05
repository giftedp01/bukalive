import { createClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { GatewayError, generateResponse } from "@lovable.dev/ai-gateway";
import type { ResponseFor } from "@lovable.dev/ai-gateway";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";
import type {} from "@/ai-gateway.types";

/** Reply shape returned to the Ask Buka page. */
export type BukaAiReply =
  | {
      available: true;
      intro: string;
      eventIds: string[];
      tips: string[];
    }
  | {
      available: false;
      error: "AI_UNAVAILABLE" | "EMPTY";
      intro: "";
      eventIds: string[];
      tips: string[];
    };

const replySchema = z.object({
  intro: z.string().min(1).max(600),
  eventIds: z.array(z.string()).max(6),
  tips: z.array(z.string().min(1).max(240)).max(4),
});

function createServerPublishableClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false },
    // Opaque sb_ keys aren't JWTs; send only apikey, not the default Authorization bearer.
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

function extractOutputText(response: ResponseFor<"responses", "openai/gpt-6-astra">) {
  let text = "";
  for (const item of response.output ?? []) {
    if (item.type !== "message") continue;
    for (const part of item.content ?? []) {
      if ("text" in part) text += part.text;
    }
  }
  return text;
}

const INSTRUCTIONS = `You are Buka, the AI travel concierge for BukaLive — a platform where people watch live streams from tourism destinations around the world and discover where to go.

You answer ONLY from the numbered catalogue of BukaLive experiences the user's message contains. Never invent destinations, businesses, events, prices, dates or people that are not in the catalogue. Never claim a business or host is verified, licensed, or official. Catalogue entries marked SAMPLE are demo listings — still recommendable, but never present them as real verified businesses.

Rank the catalogue by how well it matches what the traveller asked for (mood, activity, place, food, nature, culture, budget, timing). Prefer experiences that are currently live or scheduled soon, but a perfect thematic match may beat a merely-live one. If nothing matches well, still recommend the closest experiences and say so honestly in the intro.

Reply with ONLY a JSON object in this exact shape:
{"intro": "<1-2 warm, conversational sentences naming your top pick and why>", "eventIds": ["<id>", "..."], "tips": ["<Title> · <Place> · <Live now | Starting <readable date> | Ended>", "..."]}
Rules: intro max 2 sentences; eventIds contains up to 6 catalogue ids in recommendation order, best first; tips has at most 4 entries and only for the ids in eventIds; no markdown, no text outside the JSON.`;

type CatalogRow = {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  category: string | null;
  subcategory: string | null;
  location: string | null;
  destination_id: string | null;
  country_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  price_cents: number;
  currency: string;
  status: string;
  is_sample: boolean | null;
  host_id: string;
};

function statusLabel(row: CatalogRow, now: Date) {
  if (row.status === "live") return "Live now";
  if (row.status === "ended") return "Ended (replay)";
  const when = new Date(row.scheduled_at);
  if (when.getTime() + row.duration_minutes * 60_000 < now.getTime()) return "Ended (replay)";
  return `Scheduled for ${row.scheduled_at}`;
}

export const askBuka = createServerFn({ method: "POST" })
  .inputValidator((input: { prompt: string }) => {
    const prompt = z.string().min(1).max(400).parse(input.prompt);
    return { prompt };
  })
  .handler(async ({ data }): Promise<BukaAiReply> => {
    const supabasePublic = createServerPublishableClient();

    const { data: eventRows, error } = await supabasePublic
      .from("events")
      .select(
        "id, host_id, title, description, category_id, category, subcategory, location, destination_id, country_id, scheduled_at, duration_minutes, price_cents, currency, status, is_sample",
      )
      .eq("is_published", true)
      .eq("is_flagged", false)
      .order("scheduled_at", { ascending: true })
      .limit(400);
    if (error) {
      console.error("[askBuka] catalogue query failed:", error.message);
      return { available: false, error: "EMPTY", intro: "", eventIds: [], tips: [] };
    }
    const rows = (eventRows ?? []) as CatalogRow[];
    if (rows.length === 0) {
      return { available: false, error: "EMPTY", intro: "", eventIds: [], tips: [] };
    }

    const hostIds = [...new Set(rows.map((row) => row.host_id))];
    const { data: profiles } = await supabasePublic
      .from("profiles")
      .select("id, full_name")
      .in("id", hostIds);
    const hostNames = new Map(
      ((profiles as { id: string; full_name: string | null }[] | null) ?? []).map((profile) => [
        profile.id,
        profile.full_name ?? "unknown host",
      ]),
    );

    const now = new Date();
    const catalogue = rows
      .map((row) => {
        const price = row.price_cents
          ? `${(row.price_cents / 100).toFixed(2)} ${row.currency}`
          : "Free";
        return [
          `id=${row.id}`,
          `"${row.title}"`,
          `host=${hostNames.get(row.host_id) ?? "unknown host"}`,
          `place=${row.location || "Online"}`,
          row.destination_id ? `destination=${row.destination_id}` : null,
          `category=${row.category_id ?? row.category ?? "other"}${row.subcategory ? ` / ${row.subcategory}` : ""}`,
          row.country_id ? `country=${row.country_id}` : null,
          `when=${statusLabel(row, now)}`,
          `price=${price}`,
          row.is_sample ? "SAMPLE-DEMO-LISTING" : null,
          `about=${(row.description ?? "").slice(0, 220)}`,
        ]
          .filter(Boolean)
          .join(" | ");
      })
      .join("\n");

    try {
      const response = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions: INSTRUCTIONS,
        input: `Today is ${now.toISOString()}. The traveller asks: ${data.prompt}\n\nReply with JSON only.\n\nCatalogue of BukaLive experiences:\n${catalogue}`,
        max_output_tokens: 900,
        text: { format: { type: "json_object" } },
      });

      const raw = extractOutputText(response);
      const parsed = replySchema.parse(JSON.parse(raw));
      const knownIds = new Set(rows.map((row) => row.id));
      return {
        available: true,
        intro: parsed.intro,
        eventIds: parsed.eventIds.filter((id) => knownIds.has(id)).slice(0, 6),
        tips: parsed.tips,
      };
    } catch (err) {
      if (err instanceof GatewayError) {
        console.error("[askBuka] gateway error:", err.code, err.httpStatus);
      } else {
        console.error("[askBuka] unexpected error:", err);
      }
      return { available: false, error: "AI_UNAVAILABLE", intro: "", eventIds: [], tips: [] };
    }
  });
