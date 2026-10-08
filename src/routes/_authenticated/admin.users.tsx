import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Plus, Settings2 } from "lucide-react";
import { type CountryCode } from "libphonenumber-js";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { CountryPhoneInput } from "@/components/country-phone-input";
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
import { Switch } from "@/components/ui/switch";
import {
  listStudents,
  resetStudentDevice,
  setCourseAssignment,
  updateStudent,
} from "@/lib/academy-admin.functions";
import { requireAdminRoute } from "@/lib/route-guards";
import { createStudentAccount } from "@/lib/student-admin.functions";

export const Route = createFileRoute("/_authenticated/admin/users")({
  beforeLoad: requireAdminRoute,
  head: () => ({
    meta: [
      { title: "Students — Tech Learners" },
      { name: "description", content: "Create student logins and assign academy courses." },
      { property: "og:title", content: "Students — Tech Learners" },
      { property: "og:description", content: "Create student logins and assign academy courses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UsersPage,
});
function UsersPage() {
  const load = useServerFn(listStudents),
    create = useServerFn(createStudentAccount),
    update = useServerFn(updateStudent),
    assign = useServerFn(setCourseAssignment),
    resetDevice = useServerFn(resetStudentDevice),
    qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-students"], queryFn: () => load() });
  const [createOpen, setCreateOpen] = useState(false),
    [editing, setEditing] = useState<{
      userId: string;
      country: CountryCode;
      phone: string;
      password: string;
      isActive: boolean;
    } | null>(null),
    [country, setCountry] = useState<CountryCode>("US"),
    [phone, setPhone] = useState(""),
    [password, setPassword] = useState("");
  async function createUser(e: FormEvent) {
    e.preventDefault();
    try {
      await create({ data: { country, phone, password } });
      setCreateOpen(false);
      setPhone("");
      setPassword("");
      await qc.invalidateQueries({ queryKey: ["admin-students"] });
      toast.success("Student login created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create student");
    }
  }
  return (
    <AdminShell
      title="Students"
      description="Create logins, control access, and allot courses."
      action={
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus />
          Add
        </Button>
      }
    >
      {data?.students.length ? (
        <div className="space-y-4">
          {data.students.map((student) => (
            <article key={student.user_id} className="rounded-md border bg-card p-4 md:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate font-semibold">
                      {student.profile?.phone_number ?? "Legacy student"}
                    </h2>
                    <Badge variant={student.profile?.is_active === false ? "secondary" : "default"}>
                      {student.profile?.is_active === false ? "Disabled" : "Active"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Created {new Date(student.created_at).toLocaleDateString()}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {student.device
                        ? `Device registered ${new Date(student.device.bound_at).toLocaleDateString()}`
                        : "No device registered yet"}
                    </span>
                    {student.device && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs"
                        onClick={async () => {
                          if (
                            !confirm(
                              "Reset this student's registered device? The next device they watch a video on becomes their registered device.",
                            )
                          )
                            return;
                          try {
                            await resetDevice({ data: { userId: student.user_id } });
                            await qc.invalidateQueries({ queryKey: ["admin-students"] });
                            toast.success("Device reset");
                          } catch (error) {
                            toast.error(
                              error instanceof Error ? error.message : "Could not reset device",
                            );
                          }
                        }}
                      >
                        Reset device
                      </Button>
                    )}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Edit login"
                  onClick={() =>
                    setEditing({
                      userId: student.user_id,
                      country: "US",
                      phone: student.profile?.phone_number ?? "",
                      password: "",
                      isActive: student.profile?.is_active !== false,
                    })
                  }
                >
                  <Settings2 />
                </Button>
              </div>
              <div className="mt-5 border-t pt-4">
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
                          onCheckedChange={async (checked) => {
                            try {
                              await assign({
                                data: {
                                  userId: student.user_id,
                                  courseId: course.id,
                                  assigned: checked,
                                },
                              });
                              await qc.invalidateQueries({ queryKey: ["admin-students"] });
                              toast.success(checked ? "Course allotted" : "Course removed");
                            } catch (error) {
                              toast.error(
                                error instanceof Error ? error.message : "Could not update access",
                              );
                            }
                          }}
                        />
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Add a course to begin allotting access.
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
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create student login</DialogTitle>
            <DialogDescription>
              Share the phone number and temporary password directly with the student.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createUser} className="space-y-4">
            <div className="space-y-2">
              <Label>Phone number</Label>
              <CountryPhoneInput
                country={country}
                onCountryChange={setCountry}
                value={phone}
                onNumberChange={setPhone}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Temporary password</Label>
              <Input
                id="new-password"
                type="password"
                required
                minLength={8}
                maxLength={72}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="submit">
                <KeyRound />
                Create login
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit student access</DialogTitle>
            <DialogDescription>
              Change the login phone, set a new password, or disable access.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await update({ data: editing });
                  await qc.invalidateQueries({ queryKey: ["admin-students"] });
                  setEditing(null);
                  toast.success("Student access updated");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Could not update student");
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Phone number</Label>
                <CountryPhoneInput
                  country={editing.country}
                  onCountryChange={(value) => setEditing({ ...editing, country: value })}
                  value={editing.phone}
                  onNumberChange={(value) => setEditing({ ...editing, phone: value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-password">New password (optional)</Label>
                <Input
                  id="reset-password"
                  type="password"
                  minLength={8}
                  maxLength={72}
                  value={editing.password}
                  onChange={(e) => setEditing({ ...editing, password: e.target.value })}
                />
              </div>
              <label className="flex items-center justify-between rounded-md border p-3">
                <span>
                  <span className="block text-sm font-semibold">Login active</span>
                  <span className="text-xs text-muted-foreground">
                    Disabled students cannot sign in.
                  </span>
                </span>
                <Switch
                  checked={editing.isActive}
                  onCheckedChange={(value) => setEditing({ ...editing, isActive: value })}
                />
              </label>
              <DialogFooter>
                <Button type="submit">Save access</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
