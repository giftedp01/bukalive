import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  kind: "live" | "upcoming" | "recorded" | "destination";
  title: string;
  destinationName?: string;
};

declare global {
  interface Window {
    __bukaMapsReady?: () => void;
    google?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }
}

let loader: Promise<void> | null = null;
function loadMaps(): Promise<void> {
  if (window.google?.maps?.Map) return Promise.resolve();
  const key = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"];
  if (!key) return Promise.reject(new Error("Google Maps key not configured"));
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    window.__bukaMapsReady = () => resolve();
    const channel = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"];
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__bukaMapsReady&channel=${channel}`;
    s.async = true;
    s.onerror = () => reject(new Error("Map failed to load"));
    document.head.appendChild(s);
  });
  return loader;
}

const COLORS: Record<MapMarker["kind"], string> = {
  live: "#e5484d",
  upcoming: "#f5b301",
  recorded: "#2f7de1",
  destination: "#1f6f68",
};

export function WorldMap({
  markers,
  onSelect,
}: {
  markers: MapMarker[];
  onSelect: (id: string) => void;
}) {
  const el = useRef<HTMLDivElement | null>(null);
  const map = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const pins = useRef<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    loadMaps()
      .then(() => {
        if (!el.current) return;
        map.current = new window.google.maps.Map(el.current, {
          center: { lat: 10, lng: 15 },
          zoom: 2,
          minZoom: 2,
          maxZoom: 18,
          clickableIcons: false,
          zoomControl: false,
          gestureHandling: "greedy",
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }],
        });
        setReady(true);
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    pins.current.forEach((p) => p.setMap(null));
    pins.current = markers.map((m) => {
      const marker = new window.google.maps.Marker({
        position: { lat: m.lat, lng: m.lng },
        map: map.current,
        title: [m.destinationName, m.title].filter(Boolean).join(" — "),
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: m.kind === "destination" ? 6 : 9,
          fillColor: COLORS[m.kind],
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });
      marker.addListener("click", () => onSelect(m.id));
      return marker;
    });
  }, [ready, markers, onSelect]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl border bg-sand">
      <div ref={el} className="h-full w-full" />
      {!ready && !failed && (
        <div className="absolute inset-0 grid place-items-center bg-sand p-6 text-center text-sm text-muted-foreground">
          <div>
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
            Loading the world map…
          </div>
        </div>
      )}
      {failed && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted-foreground">
          The map couldn't load right now. Try refreshing the page.
        </div>
      )}
      {ready && (
        <div className="absolute right-3 top-3 z-10 flex flex-col gap-1 rounded-xl border bg-background/95 p-1 shadow-soft">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Zoom in"
            onClick={() => map.current?.setZoom(map.current.getZoom() + 1)}
          >
            <Plus className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Zoom out"
            onClick={() => map.current?.setZoom(map.current.getZoom() - 1)}
          >
            <Minus className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      )}
    </div>
  );
}
