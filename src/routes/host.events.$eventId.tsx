import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { EventForm } from "@/components/EventForm";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { BukaEvent } from "@/lib/buka";

export const Route = createFileRoute("/host/events/$eventId")({
  head: () => ({
    meta: [
      { title: "Edit event — BukaLive" },
      {
        name: "description",
        content: "Update the details, price, schedule or publish state of your BukaLive broadcast.",
      },
      { property: "og:title", content: "Edit event — BukaLive" },
      { property: "og:description", content: "Update your BukaLive broadcast details." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EditEvent,
});

function EditEvent() {
  const { eventId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const { data: event, isLoading } = useQuery({
    queryKey: ["host-event", eventId],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
      if (error) throw error;
      return (data as BukaEvent | null) ?? null;
    },
  });

  const remove = async () => {
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Event deleted");
    navigate({ to: "/host" });
  };

  if (loading || isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (!event || event.host_id !== user?.id) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl">Event not found</h1>
        <Button className="mt-5" asChild>
          <Link to="/host">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Edit event</h1>
        <Button variant="ghost" className="text-destructive" onClick={remove}>
          <Trash2 className="mr-2 h-4 w-4" aria-hidden /> Delete
        </Button>
      </div>
      <div className="mt-8">
        <EventForm event={event} />
      </div>
    </div>
  );
}
