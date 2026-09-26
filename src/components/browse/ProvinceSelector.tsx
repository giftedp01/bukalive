import { PROVINCES } from "@/data/provinces";
import { Button } from "@/components/ui/button";
import { ScrollablePillRow } from "@/components/browse/ScrollablePillRow";

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
      <ScrollablePillRow ariaLabel="Provinces" stepByPill>
        <Button
          type="button"
          size="sm"
          variant={!value ? "default" : "outline"}
          className="shrink-0 snap-start"
          onClick={() => onChange(undefined)}
        >
          All provinces
        </Button>
        {PROVINCES.map((p) => (
          <Button
            key={p.id}
            type="button"
            size="sm"
            variant={value === p.id ? "default" : "outline"}
            className="shrink-0 snap-start"
            onClick={() => onChange(value === p.id ? undefined : p.id)}
          >
            {p.name}
          </Button>
        ))}
      </ScrollablePillRow>
    </div>
  );
}
