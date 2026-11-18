import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "~/components/ui/button";

export function LandingActions({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button asChild size="lg">
        <Link to="/courses">
          Browse Courses
          <ArrowRight className="ml-2 size-4" />
        </Link>
      </Button>
      <Button asChild size="lg" variant="outline">
        {signedIn ? (
          <Link to="/dashboard">Go to your dashboard</Link>
        ) : (
          <Link to="/signup">Create a free account</Link>
        )}
      </Button>
    </div>
  );
}
