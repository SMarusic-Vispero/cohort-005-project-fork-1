import { Link } from "react-router";
import { LandingActions } from "./landing-actions";

export function LandingClosing({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-20">
      <div className="flex flex-col gap-8 rounded-2xl bg-primary/5 px-8 py-12 ring-1 ring-border lg:flex-row lg:items-center lg:justify-between lg:px-12">
        <div className="max-w-xl">
          <h2 className="text-3xl font-bold tracking-tight">
            Start your next course today
          </h2>
          <p className="mt-3 text-muted-foreground">
            Pick a course, work through it lesson by lesson, and keep your
            progress wherever you left it.
          </p>
        </div>
        <LandingActions signedIn={signedIn} />
      </div>
    </section>
  );
}

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
