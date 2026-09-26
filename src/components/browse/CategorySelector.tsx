import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { TOURISM_CATEGORIES } from "@/data/categories";
import { Button } from "@/components/ui/button";

type Props = {
  value: string | undefined;
  onChange: (id: string | undefined) => void;
};

export function CategorySelector({ value, onChange }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;

    container.scrollBy({
      left: (direction === "left" ? -1 : 1) * container.clientWidth * 0.8,
      behavior: "smooth",
    });
  };

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Category
      </p>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0"
          aria-label="Scroll categories left"
          onClick={() => scroll("left")}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <div
          ref={scrollRef}
          role="region"
          aria-label="Event categories"
          tabIndex={0}
          className="flex min-w-0 flex-1 snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain pb-1 scroll-smooth scrollbar-none"
        >
          <Button
            type="button"
            size="sm"
            variant={!value ? "default" : "outline"}
            className="shrink-0 snap-start"
            onClick={() => onChange(undefined)}
          >
            All categories
          </Button>
          {TOURISM_CATEGORIES.map((c) => (
            <Button
              key={c.id}
              type="button"
              size="sm"
              variant={value === c.id ? "default" : "outline"}
              className="shrink-0 snap-start gap-1.5"
              onClick={() => onChange(value === c.id ? undefined : c.id)}
            >
              <span aria-hidden>{c.icon}</span>
              {c.label}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0"
          aria-label="Scroll categories right"
          onClick={() => scroll("right")}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
