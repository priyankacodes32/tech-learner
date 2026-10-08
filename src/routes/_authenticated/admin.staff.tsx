import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Plus, UserCog } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createStaffAccount, listStaff } from "@/lib/academy-admin.functions";
import { requireAdminRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/staff")({
  beforeLoad: requireAdminRoute,
  head: () => ({
    meta: [
      { title: "Staff — Tech Learners" },
      { name: "description", content: "Create and manage admin and assigner accounts." },
      { property: "og:title", content: "Staff — Tech Learners" },
      { property: "og:description", content: "Create and manage admin and assigner accounts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StaffPage,
});

function StaffPage() {
  const load = useServerFn(listStaff);
  const create = useServerFn(createStaffAccount);
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["admin-staff"], queryFn: () => load() });
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "assigner">("assigner");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await create({ data: { email, password, role } });
      setOpen(false);
      setEmail("");
      setPassword("");
      setRole("assigner");
      await qc.invalidateQueries({ queryKey: ["admin-staff"] });
      toast.success("Account created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminShell
      title="Staff"
      description="Create and manage admin and assigner accounts."
      action={
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus />
          Add
        </Button>
      }
    >
      {data.length ? (
        <div className="divide-y rounded-md border bg-card">
          {data.map((member) => (
            <div key={member.userId} className="flex items-center gap-3 p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-secondary text-primary">
                <UserCog className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{member.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Added {new Date(member.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                {member.role === "admin" ? "Admin" : "Assigner"}
              </Badge>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed py-16 text-center text-sm text-muted-foreground">
          No staff accounts yet
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create staff account</DialogTitle>
            <DialogDescription>
              Admins have full access. Assigners can review course requests and curate Explore.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staff-email">Email</Label>
              <Input
                id="staff-email"
                type="email"
                required
                maxLength={255}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-password">Password</Label>
              <Input
                id="staff-password"
                type="password"
                required
                minLength={8}
                maxLength={72}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as "admin" | "assigner")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assigner">Assigner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                Create account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
