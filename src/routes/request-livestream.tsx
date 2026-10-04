import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Radio, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/request-livestream")({
  head: () => ({
    meta: [
      { title: "Ask for a Livestream — BukaLive" },
      {
        name: "description",
        content: "Tell BukaLive where you want to go live and what you want to experience.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RequestLivestreamPage,
});

function RequestLivestreamPage() {
  const { user, loading } = useAuth();
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState<"drone" | "360" | "either">("either");
  const [preferredDate, setPreferredDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("livestream_requests").insert({
        requester_id: user.id,
        location: location.trim(),
        description: description.trim(),
        format,
        preferred_date: preferredDate || null,
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success("Livestream request sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send your request");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="mx-auto max-w-xl px-4 py-16" />;

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <Radio className="mx-auto h-10 w-10 text-primary" aria-hidden />
        <h1 className="mt-4 font-display text-3xl">Ask for a Livestream</h1>
        <p className="mt-2 text-muted-foreground">
          Sign in to tell us which place or moment you’d love to experience live.
        </p>
        <Button className="mt-6" asChild>
          <Link to="/auth">Sign in to make a request</Link>
        </Button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <Radio className="mx-auto h-10 w-10 text-primary" aria-hidden />
        <h1 className="mt-4 font-display text-3xl">Request received!</h1>
        <p className="mt-2 text-muted-foreground">
          We’ll use your idea to help bring more of the world to BukaLive.
        </p>
        <Button className="mt-6" asChild>
          <Link to="/browse">Explore live experiences</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="font-display text-3xl">Ask for a Livestream</CardTitle>
          <CardDescription>
            Pick a place you’d love to see and tell us what should come alive on camera.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="request-location">Where should we go?</Label>
              <Input
                id="request-location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="A place, city, landmark or event"
                minLength={2}
                maxLength={160}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-description">What would you love to experience?</Label>
              <Textarea
                id="request-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="A sunrise over the dunes, a festival from the front row, a reef dive…"
                minLength={10}
                maxLength={1500}
                rows={5}
                required
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="request-format">Preferred camera view</Label>
                <select
                  id="request-format"
                  value={format}
                  onChange={(event) => setFormat(event.target.value as typeof format)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="either">Surprise me</option>
                  <option value="drone">Drone</option>
                  <option value="360">360° camera</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="request-date">When? (optional)</Label>
                <Input
                  id="request-date"
                  type="date"
                  value={preferredDate}
                  onChange={(event) => setPreferredDate(event.target.value)}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              <Send className="mr-2 h-4 w-4" aria-hidden />
              {submitting ? "Sending request…" : "Send livestream request"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
