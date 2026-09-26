import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useTracks,
  TrackToggle,
  StartAudio,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { Copy, Radio } from "lucide-react";
import { toast } from "sonner";
import "@livekit/components-styles";

import { Button } from "@/components/ui/button";
import { createStreamIngress, getLiveKitToken } from "@/lib/livekit.functions";

function Stage() {
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], { onlySubscribed: false });
  const track = tracks.find((t) => t.publication?.track);
  if (!track) {
    return (
      <div className="grid h-full place-items-center px-6 text-center">
        <div>
          <Radio className="mx-auto h-10 w-10 opacity-80" aria-hidden />
          <p className="mt-3 font-display text-xl">Waiting for the host to go live…</p>
        </div>
      </div>
    );
  }
  return <VideoTrack trackRef={track} className="h-full w-full object-contain" />;
}

function ObsPanel({ eventId, subExperienceId }: { eventId: string; subExperienceId?: string }) {
  const create = useServerFn(createStreamIngress);
  const [info, setInfo] = useState<{ url: string; streamKey: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const copy = (v: string) => navigator.clipboard.writeText(v).then(() => toast.success("Copied"));
  return (
    <div className="rounded-2xl border bg-card p-4 text-sm">
      <p className="font-medium">Stream from OBS or other software</p>
      {info ? (
        <div className="mt-3 space-y-2">
          {[["Server", info.url], ["Stream key", info.streamKey]].map(([label, v]) => (
            <div key={label} className="flex items-center gap-2">
              <span className="w-24 text-muted-foreground">{label}</span>
              <code className="flex-1 truncate rounded bg-muted px-2 py-1">{v}</code>
              <Button size="icon" variant="ghost" onClick={() => copy(v)} aria-label={`Copy ${label}`}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <Button
          className="mt-3"
          variant="outline"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              setInfo(await create({ data: { eventId, subExperienceId } }));
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Could not create stream link");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Creating…" : "Get stream link"}
        </Button>
      )}
    </div>
  );
}

export default function LivePlayer({ eventId, subExperienceId }: { eventId: string; subExperienceId?: string }) {
  const getToken = useServerFn(getLiveKitToken);
  const { data, error } = useQuery({
    queryKey: ["livekit-token", eventId, subExperienceId],
    queryFn: () => getToken({ data: { eventId, subExperienceId } }),
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

  return (
    <div className="space-y-3">
      <div className="aspect-video w-full overflow-hidden rounded-3xl bg-sunset text-primary-foreground">
        {error ? (
          <div className="grid h-full place-items-center px-6 text-center">Could not connect to the stream.</div>
        ) : !data ? (
          <div className="grid h-full place-items-center">Connecting…</div>
        ) : (
          <LiveKitRoom serverUrl={data.url} token={data.token} connect video={false} audio={false} className="relative h-full">
            <Stage />
            <RoomAudioRenderer />
            <StartAudio label="Tap to enable sound" className="absolute bottom-3 left-3" />
            {data.isHost && (
              <div className="absolute bottom-3 right-3 flex gap-2">
                <TrackToggle source={Track.Source.Camera}>Camera</TrackToggle>
                <TrackToggle source={Track.Source.Microphone}>Mic</TrackToggle>
                <TrackToggle source={Track.Source.ScreenShare}>Screen</TrackToggle>
              </div>
            )}
          </LiveKitRoom>
        )}
      </div>
      {data?.isHost && <ObsPanel eventId={eventId} subExperienceId={subExperienceId} />}
    </div>
  );
}
