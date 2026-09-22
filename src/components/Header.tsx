import { Link, useNavigate } from "@tanstack/react-router";
import { Globe, LayoutDashboard, LogOut, Shield, Ticket, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";

export function Header() {
  const { user, profile, isAdmin, isHost, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-sunset text-primary-foreground">
            <Globe className="h-5 w-5" aria-hidden />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">
            Buka<span className="text-primary">Live</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Button variant="ghost" asChild>
            <Link to="/browse">Browse</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/browse" search={{ when: "live" }}>
              Live now
            </Link>
          </Button>
          {user && (
            <Button variant="ghost" asChild>
              <Link to="/tickets">My tickets</Link>
            </Button>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {!user ? (
            <>
              <Button variant="ghost" asChild className="hidden sm:inline-flex">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild>
                <Link to="/auth" search={{ mode: "signup" }}>
                  Get started
                </Link>
              </Button>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" className="gap-2">
                  <User className="h-4 w-4" aria-hidden />
                  <span className="hidden max-w-28 truncate sm:inline">
                    {profile?.full_name || user.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/tickets" })}>
                  <Ticket className="mr-2 h-4 w-4" aria-hidden /> My tickets
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: isHost ? "/host" : "/host/apply" })}>
                  <LayoutDashboard className="mr-2 h-4 w-4" aria-hidden />
                  {isHost ? "Host dashboard" : "Become a host"}
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate({ to: "/admin" })}>
                    <Shield className="mr-2 h-4 w-4" aria-hidden /> Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await signOut();
                    navigate({ to: "/" });
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" aria-hidden /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
