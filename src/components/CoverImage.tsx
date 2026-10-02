import { useQuery } from "@tanstack/react-query";
import { Radio } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Cover images live in the private `event-covers` bucket, so a short-lived
 * signed URL is resolved on demand. Absolute URLs are used as-is.
 */
export function useCoverUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["cover", path],
    enabled: !!path,
    staleTime: 30 * 60_000,
    queryFn: async () => {
      if (!path) return null;
      if (path.startsWith("http")) return path;
      const { data } = await supabase.storage.from("event-covers").createSignedUrl(path, 3600);
      return data?.signedUrl ?? null;
    },
  });
}

export function CoverImage({
  path,
  alt,
  className,
  fallback,
  eager,
}: {
  path: string | null | undefined;
  alt: string;
  className?: string;
  /** Bundled image used when there is no uploaded cover (e.g. destination photo). */
  fallback?: string | undefined;
  eager?: boolean;
}) {
  const { data: url } = useCoverUrl(path);
  const src = url ?? fallback;

  if (!src) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-sunset text-primary-foreground",
          className,
        )}
      >
        <Radio className="h-8 w-8 opacity-70" aria-hidden />
        <span className="sr-only">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={cn("object-cover", className)}
    />
  );
}
