import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Flag, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { countryName } from "@/data/countries";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { BUSINESS_TYPES, type VerificationStatus } from "@/lib/destinations";
import { categoryLabel, formatEventWhen, formatPrice, type BukaEvent } from "@/lib/buka";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — BukaLive" },
      {
        name: "description",
        content:
          "Moderate BukaLive hosts and events, approve applications and review platform activity.",
      },
      { property: "og:title", content: "Admin — BukaLive" },
      {
        property: "og:description",
        content: "Moderation and oversight for the BukaLive marketplace.",
      },
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

type ReportRow = {
  id: string;
  reporter_id: string;
  item_type: "experience" | "chat_message" | "user" | "business";
  item_id: string;
  reason: string;
  details: string;
  status: "open" | "reviewed" | "actioned" | "dismissed";
  created_at: string;
  reporter: { full_name: string | null; email: string | null } | null;
};

type BusinessRow = {
  id: string;
  slug: string;
  name: string;
  business_type: string;
  country_id: string;
  city: string;
  destination_slug: string | null;
  verification_status: VerificationStatus;
  is_sample: boolean;
};

type AnalyticsRow = {
  event_id: string;
  kind: string;
  created_at: string;
};

type LivestreamRequestRow = {
  id: string;
  requester_id: string;
  location: string;
  description: string;
  format: "drone" | "360" | "either";
  preferred_date: string | null;
  requested_budget_cents: number;
  approved_budget_cents: number | null;
  rejection_reason: string | null;
  payment_status: "pending" | "paid";
  status: "new" | "reviewing" | "approved" | "rejected" | "scheduled" | "closed" | "canceled";
  created_at: string;
  requester: { full_name: string | null; email: string | null } | null;
};

const VERIFICATION_OPTIONS: { value: VerificationStatus; label: string }[] = [
  { value: "none", label: "Not verified" },
  { value: "pending", label: "Pending review" },
  { value: "verified_business", label: "Verified tourism business" },
  { value: "verified_guide", label: "Verified guide / operator" },
  { value: "verified_attraction", label: "Verified attraction" },
  { value: "tourism_organisation", label: "Tourism organisation" },
];

function AdminPage() {
  const { isAdmin, loading, user } = useAuth();
  const queryClient = useQueryClient();
  const [approvedBudgets, setApprovedBudgets] = useState<Record<string, string>>({});
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});

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

  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ["admin-reports"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select(
          "id, reporter_id, item_type, item_id, reason, details, status, created_at, reporter:profiles(full_name, email)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReportRow[];
    },
  });

  const { data: livestreamRequests, isLoading: livestreamRequestsLoading } = useQuery({
    queryKey: ["admin-livestream-requests"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("livestream_requests")
        .select("*, requester:profiles(full_name, email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LivestreamRequestRow[];
    },
  });

  const { data: businesses, isLoading: businessesLoading } = useQuery({
    queryKey: ["admin-businesses"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select(
          "id, slug, name, business_type, country_id, city, destination_slug, verification_status, is_sample",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BusinessRow[];
    },
  });

  const { data: engagementRows, isLoading: analyticsLoading } = useQuery({
    queryKey: ["admin-analytics"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analytics_events")
        .select("event_id, kind, created_at");
      if (error) throw error;
      return (data ?? []) as AnalyticsRow[];
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

  const setVerification = async (business: BusinessRow, status: VerificationStatus) => {
    const { error } = await supabase
      .from("businesses")
      .update({ verification_status: status })
      .eq("id", business.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${business.name} verification updated`);
    queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
    queryClient.invalidateQueries({ queryKey: ["business", business.slug] });
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

  const updateReport = async (report: ReportRow, status: ReportRow["status"]) => {
    const { error } = await supabase.from("reports").update({ status }).eq("id", report.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Report marked as ${status}`);
    queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
  };

  const updateLivestreamRequest = async (
    request: LivestreamRequestRow,
    status: "new" | "reviewing" | "scheduled" | "closed",
  ) => {
    if (status === "scheduled" && request.payment_status !== "paid") {
      toast.error("The requester must pay the approved budget before scheduling");
      return;
    }
    const { error } = await supabase
      .from("livestream_requests")
      .update({ status })
      .eq("id", request.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Livestream request marked ${status}`);
    queryClient.invalidateQueries({ queryKey: ["admin-livestream-requests"] });
  };

  const approveLivestreamRequest = async (request: LivestreamRequestRow) => {
    const budget = Number(
      approvedBudgets[request.id] ??
        ((request.approved_budget_cents ?? request.requested_budget_cents) / 100).toFixed(2),
    );
    const approvedBudgetCents = Math.round(budget * 100);
    if (!Number.isSafeInteger(approvedBudgetCents) || approvedBudgetCents < 1) {
      toast.error("Enter an approved budget greater than zero");
      return;
    }

    const { error } = await supabase
      .from("livestream_requests")
      .update({
        status: "approved",
        approved_budget_cents: approvedBudgetCents,
        rejection_reason: null,
        payment_status: "pending",
        paid_at: null,
      })
      .eq("id", request.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Livestream request approved");
    queryClient.invalidateQueries({ queryKey: ["admin-livestream-requests"] });
  };

  const rejectLivestreamRequest = async (request: LivestreamRequestRow) => {
    const reason = (rejectionReasons[request.id] ?? "").trim();
    if (!reason) {
      toast.error("Add a reason before rejecting this request");
      return;
    }
    const { error } = await supabase
      .from("livestream_requests")
      .update({ status: "rejected", rejection_reason: reason })
      .eq("id", request.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Livestream request rejected with feedback");
    queryClient.invalidateQueries({ queryKey: ["admin-livestream-requests"] });
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
  const allBusinesses = businesses ?? [];
  const analyticsRows = engagementRows ?? [];
  const kindCount = (kind: string) => analyticsRows.filter((row) => row.kind === kind).length;
  const viewsByEvent = new Map<string, number>();
  for (const row of analyticsRows) {
    if (row.kind !== "view") continue;
    viewsByEvent.set(row.event_id, (viewsByEvent.get(row.event_id) ?? 0) + 1);
  }
  const topEvents = [...viewsByEvent.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, views]) => ({ event: allEvents.find((e) => e.id === id), views }))
    .filter((entry): entry is { event: BukaEvent; views: number } => !!entry.event);
  const days = Array.from({ length: 14 }, (_, i) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (13 - i));
    return day;
  });
  const dailyViews = days.map((day) => {
    const next = new Date(day);
    next.setDate(day.getDate() + 1);
    return analyticsRows.filter(
      (row) =>
        row.kind === "view" && new Date(row.created_at) >= day && new Date(row.created_at) < next,
    ).length;
  });
  const maxDailyViews = Math.max(1, ...dailyViews);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="font-display text-3xl">Admin</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Moderate hosts and events across BukaLive.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "People", value: String(allProfiles.length) },
          { label: "Pending hosts", value: String(pending.length) },
          { label: "Events", value: String(allEvents.length) },
          { label: "Flagged", value: String(allEvents.filter((e) => e.is_flagged).length) },
          { label: "Livestream requests", value: String(livestreamRequests?.length ?? 0) },
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
          <TabsTrigger value="businesses">Businesses</TabsTrigger>
          <TabsTrigger value="livestream-requests">Livestream requests</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="analytics">Platform analytics</TabsTrigger>
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
                    <Badge variant="secondary">
                      {categoryLabel(event.category_id ?? event.category)}
                    </Badge>
                    {event.is_flagged && <Badge variant="destructive">Flagged</Badge>}
                    {!event.is_published && <Badge variant="outline">Unpublished</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatEventWhen(event)} ·{" "}
                    {formatPrice(event.price_cents, event.currency)}
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

        <TabsContent value="livestream-requests" className="mt-6 space-y-3">
          {livestreamRequestsLoading ? (
            <Skeleton className="h-24 rounded-2xl" />
          ) : !livestreamRequests || livestreamRequests.length === 0 ? (
            <p className="rounded-2xl bg-muted px-6 py-10 text-center text-sm text-muted-foreground">
              No livestream requests yet.
            </p>
          ) : (
            livestreamRequests.map((request) => (
              <div key={request.id} className="rounded-2xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-lg">{request.location}</p>
                      <Badge
                        variant={
                          request.status === "rejected"
                            ? "destructive"
                            : request.status === "new"
                              ? "default"
                              : "secondary"
                        }
                      >
                        {request.status}
                      </Badge>
                      <Badge variant="outline">
                        {request.format === "360"
                          ? "360°"
                          : request.format === "drone"
                            ? "Drone"
                            : "Either camera"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Requested by{" "}
                      {request.requester?.full_name || request.requester?.email || "unknown"} ·{" "}
                      {new Date(request.created_at).toLocaleDateString()}
                      {request.preferred_date &&
                        ` · Preferred date ${new Date(`${request.preferred_date}T00:00:00`).toLocaleDateString()}`}
                    </p>
                    <p className="mt-1 text-sm">
                      Proposed budget: {formatPrice(request.requested_budget_cents)}
                      {request.approved_budget_cents !== null &&
                        ` · Approved budget: ${formatPrice(request.approved_budget_cents)}`}
                      {request.payment_status === "paid" && " · Paid"}
                    </p>
                  </div>
                  {["new", "reviewing"].includes(request.status) && (
                    <select
                      aria-label={`Update request status for ${request.location}`}
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                      value={request.status}
                      onChange={(event) =>
                        void updateLivestreamRequest(
                          request,
                          event.target.value as "new" | "reviewing",
                        )
                      }
                    >
                      <option value="new">New</option>
                      <option value="reviewing">Reviewing</option>
                    </select>
                  )}
                  {["approved", "scheduled"].includes(request.status) && (
                    <select
                      aria-label={`Update request status for ${request.location}`}
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                      value={request.status}
                      onChange={(event) =>
                        void updateLivestreamRequest(
                          request,
                          event.target.value as "scheduled" | "closed",
                        )
                      }
                    >
                      {request.status === "approved" && <option value="approved">Approved</option>}
                      {request.status === "scheduled" && (
                        <option value="scheduled">Scheduled</option>
                      )}
                      {request.status === "approved" && (
                        <option value="scheduled">Scheduled</option>
                      )}
                      <option value="closed">Closed</option>
                    </select>
                  )}
                </div>
                <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
                  {request.description}
                </p>
                {request.rejection_reason && (
                  <p className="mt-3 rounded-lg bg-destructive/5 p-3 text-sm">
                    <span className="font-medium">Rejection reason: </span>
                    {request.rejection_reason}
                  </p>
                )}
                {["new", "reviewing"].includes(request.status) && (
                  <div className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`approved-budget-${request.id}`}>Agreed budget (ZAR)</Label>
                      <Input
                        id={`approved-budget-${request.id}`}
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={
                          approvedBudgets[request.id] ??
                          (
                            (request.approved_budget_cents ?? request.requested_budget_cents) / 100
                          ).toFixed(2)
                        }
                        onChange={(event) =>
                          setApprovedBudgets((current) => ({
                            ...current,
                            [request.id]: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`rejection-reason-${request.id}`}>Reason if rejecting</Label>
                      <Textarea
                        id={`rejection-reason-${request.id}`}
                        value={rejectionReasons[request.id] ?? ""}
                        onChange={(event) =>
                          setRejectionReasons((current) => ({
                            ...current,
                            [request.id]: event.target.value,
                          }))
                        }
                        placeholder="Explain why the request cannot be approved"
                        maxLength={1000}
                        rows={2}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 sm:col-span-2">
                      <Button size="sm" onClick={() => void approveLivestreamRequest(request)}>
                        <Check className="mr-2 h-4 w-4" aria-hidden /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void rejectLivestreamRequest(request)}
                      >
                        <X className="mr-2 h-4 w-4" aria-hidden /> Reject with reason
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="reports" className="mt-6 space-y-3">
          {reportsLoading ? (
            <Skeleton className="h-24 rounded-2xl" />
          ) : !reports || reports.length === 0 ? (
            <p className="rounded-2xl bg-muted px-6 py-10 text-center text-sm text-muted-foreground">
              No reports submitted yet.
            </p>
          ) : (
            reports.map((report) => (
              <div key={report.id} className="rounded-2xl border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {report.reason} · {report.item_type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Reported by{" "}
                      {report.reporter?.full_name || report.reporter?.email || "unknown"} ·{" "}
                      {new Date(report.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={report.status === "open" ? "destructive" : "secondary"}>
                    {report.status}
                  </Badge>
                </div>

                <p className="mt-3 text-sm text-muted-foreground">Item: {report.item_id}</p>
                {report.details && (
                  <p className="mt-2 whitespace-pre-line text-sm">{report.details}</p>
                )}

                {report.status !== "dismissed" && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => updateReport(report, "reviewed")}>
                      Mark reviewed
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateReport(report, "dismissed")}
                    >
                      Dismiss
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => updateReport(report, "actioned")}
                    >
                      Actioned
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="businesses" className="mt-6 space-y-2">
          {businessesLoading ? (
            <Skeleton className="h-24 rounded-2xl" />
          ) : allBusinesses.length === 0 ? (
            <p className="rounded-2xl bg-muted px-6 py-10 text-center text-sm text-muted-foreground">
              No tourism businesses yet.
            </p>
          ) : (
            allBusinesses.map((business) => (
              <div
                key={business.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to="/businesses/$slug"
                      params={{ slug: business.slug }}
                      className="font-medium hover:underline"
                    >
                      {business.name}
                    </Link>
                    <Badge variant="secondary">
                      {BUSINESS_TYPES[business.business_type] ?? business.business_type}
                    </Badge>
                    {business.is_sample && <Badge variant="outline">Sample</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {business.city}, {countryName(business.country_id)}
                    {business.destination_slug ? ` · ${business.destination_slug}` : ""}
                  </p>
                </div>
                <select
                  aria-label={`Verification status for ${business.name}`}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={business.verification_status}
                  onChange={(event) =>
                    void setVerification(business, event.target.value as VerificationStatus)
                  }
                >
                  {VERIFICATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-6 space-y-6">
          {analyticsLoading ? (
            <Skeleton className="h-40 rounded-2xl" />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  { label: "Total views", value: String(kindCount("view")) },
                  { label: "Saves", value: String(kindCount("save")) },
                  { label: "Shares", value: String(kindCount("share")) },
                  { label: "Booking clicks", value: String(kindCount("booking_click")) },
                  { label: "Go There clicks", value: String(kindCount("go_there")) },
                ].map((stat) => (
                  <Card key={stat.label}>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="font-display text-2xl">{stat.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div>
                <p className="font-display text-lg">Views in the last 14 days</p>
                <div className="mt-3 flex h-32 items-end gap-1.5">
                  {dailyViews.map((views, index) => (
                    <div key={index} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t bg-primary/80"
                        style={{ height: `${Math.max(2, (views / maxDailyViews) * 100)}%` }}
                        title={`${days[index].toLocaleDateString()}: ${views} views`}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {days[index].getDate()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-display text-lg">Most viewed experiences</p>
                {topEvents.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No views recorded yet.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {topEvents.map(({ event, views }) => (
                      <li
                        key={event.id}
                        className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-sm"
                      >
                        <Link
                          to="/events/$eventId"
                          params={{ eventId: event.id }}
                          className="truncate hover:underline"
                        >
                          {event.title}
                        </Link>
                        <span className="shrink-0 text-muted-foreground">{views} views</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
