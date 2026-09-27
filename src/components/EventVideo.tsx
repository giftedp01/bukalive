import { useQuery } from "@tanstack/react-query";

import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { getVideoSource } from "@/lib/video";

type Props = { videoPath?: string | null; videoUrl?: string | null; title: string };

export function EventVideo({ videoPath, videoUrl, title }: Props) {
  const source = videoUrl ? getVideoSource(videoUrl) : null;
  const {
    data: signedUrl,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["event-video", videoPath],
    enabled: !!videoPath,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("event-videos")
        .createSignedUrl(videoPath!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });

  const activeSource = videoPath
    ? signedUrl
      ? { kind: "file" as const, src: signedUrl }
      : null
    : source;

  if (videoPath && isLoading) return <Skeleton className="aspect-video w-full rounded-xl" />;
  if (error || !activeSource) {
    return (
      <div className="grid aspect-video place-items-center rounded-xl bg-muted text-sm text-muted-foreground">
        Video unavailable
      </div>
    );
  }
  if (activeSource.kind === "embed") {
    return (
      <iframe
        className="aspect-video w-full rounded-xl bg-black"
        src={activeSource.src}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    );
  }
  return (
    <video
      className="aspect-video w-full rounded-xl bg-black"
      src={activeSource.src}
      controls
      playsInline
      preload="metadata"
    />
  );
}
