import { createFileRoute, Link } from "@tanstack/react-router";

import { EventForm } from "@/components/EventForm";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/host/events/new")({
  head: () => ({
    meta: [
      { title: "Create an event — BukaLive" },
      {
        name: "description",
        content:
          "Schedule a new live broadcast, set your price and publish it to BukaLive viewers.",
      },
      { property: "og:title", content: "Create an event — BukaLive" },
      { property: "og:description", content: "Schedule and price your next live broadcast." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewEvent,
});

function NewEvent() {
  const { profile, loading } = useAuth();

  if (!loading && profile?.host_status !== "approved") {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl">Host approval required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Only approved hosts can create broadcasts.
        </p>
        <Button className="mt-5" asChild>
          <Link to="/host/apply">Apply to host</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="font-display text-3xl">Create a live event</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Viewers see this listing in browse once you publish it.
      </p>
      <div className="mt-8">
        <EventForm />
      </div>
    </div>
  );
}
