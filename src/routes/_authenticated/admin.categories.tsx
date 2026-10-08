import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
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
import { Textarea } from "@/components/ui/textarea";
import { deleteCategory, listCategories, saveCategory } from "@/lib/academy-admin.functions";
import { requireAdminRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  beforeLoad: requireAdminRoute,
  head: () => ({
    meta: [
      { title: "Categories — Tech Learners" },
      { name: "description", content: "Organize academy courses into manageable categories." },
      { property: "og:title", content: "Categories — Tech Learners" },
      {
        property: "og:description",
        content: "Organize academy courses into manageable categories.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CategoriesPage,
});
function CategoriesPage() {
  const load = useServerFn(listCategories),
    save = useServerFn(saveCategory),
    remove = useServerFn(deleteCategory),
    qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["admin-categories"], queryFn: () => load() });
  const [editing, setEditing] = useState<{ id?: string; name: string; description: string } | null>(
    null,
  );
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    try {
      await save({ data: editing });
      await qc.invalidateQueries({ queryKey: ["admin-categories"] });
      setEditing(null);
      toast.success("Category saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save category");
    }
  }
  return (
    <AdminShell
      title="Categories"
      description="Create clear groups for your course catalog."
      action={
        <Button size="sm" onClick={() => setEditing({ name: "", description: "" })}>
          <Plus />
          Add
        </Button>
      }
    >
      {data.length ? (
        <div className="divide-y rounded-md border bg-card">
          {data.map((category) => (
            <div key={category.id} className="flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">{category.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {category.description || "No description"}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Edit ${category.name}`}
                onClick={() =>
                  setEditing({
                    id: category.id,
                    name: category.name,
                    description: category.description,
                  })
                }
              >
                <Pencil />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Delete ${category.name}`}
                onClick={async () => {
                  if (!confirm(`Delete ${category.name}?`)) return;
                  try {
                    await remove({ data: { id: category.id } });
                    await qc.invalidateQueries({ queryKey: ["admin-categories"] });
                    toast.success("Category deleted");
                  } catch (error) {
                    toast.error(
                      error instanceof Error ? error.message : "Could not delete category",
                    );
                  }
                }}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <Empty text="No categories yet" />
      )}
      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit category" : "New category"}</DialogTitle>
            <DialogDescription>Categories help students understand your catalog.</DialogDescription>
          </DialogHeader>
          {editing && (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">Name</Label>
                <Input
                  id="category-name"
                  required
                  minLength={2}
                  maxLength={80}
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-description">Description</Label>
                <Textarea
                  id="category-description"
                  maxLength={500}
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button type="submit">Save category</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed py-16 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
