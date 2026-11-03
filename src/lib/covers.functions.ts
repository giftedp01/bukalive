import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

// Cover paths live in the private `event-covers` bucket as `<host-uid>/<file>`.
const OWNER_FOLDER =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//;

/**
 * Public, read-only client for verifying that a cover belongs to a published,
 * unflagged event. Uses the publishable key; the events table exposes
 * published rows to everyone via RLS.
 */
function publishableClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) {
    throw new Error("Missing Supabase environment variables");
  }
  return createClient<Database>(url, key, {
    global: {
      fetch: (input, init) => {
        const headers = new Headers(
          typeof Request !== "undefined" && input instanceof Request
            ? input.headers
            : undefined,
        );
        // Publishable keys are opaque strings, not bearer JWTs.
        if (headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Returns a short-lived signed URL for an event cover. Only covers attached to
 * a published, unflagged event (or absolute URLs) are ever signed, so the
 * browser never needs direct read access to the bucket.
 */
export const getCoverUrl = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z.object({ path: z.string().min(1).max(512) }).parse(data),
  )
  .handler(async ({ data }) => {
    const path = data.path;
    if (path.startsWith("http")) return { url: path };
    if (path.includes("..") || !OWNER_FOLDER.test(path)) return { url: null };

    const pub = publishableClient();
    const { data: event, error } = await pub
      .from("events")
      .select("id")
      .eq("cover_image_url", path)
      .eq("is_published", true)
      .eq("is_flagged", false)
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error("cover lookup failed", error);
      return { url: null };
    }
    if (!event) return { url: null };

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: signed, error: signError } = await supabaseAdmin.storage
      .from("event-covers")
      .createSignedUrl(path, 3600);
    if (signError) {
      console.error("cover signing failed", signError);
      return { url: null };
    }
    return { url: signed?.signedUrl ?? null };
  });
