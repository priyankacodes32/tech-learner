import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Bell,
  BookOpen,
  ChevronDown,
  Compass,
  Headphones,
  Home,
  LogOut,
  Menu,
  Search,
  Settings,
  Sparkles,
  TimerReset,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getMyAssignedCourses, getMyCourseRequests } from "@/lib/academy-admin.functions";
import { useRouter } from "@tanstack/react-router";

const links = [
  { to: "/dashboard" as const, label: "Overview", icon: Home },
  { to: "/dashboard/courses" as const, label: "Enrolled", icon: BookOpen },
  { to: "/dashboard/explore" as const, label: "Explore", icon: Compass },
  { to: "/dashboard/requests" as const, label: "Request", icon: TimerReset },
];

const mobileLinks = [
  { to: "/dashboard" as const, label: "Home", icon: Home },
  { to: "/dashboard/courses" as const, label: "Enrolled", icon: BookOpen },
  { to: "/dashboard/explore" as const, label: "Explore", icon: Compass },
  { to: "/dashboard/requests" as const, label: "Request", icon: TimerReset },
  { to: "/dashboard/settings" as const, label: "Settings", icon: Settings },
];

// Shared page header: a soft, nearly transparent tinted panel with a consistent type scale.
export function PageHeader({
  id,
  eyebrow,
  title,
  description,
  aside,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  description: string;
  aside?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col justify-between gap-5 rounded-2xl border border-primary/10 bg-primary/[0.045] px-5 py-6 sm:px-7 md:flex-row md:items-center">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-bold uppercase tracking-wide text-primary">{eyebrow}</p>
        )}
        <h1
          id={id}
          className="mt-1 font-display text-2xl font-bold leading-tight sm:text-[1.75rem]"
        >
          {title}
        </h1>
        <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {aside}
    </header>
  );
}

export function StudentShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [search, setSearch] = useState("");
  // Search filters the Explore list when you are on it, otherwise your enrolled courses.
  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const q = search.trim();
    void navigate({
      to: pathname.startsWith("/dashboard/explore") ? "/dashboard/explore" : "/dashboard/courses",
      search: q ? { q } : {},
    });
  }
  const loadAssigned = useServerFn(getMyAssignedCourses);
  const loadRequests = useServerFn(getMyCourseRequests);
  const { data: assigned = [] } = useQuery({
    queryKey: ["my-assigned-courses"],
    queryFn: () => loadAssigned(),
  });
  const { data: requests = [] } = useQuery({
    queryKey: ["my-course-requests"],
    queryFn: () => loadRequests(),
  });
  // Nothing in the student area can be selected or copied except elements marked data-copyable (course notes).
  useEffect(() => {
    const allowed = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest("[data-copyable]"));
    const block = (event: Event) => {
      if (!allowed(event.target)) event.preventDefault();
    };
    const blockCopy = (event: ClipboardEvent) => {
      const selection = window.getSelection();
      const inNotes =
        selection &&
        selection.rangeCount > 0 &&
        allowed(
          selection.anchorNode instanceof Element
            ? selection.anchorNode
            : (selection.anchorNode?.parentElement ?? null),
        ) &&
        allowed(
          selection.focusNode instanceof Element
            ? selection.focusNode
            : (selection.focusNode?.parentElement ?? null),
        );
      if (!inNotes) {
        event.preventDefault();
        event.clipboardData?.setData("text/plain", "");
      }
    };
    const isField = (target: EventTarget | null) =>
      target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
    const blockSelect = (event: Event) => {
      if (!allowed(event.target) && !isField(event.target)) event.preventDefault();
    };
    const blockKeys = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || isField(event.target)) return;
      // Ctrl/Cmd+C is left to the copy handler so course notes can still be copied.
      if (["x", "a", "s", "p", "u"].includes(event.key.toLowerCase())) event.preventDefault();
    };
    document.addEventListener("copy", blockCopy);
    document.addEventListener("cut", blockCopy);
    document.addEventListener("contextmenu", block);
    document.addEventListener("dragstart", block);
    document.addEventListener("selectstart", blockSelect);
    document.addEventListener("keydown", blockKeys);
    return () => {
      document.removeEventListener("copy", blockCopy);
      document.removeEventListener("cut", blockCopy);
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("dragstart", block);
      document.removeEventListener("selectstart", blockSelect);
      document.removeEventListener("keydown", blockKeys);
    };
  }, []);
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="min-h-screen select-none bg-background text-foreground [-webkit-touch-callout:none]">
      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-sidebar px-5 py-6 transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex items-center justify-between px-2">
            <Link to="/dashboard" className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground shadow-brand">
                <Sparkles className="size-5" />
              </span>
              <div>
                <p className="font-display text-base font-bold">Tech Learners</p>
                <p className="text-xs text-muted-foreground">Learning space</p>
              </div>
            </Link>
            <Button
              className="lg:hidden"
              variant="ghost"
              size="icon"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
            >
              <X />
            </Button>
          </div>

          <nav className="mt-10 space-y-1" aria-label="Student navigation">
            {links.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === "/dashboard" }}
                activeProps={{ className: "bg-sidebar-accent text-primary" }}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-bold text-muted-foreground transition hover:bg-sidebar-accent hover:text-foreground"
                onClick={() => setMenuOpen(false)}
              >
                <Icon className="size-4.5" />
                <span>{label}</span>
                {label === "Request" && pendingCount > 0 && (
                  <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                    {pendingCount}
                  </span>
                )}
                {label === "Enrolled" && assigned.length > 0 && (
                  <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                    {assigned.length}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          <div className="mt-auto">
            <Link
              to="/dashboard/support"
              activeProps={{ className: "bg-sidebar-accent text-primary" }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-bold text-muted-foreground transition hover:bg-sidebar-accent hover:text-foreground"
              onClick={() => setMenuOpen(false)}
            >
              <Headphones className="size-4.5" />
              <span>Support</span>
            </Link>
            <Link
              to="/dashboard/settings"
              activeProps={{ className: "bg-sidebar-accent text-primary" }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-bold text-muted-foreground transition hover:bg-sidebar-accent hover:text-foreground"
              onClick={() => setMenuOpen(false)}
            >
              <Settings className="size-4.5" />
              <span>Settings</span>
            </Link>
          </div>
        </aside>

        {menuOpen && (
          <button
            className="fixed inset-0 z-40 bg-overlay lg:hidden"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu backdrop"
          />
        )}

        <main className="min-w-0 flex-1 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent pb-24 lg:pb-10">
          <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 px-5 py-4 backdrop-blur-xl sm:px-8 lg:px-10">
            <div className="mx-auto flex max-w-7xl items-center gap-3">
              <Button
                className="lg:hidden"
                variant="outline"
                size="icon"
                onClick={() => setMenuOpen(true)}
                aria-label="Open menu"
              >
                <Menu />
              </Button>
              <form
                onSubmit={submitSearch}
                role="search"
                className="relative hidden max-w-md flex-1 sm:block"
              >
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="h-10 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  placeholder="Search courses"
                  aria-label="Search courses"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </form>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Notifications"
                  className="relative"
                  asChild
                >
                  <Link to="/dashboard/requests">
                    <Bell />
                    {pendingCount > 0 && (
                      <span className="absolute right-2 top-2 size-1.5 rounded-full bg-course-coral" />
                    )}
                  </Link>
                </Button>
                <Link
                  to="/dashboard/settings"
                  className="flex items-center gap-2 rounded-lg p-1.5 text-left transition hover:bg-accent"
                  aria-label="Open account menu"
                >
                  <span className="grid size-9 place-items-center rounded-full bg-secondary text-sm font-bold text-primary">
                    ST
                  </span>
                  <span className="hidden sm:block">
                    <span className="block text-sm font-semibold">Student</span>
                    <span className="block text-xs text-muted-foreground">Account</span>
                  </span>
                  <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
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
            </div>
          </header>

          <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 sm:pt-8 lg:px-10 lg:pt-10">
            {children}
          </div>

          <nav
            className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 rounded-lg border border-border bg-card/95 p-1.5 shadow-card-hover backdrop-blur-xl lg:hidden"
            aria-label="Student mobile navigation"
          >
            {mobileLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === "/dashboard" }}
                activeProps={{ className: "bg-secondary text-primary" }}
                className="flex h-13 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 text-[10px] font-bold text-muted-foreground"
              >
                <Icon className="size-4" />
                <span className="truncate">{label}</span>
              </Link>
            ))}
          </nav>
        </main>
      </div>
    </div>
  );
}
