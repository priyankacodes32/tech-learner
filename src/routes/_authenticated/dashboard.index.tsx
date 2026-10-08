import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/student/course-card";
import { StudentShell } from "@/components/student/student-shell";
import { getMyAssignedCourses } from "@/lib/academy-admin.functions";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [
      { title: "My Learning — Tech Learners" },
      {
        name: "description",
        content:
          "Continue your active online courses, monitor access time, and request new learning programs.",
      },
      { property: "og:title", content: "My Learning — Tech Learners" },
      {
        property: "og:description",
        content: "A focused learning dashboard for courses, progress, and access requests.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentDashboard,
});

function formatCountdown(milliseconds: number) {
  const safe = Math.max(0, milliseconds);
  const days = Math.floor(safe / 86_400_000);
  const hours = Math.floor((safe % 86_400_000) / 3_600_000);
  const minutes = Math.floor((safe % 3_600_000) / 60_000);
  return { days, hours, minutes };
}

function StudentDashboard() {
  const navigate = useNavigate();
  const loadAssigned = useServerFn(getMyAssignedCourses);
  const { data: assignments = [] } = useQuery({
    queryKey: ["my-assigned-courses"],
    queryFn: () => loadAssigned(),
  });
  const [now, setNow] = useState(() => Date.now());
  // Nearest upcoming expiry across the student's enrollments (null = nothing expires).
  const expiresAt = useMemo(() => {
    const times = assignments.flatMap((a) =>
      a.expires_at ? [new Date(a.expires_at).getTime()] : [],
    );
    const upcoming = times.filter((t) => t > Date.now());
    return upcoming.length ? Math.min(...upcoming) : null;
  }, [assignments]);
  const countdown = formatCountdown((expiresAt ?? now) - now);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const teaser = assignments.slice(0, 3);

  return (
    <StudentShell>
      <section className="mb-9 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Good to see you.</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            Pick up where you left off, or find your next skill to master.
          </p>
        </div>
        <div className="flex items-center gap-5 border-l-2 border-primary pl-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">ACTIVE ACCESS</p>
            <p className="mt-1 text-sm font-bold">{assignments.length} courses</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="active-courses">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 id="active-courses" className="font-display text-xl font-bold sm:text-2xl">
              Continue learning
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Your active, unlocked courses</p>
          </div>
          {assignments.length > 0 && (
            <Button variant="ghost" className="hidden text-primary sm:inline-flex" asChild>
              <Link to="/dashboard/courses">View all</Link>
            </Button>
          )}
        </div>
        {teaser.length ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {teaser.map((assignment) => (
              <CourseCard
                key={assignment.id}
                variant="assigned"
                id={assignment.courses.id}
                title={assignment.courses.title}
                categoryName={assignment.courses.categories?.name ?? null}
                description={assignment.courses.description}
                notes={assignment.courses.notes}
                durationMinutes={assignment.courses.duration_minutes}
                onOpenDetails={() => navigate({ to: "/dashboard/courses" })}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            No courses assigned yet. Head to{" "}
            <Link to="/dashboard/explore" className="font-semibold text-primary hover:underline">
              Explore
            </Link>{" "}
            to request access.
          </div>
        )}
      </section>

      {expiresAt !== null && (
        <section
          className="mt-10 border-y border-warning-border bg-warning-muted px-5 py-5 sm:px-6"
          aria-label="Course access expiration notice"
        >
          <div className="flex flex-col gap-5 md:flex-row md:items-center">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-warning text-warning-foreground">
              <Clock3 className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-base font-bold">
                Your active course access is time-limited
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Access remains available until{" "}
                <strong className="text-foreground">
                  {new Date(expiresAt).toLocaleString(undefined, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </strong>
                .
              </p>
            </div>
            <div
              className="flex gap-2"
              aria-label={`${countdown.days} days, ${countdown.hours} hours, and ${countdown.minutes} minutes remaining`}
            >
              <CountdownUnit value={countdown.days} label="Days" />
              <CountdownUnit value={countdown.hours} label="Hours" />
              <CountdownUnit value={countdown.minutes} label="Mins" />
            </div>
          </div>
        </section>
      )}
    </StudentShell>
  );
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="w-16 rounded-md border border-warning-border bg-card px-2 py-2 text-center shadow-sm">
      <p className="font-display text-lg font-bold tabular-nums">
        {String(value).padStart(2, "0")}
      </p>
      <p className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</p>
    </div>
  );
}
