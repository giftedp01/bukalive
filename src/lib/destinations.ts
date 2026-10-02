import { queryOptions } from "@tanstack/react-query";

import kruger from "@/assets/hero-safari.jpg";
import hermanus from "@/assets/dest-hermanus.jpg";
import mara from "@/assets/dest-mara.jpg";
import kilimanjaro from "@/assets/dest-kilimanjaro.jpg";
import capecoast from "@/assets/dest-capecoast.jpg";
import marrakech from "@/assets/dest-marrakech.jpg";
import kyoto from "@/assets/dest-kyoto.jpg";
import amalfi from "@/assets/dest-amalfi.jpg";
import iceland from "@/assets/dest-iceland.jpg";
import rio from "@/assets/dest-rio.jpg";
import reef from "@/assets/dest-reef.jpg";
import { supabase } from "@/integrations/supabase/client";

export const DESTINATION_IMAGES: Record<string, string> = {
  kruger,
  hermanus,
  mara,
  kilimanjaro,
  capecoast,
  marrakech,
  kyoto,
  amalfi,
  iceland,
  rio,
  reef,
};

export type Destination = {
  id: string;
  slug: string;
  name: string;
  country_id: string;
  region: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  summary: string;
  description: string;
  best_time: string | null;
  category_id: string | null;
  image_key: string | null;
  cover_image_url: string | null;
  is_featured: boolean;
  is_sample: boolean;
};

export type Business = {
  id: string;
  slug: string;
  owner_id: string | null;
  name: string;
  business_type: string;
  country_id: string;
  city: string;
  destination_slug: string | null;
  category_id: string | null;
  summary: string;
  description: string;
  website: string | null;
  logo_url: string | null;
  verification_status: VerificationStatus;
  is_sample: boolean;
};

export type VerificationStatus =
  | "none"
  | "pending"
  | "verified_business"
  | "verified_guide"
  | "verified_attraction"
  | "tourism_organisation";

export type Listing = {
  id: string;
  destination_slug: string;
  business_id: string | null;
  kind: "stay" | "food" | "attraction" | "activity" | "transport";
  name: string;
  summary: string;
  url: string | null;
  price_from: string | null;
  is_sample: boolean;
};

export const LISTING_KINDS: { kind: Listing["kind"]; label: string; icon: string }[] = [
  { kind: "stay", label: "Stay nearby", icon: "🛏️" },
  { kind: "activity", label: "Other activities", icon: "🧭" },
  { kind: "food", label: "Food & restaurants", icon: "🍽️" },
  { kind: "transport", label: "Getting there", icon: "✈️" },
  { kind: "attraction", label: "Attractions", icon: "📍" },
];

export const BUSINESS_TYPES: Record<string, string> = {
  hotel: "Hotel",
  lodge: "Lodge",
  resort: "Resort",
  safari_operator: "Safari operator",
  tour_operator: "Tour operator",
  guide: "Guide",
  attraction: "Attraction",
  museum: "Museum",
  park: "Park / reserve",
  restaurant: "Restaurant",
  event_organiser: "Event organiser",
  sports_organisation: "Sports organisation",
  cultural_organisation: "Cultural organisation",
  tourism_board: "Tourism board",
  local_experience: "Local experience provider",
};

export function destinationImage(d: Pick<Destination, "image_key" | "cover_image_url"> | null | undefined) {
  if (!d) return undefined;
  return d.cover_image_url ?? (d.image_key ? DESTINATION_IMAGES[d.image_key] : undefined);
}

export const destinationsQuery = queryOptions({
  queryKey: ["destinations"],
  staleTime: 10 * 60_000,
  queryFn: async () => {
    const { data, error } = await supabase.from("destinations" as never).select("*").order("name");
    if (error) throw error;
    return (data ?? []) as unknown as Destination[];
  },
});

export function listingsQuery(slug: string) {
  return queryOptions({
    queryKey: ["listings", slug],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings" as never)
        .select("*")
        .eq("destination_slug", slug);
      if (error) throw error;
      return (data ?? []) as unknown as Listing[];
    },
  });
}

export const EVENT_SELECT =
  "*, business:businesses(id, slug, name, verification_status, is_sample)";
