import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Mail, Phone, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteInquiry, listInquiries, updateInquiryStatus } from "@/lib/academy-admin.functions";
import { requireAdminRoute } from "@/lib/route-guards";
type Status = "new" | "read" | "resolved";
export const Route = createFileRoute("/_authenticated/admin/inbox")({
  beforeLoad: requireAdminRoute,
  head: () => ({
    meta: [
      { title: "Inquiry Inbox — Tech Learners" },
      { name: "description", content: "Review and resolve prospective student inquiries." },
      { property: "og:title", content: "Inquiry Inbox — Tech Learners" },
      { property: "og:description", content: "Review and resolve prospective student inquiries." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InboxPage,
});
function InboxPage() {
  const load = useServerFn(listInquiries),
    update = useServerFn(updateInquiryStatus),
    remove = useServerFn(deleteInquiry),
    qc = useQueryClient(),
    [filter, setFilter] = useState<Status | "all">("all");
  const { data = [] } = useQuery({ queryKey: ["admin-inquiries"], queryFn: () => load() });
  const visible = filter === "all" ? data : data.filter((item) => item.status === filter);
  return (
    <AdminShell
      title="Inquiry inbox"
      description="Review every enrollment request and keep its status current."
      action={
        <Select value={filter} onValueChange={(value) => setFilter(value as Status | "all")}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="read">Read</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      {visible.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((item) => {
            const Icon = item.contact_type === "phone" ? Phone : Mail;
            return (
              <article key={item.id} className="rounded-md border bg-card p-5">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-secondary text-primary">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="break-all font-semibold">{item.contact_value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={item.status === "new" ? "default" : "secondary"}>
                    {item.status}
                  </Badge>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {item.message}
                </p>
                <div className="mt-5 flex items-center gap-2 border-t pt-4">
                  <Select
                    value={item.status}
                    onValueChange={async (status) => {
                      await update({ data: { id: item.id, status: status as Status } });
                      await qc.invalidateQueries({ queryKey: ["admin-inquiries"] });
                      toast.success("Inquiry updated");
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    className="ml-auto"
                    size="icon"
                    variant="ghost"
                    aria-label="Delete inquiry"
                    onClick={async () => {
                      if (!confirm("Delete this inquiry?")) return;
                      await remove({ data: { id: item.id } });
                      await qc.invalidateQueries({ queryKey: ["admin-inquiries"] });
                      toast.success("Inquiry deleted");
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-md border border-dashed py-16 text-center text-sm text-muted-foreground">
          No inquiries in this view
        </div>
      )}
    </AdminShell>
  );
}
