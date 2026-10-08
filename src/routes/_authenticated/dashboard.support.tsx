import { createFileRoute, Link } from "@tanstack/react-router";
import { Headphones } from "lucide-react";

import { PageHeader, StudentShell } from "@/components/student/student-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard/support")({
  head: () => ({
    meta: [
      { title: "Support — Tech Learners" },
      { name: "description", content: "Get help from the academy team." },
    ],
  }),
  component: SupportPage,
});

function SupportPage() {
  return (
    <StudentShell>
      <section aria-labelledby="support">
        <PageHeader
          id="support"
          title="Support"
          description="Need a hand? The academy team can help."
        />
        <div className="flex max-w-md flex-col items-start gap-4 rounded-lg border border-border bg-card p-6">
          <span className="grid size-11 place-items-center rounded-full bg-secondary text-primary">
            <Headphones className="size-5" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold">Need help?</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Reach out and the academy team will get back to you.
            </p>
          </div>
          <Button asChild>
            <Link to="/contact">Contact the academy</Link>
          </Button>
        </div>
      </section>
    </StudentShell>
  );
}
