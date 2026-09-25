import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Flag, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { categoryLabel, formatPrice, formatWhen, type BukaEvent } from "@/lib/buka";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — BukaLive" },
      {
        name: "description",
        content: "Moderate BukaLive hosts and events, approve applications and review platform activity.",
      },
      { property: "og:title", content: "Admin — BukaLive" },
      { property: "og:description", content: "Moderation and oversight for the BukaLive marketplace." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type ProfileRow = {
  id: string;
  full_name: string;
  email: string | null;
  host_status: "none" | "pending" | "approved" | "rejected";
  host_bio: string | null;
  host_applied_at: string | null;
};

function AdminPage() {
  const { isAdmin, loading, user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profiles, isLoading: profilesLoading } = useQuery({
    queryKey: ["admin-profiles"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, host_status, host_bio, host_applied_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProfileRow[];
    },
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["admin-events"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BukaEvent[];
    },
  });

  const decideHost = async (profile: ProfileRow, approve: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ host_status: approve ? "approved" : "rejected" })
      .eq("id", profile.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (approve) {
      await supabase.from("user_roles").insert({ user_id: profile.id, role: "host" });
    }
    toast.success(approve ? "Host approved" : "Application rejected");
    queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
  };

  const toggleFlag = async (event: BukaEvent) => {
    const { error } = await supabase
      .from("events")
      .update({ is_flagged: !event.is_flagged })
      .eq("id", event.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(event.is_flagged ? "Flag removed" : "Event flagged and hidden");
    queryClient.invalidateQueries({ queryKey: ["admin-events"] });
  };

  const removeEvent = async (event: BukaEvent) => {
    const { error } = await supabase.from("events").delete().eq("id", event.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Event removed");
    queryClient.invalidateQueries({ queryKey: ["admin-events"] });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl">Admins only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {user ? "Your account doesn't have moderation access." : "Sign in with an admin account."}
        </p>
        <Button className="mt-5" asChild>
          <Link to={user ? "/browse" : "/auth"}>{user ? "Browse events" : "Sign in"}</Link>
        </Button>
      </div>
    );
  }

  const allProfiles = profiles ?? [];
  const pending = allProfiles.filter((p) => p.host_status === "pending");
  const allEvents = events ?? [];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="font-display text-3xl">Admin</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Moderate hosts and events across BukaLive.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        {[
          { label: "People", value: String(allProfiles.length) },
          { label: "Pending hosts", value: String(pending.length) },
          { label: "Events", value: String(allEvents.length) },
          { label: "Flagged", value: String(allEvents.filter((e) => e.is_flagged).length) },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="font-display text-2xl">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="hosts" className="mt-10">
        <TabsList>
          <TabsTrigger value="hosts">Host applications</TabsTrigger>
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        <TabsContent value="hosts" className="mt-6 space-y-3">
          {profilesLoading ? (
            <Skeleton className="h-24 rounded-2xl" />
          ) : pending.length === 0 ? (
            <p className="rounded-2xl bg-muted px-6 py-10 text-center text-sm text-muted-foreground">
              No applications waiting for review.
            </p>
          ) : (
            pending.map((profile) => (
              <div key={profile.id} className="rounded-2xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg">{profile.full_name || "Unnamed host"}</p>
                    <p className="text-sm text-muted-foreground">{profile.email}</p>
                    {profile.host_applied_at && (
                      <p className="text-xs text-muted-foreground">
                        Applied {new Date(profile.host_applied_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => decideHost(profile, true)}>
                      <Check className="mr-2 h-4 w-4" aria-hidden /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => decideHost(profile, false)}>
                      <X className="mr-2 h-4 w-4" aria-hidden /> Reject
                    </Button>
                  </div>
                </div>
                {profile.host_bio && (
                  <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
                    {profile.host_bio}
                  </p>
                )}
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="people" className="mt-6 space-y-2">
          {allProfiles.map((profile) => (
            <div
              key={profile.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-4 py-3"
            >
              <div>
                <p className="font-medium">{profile.full_name || "Unnamed"}</p>
                <p className="text-xs text-muted-foreground">{profile.email}</p>
              </div>
              <Badge variant={profile.host_status === "approved" ? "default" : "secondary"}>
                {profile.host_status === "none" ? "viewer" : `host: ${profile.host_status}`}
              </Badge>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="events" className="mt-6 space-y-2">
          {eventsLoading ? (
            <Skeleton className="h-24 rounded-2xl" />
          ) : allEvents.length === 0 ? (
            <p className="rounded-2xl bg-muted px-6 py-10 text-center text-sm text-muted-foreground">
              No events on the platform yet.
            </p>
          ) : (
            allEvents.map((event) => (
              <div
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{event.title}</p>
                    <Badge variant="secondary">{categoryLabel(event.category)}</Badge>
                    {event.is_flagged && <Badge variant="destructive">Flagged</Badge>}
                    {!event.is_published && <Badge variant="outline">Unpublished</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatWhen(event.scheduled_at)} · {formatPrice(event.price_cents, event.currency)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => toggleFlag(event)}>
                    <Flag className="mr-2 h-4 w-4" aria-hidden />
                    {event.is_flagged ? "Unflag" : "Flag"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => removeEvent(event)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden /> Remove
                  </Button>
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
