import { Link, useRouter } from "@tanstack/react-router";
import { LogOut, Star, TimerReset, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const links = [
  { to: "/assigner/requests" as const, label: "Requests", icon: TimerReset },
  { to: "/assigner/explore" as const, label: "Curate Explore", icon: Star },
  { to: "/assigner/students" as const, label: "Students", icon: Users },
];

export function AssignerShell({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-muted/30 pb-24 md:pb-8">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <Link to="/assigner/requests" className="flex items-center gap-2 font-extrabold">
            <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
              T
            </span>
            Tech Learners Assigner
          </Link>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sign out"
            title="Sign out"
            onClick={async () => {
              await supabase.auth.signOut();
              await router.navigate({ to: "/" });
            }}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-7 md:grid-cols-[190px_1fr] md:px-8">
        <nav className="hidden space-y-1 md:block">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeProps={{ className: "bg-accent text-accent-foreground" }}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-bold text-muted-foreground"
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <main className="min-w-0">
          <div className="mb-7 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
            {action}
          </div>
          {children}
        </main>
      </div>
      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-3 rounded-md border bg-background p-1 shadow-lg md:hidden">
        {links.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeProps={{ className: "bg-accent text-accent-foreground" }}
            className="flex min-w-0 flex-col items-center gap-1 rounded-sm px-1 py-2 text-[10px] font-bold text-muted-foreground"
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
