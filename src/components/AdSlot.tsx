import { cn } from "@/lib/utils";

/**
 * Advertising placement container. Ad creative is served here later;
 * for now it renders a labelled promotional panel.
 */
export function AdSlot({
  placement,
  className,
}: {
  placement: "discovery-banner" | "event-detail" | "watch-sidebar";
  className?: string;
}) {
  return (
    <aside
      data-ad-placement={placement}
      className={cn(
        "flex items-center justify-between gap-4 rounded-2xl border border-dashed bg-sand/60 px-5 py-4",
        className,
      )}
    >
      <div>
        <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">
          Sponsored placement
        </p>
        <p className="font-display text-base">Reach travellers watching live moments</p>
      </div>
      <span className="text-xs text-muted-foreground">Advertise on BukaLive</span>
    </aside>
  );
}
