import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COUNTRIES } from "@/data/countries";

type Props = {
  value: string | undefined;
  onChange: (id: string | undefined) => void;
  allowAll?: boolean;
};

export function CountrySelector({ value, onChange, allowAll = false }: Props) {
  return (
    <div className="space-y-2">
      <Label htmlFor="country">Country</Label>
      <Select
        {...(allowAll ? { value: value ?? "all" } : value ? { value } : {})}
        onValueChange={(id) => onChange(id === "all" ? undefined : id)}
      >
        <SelectTrigger id="country" className="w-full sm:max-w-xs">
          <SelectValue placeholder="Choose a country" />
        </SelectTrigger>
        <SelectContent>
          {allowAll && <SelectItem value="all">All countries</SelectItem>}
          {COUNTRIES.map((country) => (
            <SelectItem key={country.id} value={country.id}>
              {country.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
