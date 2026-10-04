import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Radio, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { payLivestreamRequest } from "@/lib/livestream.functions";
import { formatPrice } from "@/lib/buka";

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

type LivestreamRequest = {
  id: string;
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
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return fallback;
}

function RequestLivestreamPage() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState<"drone" | "360" | "either">("either");
  const [preferredDate, setPreferredDate] = useState("");
  const [budget, setBudget] = useState("");
  const [editingRequest, setEditingRequest] = useState<LivestreamRequest | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [payingRequestId, setPayingRequestId] = useState<string | null>(null);

  const {
    data: requests = [],
    isLoading: requestsLoading,
    isError: requestsError,
  } = useQuery({
    queryKey: ["my-livestream-requests", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("livestream_requests")
        .select(
          "id, location, description, format, preferred_date, requested_budget_cents, approved_budget_cents, rejection_reason, payment_status, status, created_at",
        )
        .eq("requester_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LivestreamRequest[];
    },
  });

  const resetForm = () => {
    setLocation("");
    setDescription("");
    setFormat("either");
    setPreferredDate("");
    setBudget("");
    setEditingRequest(null);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    const budgetCents = Math.round(Number(budget) * 100);
    if (!Number.isSafeInteger(budgetCents) || budgetCents < 1) {
      toast.error("Enter a budget greater than zero");
      return;
    }

    setSubmitting(true);
    try {
      const requestDetails = {
        location: location.trim(),
        description: description.trim(),
        format,
        preferred_date: preferredDate || null,
        requested_budget_cents: budgetCents,
      };

      const result = editingRequest
        ? await supabase
            .from("livestream_requests")
            .update({
              ...requestDetails,
              ...(editingRequest.status === "rejected" ? { status: "new" } : {}),
            })
            .eq("id", editingRequest.id)
        : await supabase.from("livestream_requests").insert({
            requester_id: user.id,
            ...requestDetails,
          });
      if (result.error) throw result.error;

      toast.success(editingRequest ? "Livestream request updated" : "Livestream request sent");
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["my-livestream-requests", user.id] });
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not save your request"));
    } finally {
      setSubmitting(false);
    }
  };

  const editRequest = (request: LivestreamRequest) => {
    setEditingRequest(request);
    setLocation(request.location);
    setDescription(request.description);
    setFormat(request.format);
    setPreferredDate(request.preferred_date ?? "");
    setBudget((request.requested_budget_cents / 100).toFixed(2));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelRequest = async (request: LivestreamRequest) => {
    if (!window.confirm("Cancel this livestream request?")) return;
    const { error } = await supabase
      .from("livestream_requests")
      .update({ status: "canceled" })
      .eq("id", request.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Livestream request canceled");
    await queryClient.invalidateQueries({ queryKey: ["my-livestream-requests", user?.id] });
  };

  const payForRequest = async (request: LivestreamRequest) => {
    setPayingRequestId(request.id);
    try {
      await payLivestreamRequest({ data: { requestId: request.id } });
      toast.success("Demo payment recorded");
      await queryClient.invalidateQueries({ queryKey: ["my-livestream-requests", user?.id] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not complete payment");
    } finally {
      setPayingRequestId(null);
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

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-12">
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="font-display text-3xl">
            {editingRequest ? "Edit livestream request" : "Ask for a Livestream"}
          </CardTitle>
          <CardDescription>
            Pick a place you’d love to see, describe the experience, and set your budget in ZAR.
            We’ll confirm the final price before you pay.
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

            <div className="space-y-2">
              <Label htmlFor="request-budget">Your budget (ZAR)</Label>
              <Input
                id="request-budget"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
                placeholder="e.g. 500.00"
                required
              />
              <p className="text-xs text-muted-foreground">
                This is your proposed budget. We’ll show you the approved amount before any payment.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" className="flex-1" disabled={submitting}>
                <Send className="mr-2 h-4 w-4" aria-hidden />
                {submitting
                  ? "Saving request…"
                  : editingRequest
                    ? "Save changes"
                    : "Send livestream request"}
              </Button>
              {editingRequest && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Stop editing
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div>
          <h2 className="font-display text-2xl">Your livestream requests</h2>
          <p className="text-sm text-muted-foreground">
            Track decisions, update eligible requests, and pay after approval.
          </p>
        </div>
        {requestsLoading ? (
          <Skeleton className="h-28 rounded-2xl" />
        ) : requestsError ? (
          <p className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">
            Could not load your livestream requests. Please refresh and try again.
          </p>
        ) : requests.length === 0 ? (
          <p className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
            You haven’t sent a livestream request yet.
          </p>
        ) : (
          requests.map((request) => {
            const canEdit = request.status === "new" || request.status === "rejected";
            const canCancel =
              request.payment_status === "pending" &&
              ["new", "reviewing", "approved", "rejected"].includes(request.status);

            return (
              <Card key={request.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display text-lg">{request.location}</h3>
                      <p className="text-xs text-muted-foreground">
                        Sent {new Date(request.created_at).toLocaleDateString()} · Requested budget{" "}
                        {formatPrice(request.requested_budget_cents)}
                      </p>
                    </div>
                    <Badge variant={request.status === "rejected" ? "destructive" : "secondary"}>
                      {request.status}
                    </Badge>
                  </div>
                  <p className="whitespace-pre-line text-sm text-muted-foreground">
                    {request.description}
                  </p>

                  {request.status === "rejected" && request.rejection_reason && (
                    <p className="rounded-lg bg-destructive/5 p-3 text-sm">
                      <span className="font-medium">Why it was declined: </span>
                      {request.rejection_reason}
                    </p>
                  )}

                  {request.status === "approved" && request.approved_budget_cents !== null && (
                    <div className="rounded-lg bg-muted p-3">
                      <p className="text-sm">
                        Approved amount:{" "}
                        <span className="font-semibold">
                          {formatPrice(request.approved_budget_cents)}
                        </span>
                      </p>
                      {request.payment_status === "paid" ? (
                        <Badge className="mt-2">Paid</Badge>
                      ) : (
                        <>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Demo checkout only — no card is charged yet.
                          </p>
                          <Button
                            className="mt-3"
                            size="sm"
                            disabled={payingRequestId === request.id}
                            onClick={() => void payForRequest(request)}
                          >
                            {payingRequestId === request.id
                              ? "Processing…"
                              : `Continue to pay ${formatPrice(request.approved_budget_cents)}`}
                          </Button>
                        </>
                      )}
                    </div>
                  )}

                  {(canEdit || canCancel) && (
                    <div className="flex flex-wrap gap-2">
                      {canEdit && (
                        <Button size="sm" variant="outline" onClick={() => editRequest(request)}>
                          Edit request
                        </Button>
                      )}
                      {canCancel && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => void cancelRequest(request)}
                        >
                          Cancel request
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </section>
    </div>
  );
}
