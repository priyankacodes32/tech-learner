import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, BookOpen, FolderTree, Inbox, Users } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { getAdminOverview } from "@/lib/academy-admin.functions";
import { requireAdminRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  beforeLoad: requireAdminRoute,
  head: () => ({
    meta: meta(
      "Admin Overview",
      "Monitor learners, courses, categories, and new academy inquiries.",
    ),
  }),
  component: AdminDashboard,
});
function meta(title: string, description: string) {
  return [
    { title: `${title} — Tech Learners` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — Tech Learners` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}
function AdminDashboard() {
  const load = useServerFn(getAdminOverview);
  const { data } = useQuery({ queryKey: ["admin-overview"], queryFn: () => load() });
  const cards = [
    {
      label: "Courses",
      value: data?.courses ?? "—",
      to: "/admin/courses" as const,
      icon: BookOpen,
    },
    {
      label: "Categories",
      value: data?.categories ?? "—",
      to: "/admin/categories" as const,
      icon: FolderTree,
    },
    { label: "Students", value: data?.students ?? "—", to: "/admin/users" as const, icon: Users },
    {
      label: "New inquiries",
      value: data?.inquiries ?? "—",
      to: "/admin/inbox" as const,
      icon: Inbox,
    },
  ];
  return (
    <AdminShell
      title="Academy overview"
      description="Everything requiring your attention, at a glance."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, to, icon: Icon }) => (
          <Link
            key={label}
            to={to}
            className="group rounded-md border bg-card p-5 shadow-sm transition hover:border-primary/40"
          >
            <div className="flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-1" />
            </div>
            <p className="mt-8 text-3xl font-bold">{value}</p>
            <p className="mt-1 text-sm font-bold text-muted-foreground">{label}</p>
          </Link>
        ))}
      </div>
    </AdminShell>
  );
}
