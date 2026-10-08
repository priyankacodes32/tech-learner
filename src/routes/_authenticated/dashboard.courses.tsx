import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { CourseCard } from "@/components/student/course-card";
import { CourseDetailSheet } from "@/components/student/course-detail-sheet";
import { StudentShell } from "@/components/student/student-shell";
import { getMyAssignedCourses } from "@/lib/academy-admin.functions";

export const Route = createFileRoute("/_authenticated/dashboard/courses")({
  head: () => ({
    meta: [
      { title: "Enrolled — Tech Learners" },
      { name: "description", content: "All of your assigned, unlocked courses." },
      { property: "og:title", content: "Enrolled — Tech Learners" },
      { property: "og:description", content: "All of your assigned, unlocked courses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { q?: string } =>
    typeof search["q"] === "string" && search["q"].trim() ? { q: search["q"].slice(0, 100) } : {},
  component: MyCoursesPage,
});

function MyCoursesPage() {
  const load = useServerFn(getMyAssignedCourses);
  const { data: assignments = [] } = useQuery({
    queryKey: ["my-assigned-courses"],
    queryFn: () => load(),
  });
  const { q } = Route.useSearch();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const visible = q
    ? assignments.filter((a) =>
        `${a.courses.title} ${a.courses.categories?.name ?? ""}`
          .toLowerCase()
          .includes(q.toLowerCase()),
      )
    : assignments;
  const selected = assignments.find((a) => a.courses.id === selectedId) ?? null;

  return (
    <StudentShell>
      <section aria-labelledby="my-courses">
        <div className="mb-6">
          <h1 id="my-courses" className="font-display text-2xl font-bold sm:text-3xl">
            Enrolled
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every course currently assigned to you.
          </p>
        </div>
        {visible.length ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((assignment) => (
              <CourseCard
                key={assignment.id}
                variant="assigned"
                id={assignment.courses.id}
                title={assignment.courses.title}
                categoryName={assignment.courses.categories?.name ?? null}
                description={assignment.courses.description}
                notes={assignment.courses.notes}
                durationMinutes={assignment.courses.duration_minutes}
                onOpenDetails={() => setSelectedId(assignment.courses.id)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            {q ? `No enrolled courses match "${q}".` : null}
            {!q && (
              <>
                No courses assigned yet. Head to{" "}
                <Link
                  to="/dashboard/explore"
                  className="font-semibold text-primary hover:underline"
                >
                  Explore
                </Link>{" "}
                to request access.
              </>
            )}
          </div>
        )}
      </section>
      <CourseDetailSheet
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelectedId(null)}
        course={
          selected
            ? {
                id: selected.courses.id,
                title: selected.courses.title,
                categoryName: selected.courses.categories?.name ?? null,
                description: selected.courses.description,
                durationMinutes: selected.courses.duration_minutes,
              }
            : null
        }
        variant="assigned"
        notes={selected?.courses.notes ?? ""}
      />
    </StudentShell>
  );
}
