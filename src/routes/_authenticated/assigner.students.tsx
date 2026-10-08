import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AssignerShell } from "@/components/assigner-shell";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { listStudents, setCourseAssignment } from "@/lib/academy-admin.functions";
import { requireAssignerRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/assigner/students")({
  beforeLoad: requireAssignerRoute,
  head: () => ({
    meta: [
      { title: "Students — Tech Learners" },
      { name: "description", content: "Assign courses to students." },
    ],
  }),
  component: AssignerStudentsPage,
});

function AssignerStudentsPage() {
  const load = useServerFn(listStudents);
  const assign = useServerFn(setCourseAssignment);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["assigner-students"], queryFn: () => load() });

  async function toggle(userId: string, courseId: string, assigned: boolean) {
    try {
      await assign({ data: { userId, courseId, assigned } });
      await qc.invalidateQueries({ queryKey: ["assigner-students"] });
      toast.success(assigned ? "Course allotted" : "Course removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update access");
    }
  }

  return (
    <AssignerShell title="Students" description="Assign courses to students.">
      {data?.students.length ? (
        <div className="space-y-4">
          {data.students.map((student) => (
            <article key={student.user_id} className="rounded-md border bg-card p-4 md:p-5">
              <div className="flex items-center gap-2">
                <h2 className="truncate font-semibold">
                  {student.profile?.phone_number ?? "Legacy student"}
                </h2>
                <Badge variant={student.profile?.is_active === false ? "secondary" : "default"}>
                  {student.profile?.is_active === false ? "Disabled" : "Active"}
                </Badge>
              </div>
              <div className="mt-4 border-t pt-4">
                <p className="mb-3 text-xs font-bold uppercase text-muted-foreground">
                  Course access
                </p>
                {data.courses.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {data.courses.map((course) => (
                      <label
                        key={course.id}
                        className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
                      >
                        <span className="min-w-0 truncate">{course.title}</span>
                        <Switch
                          aria-label={`Assign ${course.title}`}
                          checked={student.courseIds.includes(course.id)}
                          onCheckedChange={(checked) => toggle(student.user_id, course.id, checked)}
                        />
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No courses available to assign yet.
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed py-16 text-center text-sm text-muted-foreground">
          No students yet
        </div>
      )}
    </AssignerShell>
  );
}
