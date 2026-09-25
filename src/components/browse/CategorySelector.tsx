import { TOURISM_CATEGORIES } from "@/data/categories";
import { Button } from "@/components/ui/button";

type Props = {
  value: string | undefined;
  onChange: (id: string | undefined) => void;
};

export function CategorySelector({ value, onChange }: Props) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Category
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <Button
          size="sm"
          variant={!value ? "default" : "outline"}
          className="shrink-0"
          onClick={() => onChange(undefined)}
        >
          All categories
        </Button>
        {TOURISM_CATEGORIES.map((c) => (
          <Button
            key={c.id}
            size="sm"
            variant={value === c.id ? "default" : "outline"}
            className="shrink-0 gap-1.5"
            onClick={() => onChange(value === c.id ? undefined : c.id)}
          >
            <span aria-hidden>{c.icon}</span>
            {c.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
