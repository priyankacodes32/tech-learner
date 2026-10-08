import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { CourseCard } from "@/components/student/course-card";
import { CourseDetailSheet } from "@/components/student/course-detail-sheet";
import { StudentShell } from "@/components/student/student-shell";
import {
  getExploreCourses,
  getMyCourseRequests,
  requestCourseAccess,
} from "@/lib/academy-admin.functions";

export const Route = createFileRoute("/_authenticated/dashboard/explore")({
  head: () => ({
    meta: [
      { title: "Explore — Tech Learners" },
      { name: "description", content: "Discover other academy courses and request access." },
      { property: "og:title", content: "Explore — Tech Learners" },
      { property: "og:description", content: "Discover other academy courses and request access." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { q?: string } =>
    typeof search["q"] === "string" && search["q"].trim() ? { q: search["q"].slice(0, 100) } : {},
  component: ExplorePage,
});

function ExplorePage() {
  const loadCourses = useServerFn(getExploreCourses);
  const loadRequests = useServerFn(getMyCourseRequests);
  const requestAccess = useServerFn(requestCourseAccess);
  const qc = useQueryClient();
  const { data: courses = [] } = useQuery({
    queryKey: ["explore-courses"],
    queryFn: () => loadCourses(),
  });
  const { data: requests = [] } = useQuery({
    queryKey: ["my-course-requests"],
    queryFn: () => loadRequests(),
  });
  const { q } = Route.useSearch();
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const statusByCourseId = new Map(requests.map((r) => [r.courseId, r.status]));
  const visibleCourses = q
    ? courses.filter((c) =>
        `${c.title} ${c.categoryName ?? ""}`.toLowerCase().includes(q.toLowerCase()),
      )
    : courses;
  const selectedCourse = courses.find((c) => c.id === selectedId) ?? null;

  async function handleRequest(courseId: string) {
    setRequestingId(courseId);
    try {
      await requestAccess({ data: { courseId } });
      await qc.invalidateQueries({ queryKey: ["my-course-requests"] });
      toast.success("Access requested");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not request access");
    } finally {
      setRequestingId(null);
    }
  }

  return (
    <StudentShell>
      <section aria-labelledby="explore-courses">
        <div className="mb-6">
          <h1 id="explore-courses" className="font-display text-2xl font-bold sm:text-3xl">
            Explore
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Other academy courses. Request access and an admin will review it.
          </p>
        </div>
        {visibleCourses.length ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visibleCourses.map((course) => (
              <CourseCard
                key={course.id}
                variant="explore"
                id={course.id}
                title={course.title}
                categoryName={course.categoryName}
                description={course.description}
                durationMinutes={course.durationMinutes}
                price={course.price}
                requestStatus={statusByCourseId.get(course.id) ?? "none"}
                requesting={requestingId === course.id}
                onRequest={() => handleRequest(course.id)}
                onOpenDetails={() => setSelectedId(course.id)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            {q ? `No courses match "${q}".` : "No videos yet."}
          </div>
        )}
      </section>
      <CourseDetailSheet
        open={Boolean(selectedCourse)}
        onOpenChange={(open) => !open && setSelectedId(null)}
        course={selectedCourse}
        variant="explore"
        price={selectedCourse?.price ?? 0}
        requestStatus={
          selectedCourse ? (statusByCourseId.get(selectedCourse.id) ?? "none") : "none"
        }
        requesting={requestingId === selectedCourse?.id}
        onRequest={() => selectedCourse && handleRequest(selectedCourse.id)}
      />
    </StudentShell>
  );
}
