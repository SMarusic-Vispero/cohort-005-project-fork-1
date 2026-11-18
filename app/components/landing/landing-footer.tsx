import { Link } from "react-router";

export function LandingFooter({ signedIn }: { signedIn: boolean }) {
  const linkClass = "transition-colors hover:text-foreground";
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-foreground">Cadence</p>
          <p className="mt-1">Learn to code, at your own pace.</p>
        </div>
        <nav className="flex gap-6">
          <Link to="/courses" className={linkClass}>
            Courses
          </Link>
          {signedIn ? (
            <Link to="/dashboard" className={linkClass}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className={linkClass}>
                Log In
              </Link>
              <Link to="/signup" className={linkClass}>
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </div>
    </footer>
  );
}
