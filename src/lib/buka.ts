import { TOURISM_CATEGORIES } from "@/data/categories";

export const CATEGORIES = [
  { value: "safari", label: "Safari" },
  { value: "sports", label: "Sports" },
  { value: "festival", label: "Festival" },
  { value: "concert", label: "Concert" },
  { value: "conference", label: "Conference" },
  { value: "wedding", label: "Wedding" },
  { value: "extreme_sports", label: "Extreme Sports" },
  { value: "arts", label: "Arts" },
  { value: "fashion", label: "Fashion" },
  { value: "other", label: "Other" },
] as const;

export type CategoryValue = (typeof CATEGORIES)[number]["value"];

export function categoryLabel(value: string) {
  return (
    TOURISM_CATEGORIES.find((category) => category.id === value)?.label ??
    CATEGORIES.find((category) => category.value === value)?.label ??
    "Other"
  );
}

/** A single action available on a sub-experience. */
export type SubExperienceAction = {
  label: string;
  url: string;
};

/**
 * A bookable/watchable sub-experience nested under a top-level BukaEvent.
 * e.g. "Sunset Game Drive" under "Kruger Safari".
 */
export type SubExperience = {
  id: string;
  name: string;
  description: string;
  /** ISO date-time string — shown on Upcoming badge */
  scheduledAt?: string;
  status: "live" | "upcoming" | "ended";
  actions?: {
    /** Present when this sub-experience has an active LiveKit stream. */
    watchLive?: true | null;
    book?: SubExperienceAction | null;
    visit?: SubExperienceAction | null;
    stay?: SubExperienceAction | null;
    eat?: SubExperienceAction | null;
    explore?: SubExperienceAction | null;
  };
};

export type BukaEvent = {
  id: string;
  host_id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  scheduled_at: string;
  duration_minutes: number;
  price_cents: number;
  currency: string;
  event_type: "ticketed" | "free_ad_slot";
  status: "draft" | "upcoming" | "live" | "ended";
  cover_image_url: string | null;
  video_path?: string | null;
  video_url?: string | null;
  is_published: boolean;
  is_flagged: boolean;
  view_count: number;
  created_at: string;
  // Optional taxonomy metadata
  category_id?: string | null;
  subcategory?: string | null;
  country_id?: string | null;
  /** Destination slug (see destinations table). */
  destination_id?: string | null;
  business_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  viewer_count?: number;
  replay_url?: string | null;
  is_sample?: boolean;
  business?: {
    id: string;
    slug: string;
    name: string;
    verification_status: string;
    is_sample: boolean;
  } | null;
  // Outbound action links (optional — just URLs, no booking system)
  book_url?: string | null;
  visit_url?: string | null;
  stay_url?: string | null;
  /**
   * Optional nested sub-experiences (e.g. specific game drives under a safari).
   * When absent or empty the event detail page renders exactly as before.
   */
  subExperiences?: SubExperience[];
};

export function formatPrice(cents: number, currency = "ZAR") {
  if (!cents) return "Free";
  return new Intl.NumberFormat(currency === "ZAR" ? "en-ZA" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function endsAt(event: Pick<BukaEvent, "scheduled_at" | "duration_minutes">) {
  return new Date(new Date(event.scheduled_at).getTime() + event.duration_minutes * 60_000);
}

/** Effective phase, combining the host-set status with the clock. */
export function eventPhase(event: BukaEvent): "draft" | "live" | "upcoming" | "ended" {
  if (!event.is_published) return "draft";
  if (event.status === "live") return "live";
  if (event.status === "ended") return "ended";
  if (endsAt(event) < new Date()) return "ended";
  return "upcoming";
}

export function isWatchable(event: BukaEvent) {
  return event.status === "live" || new Date(event.scheduled_at) <= new Date();
}
