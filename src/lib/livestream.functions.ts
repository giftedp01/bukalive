import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const payLivestreamRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({ requestId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: request, error } = await context.supabase
      .from("livestream_requests")
      .select("id, status, payment_status")
      .eq("id", data.requestId)
      .eq("requester_id", context.userId)
      .maybeSingle();

    if (error) throw error;
    if (!request) throw new Error("Livestream request not found");
    if (request.status !== "approved") {
      throw new Error("This livestream request has not been approved");
    }
    if (request.payment_status === "paid") return { ok: true };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: updatedRequest, error: updateError } = await supabaseAdmin
      .from("livestream_requests")
      .update({ payment_status: "paid", paid_at: new Date().toISOString() })
      .eq("id", request.id)
      .eq("status", "approved")
      .eq("payment_status", "pending")
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error("livestream payment update failed", updateError);
      throw new Error("Could not complete payment");
    }
    if (!updatedRequest) throw new Error("This request is no longer available for payment");

    return { ok: true };
  });
