import { Globe2, Languages, Mic2, Volume2 } from "lucide-react";

export function AccessibilityPanel({
  eventTitle,
  category,
}: {
  eventTitle: string;
  category?: string | null;
}) {
  const normalized = `${eventTitle} ${category ?? ""}`.toLowerCase();
  const culturalKeywords = [
    "art",
    "music",
    "festival",
    "food",
    "culture",
    "heritage",
    "history",
    "dance",
    "market",
  ];
  const natureKeywords = [
    "safari",
    "hike",
    "beach",
    "wild",
    "nature",
    "trail",
    "mountain",
    "adventure",
  ];

  const isCulture = culturalKeywords.some((keyword) => normalized.includes(keyword));
  const isNature = natureKeywords.some((keyword) => normalized.includes(keyword));

  const features = [
    "Live captions coming soon",
    "Description translation into 10 languages",
    "host audio support",
    ...(isCulture ? ["local-language context cues"] : []),
    ...(isNature ? ["trail and route notes"] : []),
  ];

  const languages = ["English", "Español", "Français", "Português"].slice(0, isCulture ? 4 : 3);

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Globe2 className="h-4 w-4 text-primary" aria-hidden />
        <p className="font-display text-lg">Accessibility & language</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {languages.map((language) => (
          <span
            key={language}
            className="rounded-full border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
          >
            {language}
          </span>
        ))}
      </div>

      <div className="mt-4 space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4" aria-hidden />
          <span>{features[0]}</span>
        </div>
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4" aria-hidden />
          <span>{features[1]}</span>
        </div>
        <div className="flex items-center gap-2">
          <Mic2 className="h-4 w-4" aria-hidden />
          <span>{features[2]}</span>
        </div>
      </div>
    </div>
  );
}
