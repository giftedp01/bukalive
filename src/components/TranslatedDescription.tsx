import { useServerFn } from "@tanstack/react-start";
import { Languages, Loader2 } from "lucide-react";
import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TRANSLATION_LANGUAGES } from "@/lib/languages";
import { translateEvent } from "@/lib/translate.functions";

type Translation = { title: string; description: string };

export function TranslatedDescription({
  eventId,
  title,
  description,
  className,
  showTitle = false,
}: {
  eventId: string;
  title: string;
  description: string | null;
  className?: string;
  showTitle?: boolean;
}) {
  const translate = useServerFn(translateEvent);
  const [language, setLanguage] = useState("original");
  const [cache, setCache] = useState<Record<string, Translation>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(code: string) {
    setLanguage(code);
    setError(null);
    if (code === "original" || cache[code]) return;
    setLoading(true);
    try {
      const res = await translate({ data: { eventId, language: code } });
      if (res.ok) setCache((c) => ({ ...c, [code]: { title: res.title, description: res.description } }));
      else {
        setError(
          res.error === "NOT_FOUND"
            ? "Translation is available once this experience is published."
            : "Translation isn't available right now. Please try again.",
        );
        setLanguage("original");
      }
    } catch {
      setError("Translation isn't available right now. Please try again.");
      setLanguage("original");
    } finally {
      setLoading(false);
    }
  }

  const active = language !== "original" ? cache[language] : undefined;
  const langLabel = TRANSLATION_LANGUAGES.find((l) => l.code === language)?.label;
  const text = active?.description ?? description;

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <Languages className="h-4 w-4 text-primary" aria-hidden />
        <Select value={language} onValueChange={choose} disabled={loading}>
          <SelectTrigger className="h-8 w-44 text-xs" aria-label="Translate description">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="original">Original language</SelectItem>
            {TRANSLATION_LANGUAGES.map((l) => (
              <SelectItem key={l.code} value={l.code}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {loading && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Translating…
          </span>
        )}
        {active && (
          <span className="text-xs text-muted-foreground">
            Translated to {langLabel} by Buka AI ·{" "}
            <button type="button" className="underline" onClick={() => setLanguage("original")}>
              View original
            </button>
          </span>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      {showTitle && active && <p className="mt-3 font-display text-lg">{active.title}</p>}
      <p
        className="mt-2 whitespace-pre-line text-muted-foreground"
        lang={active ? language : undefined}
        dir={active && language === "ar" ? "rtl" : undefined}
      >
        {text || "The host hasn't added a description yet."}
      </p>
    </div>
  );
}
