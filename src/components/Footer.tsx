import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="mt-20 border-t bg-warm">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <p className="font-display text-lg font-semibold">
            Buka<span className="text-primary">Live</span>
          </p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Seeing the world's moments live, wherever you are. From BukaEarth's satellite view to
            human experiences on the ground.
          </p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium">Explore</p>
          <Link to="/browse" className="block text-muted-foreground hover:text-foreground">
            Browse events
          </Link>
          <Link to="/tickets" className="block text-muted-foreground hover:text-foreground">
            My tickets
          </Link>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium">Hosting</p>
          <Link to="/host/apply" className="block text-muted-foreground hover:text-foreground">
            Become a host
          </Link>
          <Link to="/host" className="block text-muted-foreground hover:text-foreground">
            Host dashboard
          </Link>
        </div>
      </div>
      <div className="border-t px-4 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} BukaLive. Part of the Buka family.
      </div>
    </footer>
  );
}
