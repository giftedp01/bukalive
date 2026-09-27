export type VideoSource = { kind: "embed" | "file"; src: string };

export function getVideoSource(rawUrl: string): VideoSource | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return null;

    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id
        ? { kind: "embed", src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` }
        : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      const parts = url.pathname.split("/").filter(Boolean);
      const id =
        url.searchParams.get("v") ??
        (parts[0] === "embed" || parts[0] === "shorts" ? parts[1] : null);
      return id
        ? { kind: "embed", src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` }
        : null;
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const id = url.pathname
        .split("/")
        .filter(Boolean)
        .find((part) => /^\d+$/.test(part));
      return id ? { kind: "embed", src: `https://player.vimeo.com/video/${id}` } : null;
    }
    if (/\.(mp4|webm|ogg)$/i.test(url.pathname)) return { kind: "file", src: url.href };
  } catch {
    return null;
  }
  return null;
}
