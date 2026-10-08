import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { AssignerShell } from "@/components/assigner-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listPendingRequests, reviewCourseRequest } from "@/lib/assigner.functions";
import { requireAssignerRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/assigner/requests")({
  beforeLoad: requireAssignerRoute,
  head: () => ({
    meta: [
      { title: "Requests — Tech Learners" },
      { name: "description", content: "Approve or reject student course-access requests." },
    ],
  }),
  component: AssignerRequestsPage,
});

function AssignerRequestsPage() {
  const load = useServerFn(listPendingRequests);
  const review = useServerFn(reviewCourseRequest);
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["assigner-requests"], queryFn: () => load() });

  async function handle(requestId: string, approve: boolean) {
    try {
      await review({ data: { requestId, approve } });
      await qc.invalidateQueries({ queryKey: ["assigner-requests"] });
      toast.success(approve ? "Request approved" : "Request rejected");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the request");
    }
  }

  const pending = data.filter((r) => r.status === "pending");
  const reviewed = data.filter((r) => r.status !== "pending");

  return (
    <AssignerShell title="Requests" description="Approve or reject student course-access requests.">
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold uppercase text-muted-foreground">
          Pending ({pending.length})
        </h2>
        {pending.length ? (
          <div className="space-y-3">
            {pending.map((request) => (
              <article
                key={request.id}
                className="flex flex-col gap-3 rounded-md border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{request.courseTitle}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {request.studentPhone ?? "Unknown student"} · requested{" "}
                    {new Date(request.requestedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handle(request.id, false)}>
                    <X />
                    Reject
                  </Button>
                  <Button size="sm" onClick={() => handle(request.id, true)}>
                    <Check />
                    Approve
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
            No pending requests
          </div>
        )}
      </section>
      {reviewed.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase text-muted-foreground">Reviewed</h2>
          <div className="space-y-3">
            {reviewed.map((request) => (
              <article
                key={request.id}
                className="flex items-center justify-between gap-3 rounded-md border bg-card p-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{request.courseTitle}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {request.studentPhone ?? "Unknown student"}
                  </p>
                </div>
                <Badge variant={request.status === "approved" ? "default" : "destructive"}>
                  {request.status === "approved" ? "Approved" : "Rejected"}
                </Badge>
              </article>
            ))}
          </div>
        </section>
      )}
    </AssignerShell>
  );
}
