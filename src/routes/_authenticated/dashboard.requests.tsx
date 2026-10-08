import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { StatusBadge } from "@/components/student/course-card";
import { PageHeader, StudentShell } from "@/components/student/student-shell";
import { getMyCourseRequests } from "@/lib/academy-admin.functions";

export const Route = createFileRoute("/_authenticated/dashboard/requests")({
  head: () => ({
    meta: [
      { title: "Request — Tech Learners" },
      { name: "description", content: "Track the courses you've requested access to." },
      { property: "og:title", content: "Request — Tech Learners" },
      { property: "og:description", content: "Track the courses you've requested access to." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RequestsPage,
});

function RequestsPage() {
  const load = useServerFn(getMyCourseRequests);
  const { data: requests = [] } = useQuery({
    queryKey: ["my-course-requests"],
    queryFn: () => load(),
  });

  return (
    <StudentShell>
      <section aria-labelledby="requested-courses">
        <PageHeader
          id="requested-courses"
          title="Request"
          description="Updates on the courses you've requested access to."
        />
        {requests.length ? (
          <div className="space-y-3">
            {requests.map((request) => (
              <article
                key={request.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 sm:p-5"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase text-primary">
                    {request.categoryName ?? "Course"}
                  </p>
                  <h2 className="mt-1 truncate font-display text-base font-bold sm:text-lg">
                    {request.title}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Requested {new Date(request.requestedAt).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={request.status} />
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            No course requested. Browse{" "}
            <Link to="/dashboard/explore" className="font-semibold text-primary hover:underline">
              Explore
            </Link>{" "}
            to request a course.
          </div>
        )}
      </section>
    </StudentShell>
  );
}
