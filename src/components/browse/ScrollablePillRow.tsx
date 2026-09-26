import { useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  ariaLabel: string;
  children: ReactNode;
  stepByPill?: boolean;
};

export function ScrollablePillRow({ ariaLabel, children, stepByPill = false }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;

    if (stepByPill) {
      const viewport = container.getBoundingClientRect();
      const pills = Array.from(container.children) as HTMLElement[];
      const targetPill =
        direction === "right"
          ? pills.find((pill) => pill.getBoundingClientRect().left > viewport.left + 1)
          : pills.filter((pill) => pill.getBoundingClientRect().left < viewport.left - 1).at(-1);

      if (!targetPill) return;

      container.scrollTo({
        left: container.scrollLeft + targetPill.getBoundingClientRect().left - viewport.left,
        behavior: "smooth",
      });
      return;
    }

    container.scrollBy({
      left: (direction === "left" ? -1 : 1) * container.clientWidth * 0.8,
      behavior: "smooth",
    });
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 shrink-0"
        aria-label={`Scroll ${ariaLabel.toLowerCase()} left`}
        onClick={() => scroll("left")}
      >
        <ChevronLeft aria-hidden="true" />
      </Button>
      <div
        ref={scrollRef}
        role="region"
        aria-label={ariaLabel}
        tabIndex={0}
        className="flex min-w-0 flex-1 snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain pb-1 scroll-smooth scrollbar-none"
      >
        {children}
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 shrink-0"
        aria-label={`Scroll ${ariaLabel.toLowerCase()} right`}
        onClick={() => scroll("right")}
      >
        <ChevronRight aria-hidden="true" />
      </Button>
    </div>
  );
}
