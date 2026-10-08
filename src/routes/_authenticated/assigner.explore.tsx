import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AssignerShell } from "@/components/assigner-shell";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { listCoursesForCuration, setCourseFeatured } from "@/lib/assigner.functions";
import { requireAssignerRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/assigner/explore")({
  beforeLoad: requireAssignerRoute,
  head: () => ({
    meta: [
      { title: "Curate Explore — Tech Learners" },
      { name: "description", content: "Choose which published courses students see in Explore." },
    ],
  }),
  component: CurateExplorePage,
});

function CurateExplorePage() {
  const load = useServerFn(listCoursesForCuration);
  const setFeatured = useServerFn(setCourseFeatured);
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["assigner-curation"], queryFn: () => load() });

  async function toggle(courseId: string, featured: boolean) {
    try {
      await setFeatured({ data: { courseId, featured } });
      await qc.invalidateQueries({ queryKey: ["assigner-curation"] });
      toast.success(featured ? "Added to Explore" : "Removed from Explore");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update course");
    }
  }

  const published = data.filter((c) => c.isPublished);

  return (
    <AssignerShell
      title="Curate Explore"
      description="Choose which published courses students see in Explore."
    >
      {published.length ? (
        <div className="divide-y rounded-md border bg-card">
          {published.map((course) => (
            <label key={course.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{course.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {course.categoryName ?? "Course"}
                </p>
              </div>
              {course.isFeatured && <Badge>Featured</Badge>}
              <Switch
                aria-label={`Feature ${course.title}`}
                checked={course.isFeatured}
                onCheckedChange={(checked) => toggle(course.id, checked)}
              />
            </label>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed py-16 text-center text-sm text-muted-foreground">
          No published courses yet
        </div>
      )}
    </AssignerShell>
  );
}
