import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CoverImage } from "@/components/CoverImage";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, type BukaEvent, type CategoryValue } from "@/lib/buka";
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
  const [category, setCategory] = useState<CategoryValue>((event?.category as CategoryValue) ?? "safari");
  const [location, setLocation] = useState(event?.location ?? "");
  const [scheduledAt, setScheduledAt] = useState(
    event ? toLocalInput(event.scheduled_at) : toLocalInput(new Date(Date.now() + 86_400_000).toISOString()),
  );
  const [duration, setDuration] = useState(String(event?.duration_minutes ?? 90));
  const [price, setPrice] = useState(((event?.price_cents ?? 0) / 100).toFixed(2));
  const [coverPath, setCoverPath] = useState<string | null>(event?.cover_image_url ?? null);
  const [published, setPublished] = useState(event?.is_published ?? false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

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
    setSaving(true);
    try {
      const payload = {
        host_id: user.id,
        title,
        description,
        category,
        location,
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration_minutes: Number(duration) || 60,
        price_cents: Math.round(Number(price) * 100) || 0,
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select value={category} onValueChange={(value) => setCategory(value as CategoryValue)}>
            <SelectTrigger id="category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Location / destination</Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Maasai Mara, Kenya"
          />
        </div>
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
        <div className="space-y-2">
          <Label htmlFor="price">Price to view (USD)</Label>
          <Input
            id="price"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Set 0 to make the broadcast free.</p>
        </div>
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
