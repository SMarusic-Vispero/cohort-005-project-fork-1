import { Link } from "react-router";
import { BookOpen, User } from "lucide-react";
import { CourseImage } from "~/components/course-image";
import { LandingActions } from "./landing-actions";
import type { LandingCourse } from "./featured-courses";

export function LandingHero({
  signedIn,
  catalogSummary,
  spotlight,
}: {
  signedIn: boolean;
  catalogSummary: string | null;
  spotlight: LandingCourse | undefined;
}) {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:py-28">
      <div>
        <p className="mb-6 inline-flex items-center rounded-full border border-border px-3 py-1 text-sm font-medium text-muted-foreground">
          Self-paced courses for developers
        </p>
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Learn to code,
          <br />
          <span className="text-muted-foreground">at your own pace</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Structured courses built by experienced instructors. Track your
          progress, take quizzes, and build real-world skills.
        </p>
        <div className="mt-10">
          <LandingActions signedIn={signedIn} />
        </div>
        {catalogSummary && (
          <p className="mt-6 text-sm text-muted-foreground">{catalogSummary}</p>
        )}
      </div>
      {spotlight && <Spotlight course={spotlight} />}
    </section>
  );
}

function Spotlight({ course }: { course: LandingCourse }) {
  return (
    <Link
      to={`/courses/${course.slug}`}
      className="group relative hidden lg:block"
    >
      <div className="absolute inset-0 translate-x-4 translate-y-4 rounded-xl border border-border bg-muted" />
      <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-lg transition-shadow group-hover:shadow-xl">
        <CourseImage
          src={course.coverImageUrl}
          alt={course.title}
          className="aspect-video w-full object-cover"
        />
        <div className="p-6">
          <p className="text-xs font-medium tracking-wide text-primary uppercase">
            Newest course · {course.categoryName}
          </p>
          <h2 className="mt-2 text-xl font-semibold leading-snug group-hover:text-primary">
            {course.title}
          </h2>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {course.description}
          </p>
          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="size-3" />
              {course.instructorName}
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="size-3" />
              {course.lessonCount} lessons
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
