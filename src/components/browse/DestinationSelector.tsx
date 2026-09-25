import { PROVINCES } from "@/data/provinces";
import { Button } from "@/components/ui/button";

type Props = {
  provinceId: string | undefined;
  value: string | undefined;
  onChange: (id: string | undefined) => void;
};

export function DestinationSelector({ provinceId, value, onChange }: Props) {
  const province = PROVINCES.find((p) => p.id === provinceId);
  if (!province) return null;

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Destination in {province.name}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <Button
          size="sm"
          variant={!value ? "default" : "outline"}
          className="shrink-0"
          onClick={() => onChange(undefined)}
        >
          All destinations
        </Button>
        {province.destinations.map((d) => (
          <Button
            key={d.id}
            size="sm"
            variant={value === d.id ? "default" : "outline"}
            className="shrink-0"
            onClick={() => onChange(value === d.id ? undefined : d.id)}
          >
            {d.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
