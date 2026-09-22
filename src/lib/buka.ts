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
  return CATEGORIES.find((c) => c.value === value)?.label ?? "Other";
}

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
  status: "draft" | "upcoming" | "live" | "ended";
  cover_image_url: string | null;
  is_published: boolean;
  is_flagged: boolean;
  view_count: number;
  created_at: string;
};

export function formatPrice(cents: number, currency = "USD") {
  if (!cents) return "Free";
  return new Intl.NumberFormat("en-US", {
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
