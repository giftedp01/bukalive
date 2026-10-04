import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Records a (mock) purchase server-side. Price and currency come from the
 * stored event, never from the caller. A real provider would confirm the
 * payment here (or via webhook) before the row is written.
 */
export const purchaseAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ eventId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: event, error } = await context.supabase
      .from("events")
      .select("id, price_cents, currency, is_published, is_flagged")
      .eq("id", data.eventId)
      .maybeSingle();
    if (error || !event || !event.is_published || event.is_flagged) {
      throw new Error("This event is not available");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: insertError } = await supabaseAdmin.from("purchases").upsert(
      {
        event_id: event.id,
        viewer_id: context.userId,
        amount_cents: event.price_cents,
        currency: event.currency,
        provider: "mock",
        provider_ref: `mock_${crypto.randomUUID()}`,
      },
      { onConflict: "event_id,viewer_id", ignoreDuplicates: true },
    );
    if (insertError) {
      console.error("purchase insert failed", insertError);
      throw new Error("Could not complete purchase");
    }
    return { ok: true };
  });
