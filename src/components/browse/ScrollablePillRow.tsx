import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  ariaLabel: string;
  children: ReactNode;
  stepByPill?: boolean;
};

export function ScrollablePillRow({ ariaLabel, children, stepByPill = false }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const updateScrollState = () => {
      const maxScrollLeft = container.scrollWidth - container.clientWidth;
      setCanScrollLeft(container.scrollLeft > 1);
      setCanScrollRight(container.scrollLeft < maxScrollLeft - 1);
    };

    updateScrollState();
    container.addEventListener("scroll", updateScrollState, { passive: true });

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
    };
  }, []);

  const scroll = (direction: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;

    const firstPill = container.firstElementChild as HTMLElement | null;
    const gap =
      Number.parseFloat(window.getComputedStyle(container).gap) ||
      Number.parseFloat(window.getComputedStyle(container).columnGap) ||
      0;

    const scrollStep = stepByPill
      ? (firstPill?.getBoundingClientRect().width ?? container.clientWidth * 0.8) + gap
      : container.clientWidth * 0.8;

    container.scrollBy({
      left: (direction === "left" ? -1 : 1) * scrollStep,
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
        disabled={!canScrollLeft}
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
        disabled={!canScrollRight}
        onClick={() => scroll("right")}
      >
        <ChevronRight aria-hidden="true" />
      </Button>
    </div>
  );
}
