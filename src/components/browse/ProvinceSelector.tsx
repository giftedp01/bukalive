import { PROVINCES } from "@/data/provinces";
import { Button } from "@/components/ui/button";

type Props = {
  value: string | undefined;
  onChange: (id: string | undefined) => void;
};

export function ProvinceSelector({ value, onChange }: Props) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Province
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <Button
          size="sm"
          variant={!value ? "default" : "outline"}
          className="shrink-0"
          onClick={() => onChange(undefined)}
        >
          All provinces
        </Button>
        {PROVINCES.map((p) => (
          <Button
            key={p.id}
            size="sm"
            variant={value === p.id ? "default" : "outline"}
            className="shrink-0"
            onClick={() => onChange(value === p.id ? undefined : p.id)}
          >
            {p.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
