import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const input = z.object({ eventId: z.string().uuid(), subExperienceId: z.string().max(100).optional() });

function roomName(eventId: string, sub?: string) {
  return sub ? `event-${eventId}-${sub}` : `event-${eventId}`;
}

async function assertAccess(supabase: any, userId: string, eventId: string) {
  const { data: event } = await supabase.from("events").select("host_id").eq("id", eventId).maybeSingle();
  if (!event) throw new Error("Event not found");
  const isHost = event.host_id === userId;
  if (!isHost) {
    const { data: ok } = await supabase.rpc("has_access", { _event_id: eventId, _user_id: userId });
    if (!ok) throw new Error("No access to this event");
  }
  return isHost;
}

export const getLiveKitToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => input.parse(d))
  .handler(async ({ data, context }) => {
    const isHost = await assertAccess(context.supabase, context.userId, data.eventId);
    const { AccessToken } = await import("livekit-server-sdk");
    const at = new AccessToken(process.env["LIVEKIT_API_KEY"]!, process.env["LIVEKIT_API_SECRET"]!, {
      identity: `${isHost ? "host" : "viewer"}-${context.userId}`,
      ttl: "4h",
    });
    at.addGrant({
      room: roomName(data.eventId, data.subExperienceId),
      roomJoin: true,
      canSubscribe: true,
      canPublish: isHost,
      canPublishData: true,
    });
    return { token: await at.toJwt(), url: process.env["LIVEKIT_URL"]!, isHost };
  });

export const createStreamIngress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => input.parse(d))
  .handler(async ({ data, context }) => {
    const isHost = await assertAccess(context.supabase, context.userId, data.eventId);
    if (!isHost) throw new Error("Only the host can create a stream link");
    const { IngressClient, IngressInput } = await import("livekit-server-sdk");
    const host = process.env["LIVEKIT_URL"]!.replace(/^wss:/, "https:");
    const client = new IngressClient(host, process.env["LIVEKIT_API_KEY"]!, process.env["LIVEKIT_API_SECRET"]!);
    const room = roomName(data.eventId, data.subExperienceId);
    const ingress = await client.createIngress(IngressInput.RTMP_INPUT, {
      name: room,
      roomName: room,
      participantIdentity: `obs-${context.userId}`,
      participantName: "Host (OBS)",
    });
    return { url: ingress.url ?? "", streamKey: ingress.streamKey ?? "" };
  });
