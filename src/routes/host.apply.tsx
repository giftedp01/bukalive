import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/host/apply")({
  head: () => ({
    meta: [
      { title: "Become a BukaLive host" },
      {
        name: "description",
        content:
          "Apply to broadcast your safaris, festivals, weddings or sporting events on BukaLive and earn from every viewer.",
      },
      { property: "og:title", content: "Become a BukaLive host" },
      {
        property: "og:description",
        content: "Stream your events to a paying global audience with BukaLive.",
      },
    ],
  }),
  component: HostApply,
});

function HostApply() {
  const { user, profile, refresh, loading } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [hostBio, setHostBio] = useState(profile?.host_bio ?? "");
  const [busy, setBusy] = useState(false);

  if (!loading && !user) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl">Create an account to host</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Hosting starts with a BukaLive account, then a short application.
        </p>
        <Button className="mt-5" asChild>
          <Link to="/auth" search={{ mode: "signup" }}>
            Get started
          </Link>
        </Button>
      </div>
    );
  }

  const status = profile?.host_status ?? "none";

  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          host_bio: hostBio,
          host_status: "pending",
          host_applied_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (error) throw error;
      refresh();
      toast.success("Application submitted — we'll review it shortly.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit application");
    } finally {
      setBusy(false);
    }
  };

  if (status === "approved") {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-16 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-primary" aria-hidden />
        <h1 className="mt-4 font-display text-2xl">You're an approved host</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create your first broadcast and start selling access.
        </p>
        <Button className="mt-6" onClick={() => navigate({ to: "/host" })}>
          Go to host dashboard
        </Button>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-16 text-center">
        <Clock className="mx-auto h-10 w-10 text-primary" aria-hidden />
        <h1 className="mt-4 font-display text-2xl">Application under review</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Our team is checking your details. You'll be able to publish events once approved.
        </p>
        <Button variant="outline" className="mt-6" asChild>
          <Link to="/browse">Browse events meanwhile</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-12">
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Apply to host on BukaLive</CardTitle>
          <CardDescription>
            {status === "rejected"
              ? "Your previous application wasn't approved. You can update your details and reapply."
              : "Tell us who you are and what you plan to broadcast. Approval unlocks event publishing."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={apply}>
            <div className="space-y-2">
              <Label htmlFor="fullName">Your name or business name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hostBio">What will you broadcast?</Label>
              <Textarea
                id="hostBio"
                rows={5}
                value={hostBio}
                onChange={(e) => setHostBio(e.target.value)}
                placeholder="I run guided safaris in the Serengeti and want to stream sunrise game drives…"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Submitting…" : "Submit application"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
