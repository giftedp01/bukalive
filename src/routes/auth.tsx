import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";

type AuthSearch = { mode?: "signin" | "signup" | undefined };

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    mode: search["mode"] === "signup" ? "signup" : search["mode"] === "signin" ? "signin" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in or join BukaLive" },
      {
        name: "description",
        content:
          "Create a BukaLive account to buy access to live broadcasts, or apply as a host to stream your own events.",
      },
      { property: "og:title", content: "Sign in or join BukaLive" },
      {
        property: "og:description",
        content: "Watch live moments or host your own — join BukaLive in a minute.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [intendedRole, setIntendedRole] = useState<"viewer" | "host">("viewer");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, intended_role: intendedRole },
          },
        });
        if (error) throw error;
        toast.success("Account created — check your email to confirm, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back to BukaLive");
        navigate({ to: "/" });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const googleSignIn = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 py-14">
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="font-display text-2xl">
            {mode === "signup" ? "Join BukaLive" : "Welcome back"}
          </CardTitle>
          <CardDescription>
            {mode === "signup"
              ? "Watch live moments from anywhere — or host your own."
              : "Sign in to reach your tickets and dashboard."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Button variant="outline" className="w-full" onClick={googleSignIn} type="button">
            Continue with Google
          </Button>

          <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          <form className="space-y-4" onSubmit={submit}>
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Amara Mwangi"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>

            {mode === "signup" && (
              <div className="space-y-2">
                <Label>I'm joining as</Label>
                <RadioGroup
                  value={intendedRole}
                  onValueChange={(value) => setIntendedRole(value as "viewer" | "host")}
                  className="grid grid-cols-2 gap-2"
                >
                  <label className="flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm">
                    <RadioGroupItem value="viewer" className="mt-0.5" />
                    <span>
                      <span className="block font-medium">Viewer</span>
                      <span className="text-muted-foreground">Watch live events</span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm">
                    <RadioGroupItem value="host" className="mt-0.5" />
                    <span>
                      <span className="block font-medium">Host</span>
                      <span className="text-muted-foreground">Broadcast my events</span>
                    </span>
                  </label>
                </RadioGroup>
                {intendedRole === "host" && (
                  <p className="text-xs text-muted-foreground">
                    Hosts complete a short application before publishing events.
                  </p>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {mode === "signup" ? "Already have an account?" : "New to BukaLive?"}{" "}
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            >
              {mode === "signup" ? "Sign in" : "Create one"}
            </button>
          </p>
          <p className="text-center text-xs text-muted-foreground">
            <Link to="/browse" className="hover:underline">
              Browse events without an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
