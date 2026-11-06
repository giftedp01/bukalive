import { createClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { GatewayError, generateResponse } from "@lovable.dev/ai-gateway";
import type { ResponseFor } from "@lovable.dev/ai-gateway";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";
import type {} from "@/ai-gateway.types";
import { TRANSLATION_LANGUAGES } from "@/lib/languages";

export type TranslationResult =
  | { ok: true; title: string; description: string; cached: boolean }
  | { ok: false; error: "NOT_FOUND" | "AI_UNAVAILABLE" };

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false },
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

function outputText(response: ResponseFor<"responses", "openai/gpt-6-astra">) {
  let text = "";
  for (const item of response.output ?? []) {
    if (item.type !== "message") continue;
    for (const part of item.content ?? []) if ("text" in part) text += part.text;
  }
  return text;
}

const codes = TRANSLATION_LANGUAGES.map((l) => l.code) as [string, ...string[]];
const schema = z.object({ title: z.string().min(1), description: z.string() });

export const translateEvent = createServerFn({ method: "POST" })
  .inputValidator((input: { eventId: string; language: string }) =>
    z.object({ eventId: z.string().uuid(), language: z.enum(codes) }).parse(input),
  )
  .handler(async ({ data }): Promise<TranslationResult> => {
    const db = publicClient();
    const { data: event } = await db
      .from("events")
      .select("id, title, description, updated_at")
      .eq("id", data.eventId)
      .eq("is_published", true)
      .eq("is_flagged", false)
      .maybeSingle();
    if (!event) return { ok: false, error: "NOT_FOUND" };

    const { data: cached } = await db
      .from("event_translations")
      .select("title, description, source_updated_at")
      .eq("event_id", event.id)
      .eq("language", data.language)
      .maybeSingle();
    if (cached && new Date(cached.source_updated_at).getTime() === new Date(event.updated_at).getTime()) {
      return { ok: true, title: cached.title, description: cached.description, cached: true };
    }

    const langName = TRANSLATION_LANGUAGES.find((l) => l.code === data.language)!.name;
    try {
      const response = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions: `You translate tourism experience listings into ${langName}. Keep proper nouns (places, landmarks, people, business names) unchanged, keep prices and numbers exact, keep line breaks, do not add or remove information. Reply with ONLY a JSON object {"title": "...", "description": "..."}.`,
        input: `Translate to ${langName}. Reply with JSON only.\n\n${JSON.stringify({ title: event.title, description: event.description ?? "" })}`,
        max_output_tokens: 2000,
        text: { format: { type: "json_object" } },
      });
      const parsed = schema.parse(JSON.parse(outputText(response)));
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("event_translations").upsert(
        {
          event_id: event.id,
          language: data.language,
          title: parsed.title,
          description: parsed.description,
          source_updated_at: event.updated_at,
        },
        { onConflict: "event_id,language" },
      );
      return { ok: true, ...parsed, cached: false };
    } catch (err) {
      if (err instanceof GatewayError) console.error("[translateEvent]", err.code, err.httpStatus);
      else console.error("[translateEvent]", err);
      return { ok: false, error: "AI_UNAVAILABLE" };
    }
  });
