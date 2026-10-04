import { BadgeCheck, FlaskConical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { VerificationStatus } from "@/lib/destinations";

const LABELS: Partial<Record<VerificationStatus, string>> = {
  verified_business: "Verified tourism business",
  verified_guide: "Verified guide / operator",
  verified_attraction: "Verified attraction",
  tourism_organisation: "Tourism organisation",
};

/** Only renders for admin-verified statuses. Never shown for pending/none. */
export function VerifiedBadge({
  status,
  compact,
}: {
  status?: VerificationStatus | null;
  compact?: boolean;
}) {
  const label = status ? LABELS[status] : undefined;
  if (!label) return null;
  return (
    <Badge className="gap-1 bg-accent text-accent-foreground" title={label}>
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
      {compact ? "VERIFIED" : label}
    </Badge>
  );
}

export function SampleBadge() {
  return (
    <Badge
      variant="outline"
      className="gap-1 bg-background/90 text-foreground"
      title="Demo content — not a real listing"
    >
      <FlaskConical className="h-3 w-3" aria-hidden /> Sample
    </Badge>
  );
}
