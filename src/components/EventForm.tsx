import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CoverImage } from "@/components/CoverImage";
import { CategorySelector } from "@/components/browse/CategorySelector";
import { DestinationSelector } from "@/components/browse/DestinationSelector";
import { ProvinceSelector } from "@/components/browse/ProvinceSelector";
import { PROVINCES } from "@/data/provinces";
import { supabase } from "@/integrations/supabase/client";
import { type BukaEvent } from "@/lib/buka";
import { useAuth } from "@/lib/auth";

function toLocalInput(iso: string) {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function EventForm({ event }: { event?: BukaEvent }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [categoryId, setCategoryId] = useState(event?.category_id ?? undefined);
  const [provinceId, setProvinceId] = useState(event?.province_id ?? undefined);
  const [destinationId, setDestinationId] = useState(event?.destination_id ?? undefined);
  const [scheduledAt, setScheduledAt] = useState(
    event
      ? toLocalInput(event.scheduled_at)
      : toLocalInput(new Date(Date.now() + 86_400_000).toISOString()),
  );
  const [duration, setDuration] = useState(String(event?.duration_minutes ?? 90));
  const [price, setPrice] = useState(((event?.price_cents ?? 0) / 100).toFixed(2));
  const [eventType, setEventType] = useState<BukaEvent["event_type"]>(
    event?.event_type ?? "ticketed",
  );
  const [coverPath, setCoverPath] = useState<string | null>(event?.cover_image_url ?? null);
  const [published, setPublished] = useState(event?.is_published ?? false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const selectedProvince = PROVINCES.find((province) => province.id === provinceId);
  const selectedDestination = selectedProvince?.destinations.find(
    (destination) => destination.id === destinationId,
  );

  const uploadCover = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("event-covers").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      setCoverPath(path);
      toast.success("Cover image uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!categoryId || !provinceId || !selectedProvince || !destinationId || !selectedDestination) {
      toast.error("Choose a province, destination, and category");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        host_id: user.id,
        title,
        description,
        category_id: categoryId,
        province_id: provinceId,
        destination_id: destinationId,
        location: `${selectedDestination.name}, ${selectedProvince.name}`,
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration_minutes: Number(duration) || 60,
        price_cents: eventType === "ticketed" ? Math.round(Number(price) * 100) || 0 : 0,
        currency: "ZAR",
        event_type: eventType,
        cover_image_url: coverPath,
        is_published: published,
        status: (event?.status === "live" || event?.status === "ended"
          ? event.status
          : published
            ? "upcoming"
            : "draft") as BukaEvent["status"],
      };

      if (event) {
        const { error } = await supabase.from("events").update(payload).eq("id", event.id);
        if (error) throw error;
        toast.success("Event updated");
      } else {
        const { error } = await supabase.from("events").insert(payload);
        if (error) throw error;
        toast.success("Event created");
      }
      navigate({ to: "/host" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the event");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={save}>
      <div className="space-y-2">
        <Label htmlFor="title">Event title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Sunrise game drive in the Maasai Mara"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          placeholder="What will viewers see? Who is guiding them?"
        />
      </div>

      <div className="space-y-4">
        <ProvinceSelector
          value={provinceId}
          onChange={(id) => {
            setProvinceId(id);
            setDestinationId(undefined);
          }}
        />
        <DestinationSelector
          provinceId={provinceId}
          value={destinationId}
          onChange={setDestinationId}
        />
        <CategorySelector value={categoryId} onChange={setCategoryId} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="scheduledAt">Starts at</Label>
          <Input
            id="scheduledAt"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration">Expected duration (minutes)</Label>
          <Input
            id="duration"
            type="number"
            min="10"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label>Event type</Label>
          <RadioGroup
            value={eventType}
            onValueChange={(value) => setEventType(value as BukaEvent["event_type"])}
            className="grid gap-3 sm:grid-cols-2"
          >
            <label
              htmlFor="event-type-ticketed"
              className="flex cursor-pointer items-start gap-3 rounded-lg border p-3"
            >
              <RadioGroupItem id="event-type-ticketed" value="ticketed" className="mt-0.5" />
              <span className="text-sm">Ticketed (viewers pay per ticket)</span>
            </label>
            <label
              htmlFor="event-type-free-ad-slot"
              className="flex cursor-pointer items-start gap-3 rounded-lg border p-3"
            >
              <RadioGroupItem
                id="event-type-free-ad-slot"
                value="free_ad_slot"
                className="mt-0.5"
              />
              <span className="text-sm">Free (I pay for visibility)</span>
            </label>
          </RadioGroup>
        </div>

        {eventType === "ticketed" ? (
          <div className="space-y-2">
            <Label htmlFor="price">Price to view (ZAR)</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                R
              </span>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="pl-7"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Visibility slot</Label>
            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-sm">R300 for a 30-minute slot, up to 25-30 viewers</p>
              <Button type="button" variant="outline" disabled>
                Pay for this slot
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="cover">Cover image</Label>
          <div className="flex items-center gap-3">
            <CoverImage
              path={coverPath}
              alt="Event cover preview"
              className="h-16 w-24 rounded-lg"
            />
            <Button type="button" variant="outline" asChild disabled={uploading}>
              <label className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" aria-hidden />
                {uploading ? "Uploading…" : "Upload"}
                <input
                  id="cover"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadCover(file);
                  }}
                />
              </label>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3">
        <div>
          <p className="font-medium">Published</p>
          <p className="text-sm text-muted-foreground">
            Published events appear in browse and can be purchased.
          </p>
        </div>
        <Switch checked={published} onCheckedChange={setPublished} aria-label="Publish event" />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : event ? "Save changes" : "Create event"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => navigate({ to: "/host" })}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
