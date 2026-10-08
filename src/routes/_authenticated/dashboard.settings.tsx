import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogOut } from "lucide-react";

import { StudentShell } from "@/components/student/student-shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Tech Learners" },
      { name: "description", content: "Manage your account." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const router = useRouter();
  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });

  return (
    <StudentShell>
      <section aria-labelledby="settings">
        <div className="mb-6">
          <h1 id="settings" className="font-display text-2xl font-bold sm:text-3xl">
            Settings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Your account details.</p>
        </div>
        <div className="max-w-md space-y-4">
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="text-xs font-bold uppercase text-muted-foreground">Signed in as</p>
            <p className="mt-2 text-sm font-semibold">
              {(user?.user_metadata?.["phone_number"] as string | undefined) ?? user?.email ?? "—"}
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              await supabase.auth.signOut();
              await router.navigate({ to: "/" });
            }}
          >
            <LogOut /> Sign out
          </Button>
        </div>
      </section>
    </StudentShell>
  );
}
