import type { LucideIcon } from "lucide-react";
import { BookOpen, Clock, ListChecks } from "lucide-react";

const BENEFITS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: BookOpen,
    title: "Built by instructors",
    body: "Every course is split into modules and lessons by someone who teaches the subject.",
  },
  {
    icon: ListChecks,
    title: "Track your progress",
    body: "Mark lessons complete, take quizzes, and pick up where you left off.",
  },
  {
    icon: Clock,
    title: "Learn on your schedule",
    body: "No cohorts and no deadlines. Start a course today and finish it when it suits you.",
  },
];

export function LandingBenefits() {
  return (
    <section className="border-y border-border bg-muted/50 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="max-w-xl text-3xl font-bold tracking-tight">
          Everything you need to finish what you start
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, body }) => (
            <div key={title}>
              <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="size-6 text-primary" />
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
