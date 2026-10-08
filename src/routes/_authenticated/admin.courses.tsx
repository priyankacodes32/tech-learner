import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Clock3, FileVideo, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState, type ChangeEvent, type FormEvent } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  createCourseVideoUploadUrl,
  deleteCourse,
  listCategories,
  listCourses,
  saveCourse,
} from "@/lib/academy-admin.functions";
import { requireAdminRoute } from "@/lib/route-guards";
const COURSE_VIDEO_BUCKET = "course-videos";
const MAX_DIRECT_UPLOAD_BYTES = 50 * 1024 * 1024;

function describeError(error: unknown) {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : ((error as { message?: string } | null)?.message ?? "");
  if (/exceeded the maximum allowed size|EntityTooLarge|413/i.test(raw))
    return "Video is larger than the 50 MB storage limit. Use a smaller video or paste a link.";
  return raw ? `Could not upload video: ${raw}` : "Could not upload video";
}
const YOUTUBE_PATTERN =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]{6,}/i;
type Draft = {
  id?: string;
  title: string;
  categoryId: string;
  description: string;
  notes: string;
  videoSource: "url" | "youtube" | "upload";
  videoUrl: string;
  videoPath: string;
  videoFileName: string;
  durationMinutes: number;
  price: number;
  isPublished: boolean;
};
const blank: Draft = {
  title: "",
  categoryId: "",
  description: "",
  notes: "",
  videoSource: "url",
  videoUrl: "",
  videoPath: "",
  videoFileName: "",
  durationMinutes: 0,
  price: 0,
  isPublished: false,
};
export const Route = createFileRoute("/_authenticated/admin/courses")({
  beforeLoad: requireAdminRoute,
  head: () => ({
    meta: [
      { title: "Courses — Tech Learners" },
      { name: "description", content: "Create and publish the academy course catalog." },
      { property: "og:title", content: "Courses — Tech Learners" },
      { property: "og:description", content: "Create and publish the academy course catalog." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CoursesPage,
});
function CoursesPage() {
  const load = useServerFn(listCourses),
    loadCats = useServerFn(listCategories),
    save = useServerFn(saveCourse),
    remove = useServerFn(deleteCourse),
    requestUpload = useServerFn(createCourseVideoUploadUrl),
    qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["admin-courses"], queryFn: () => load() });
  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => loadCats(),
  });
  const [editing, setEditing] = useState<Draft | null>(null);
  const [uploading, setUploading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertProgress, setConvertProgress] = useState(0);
  const busy = converting || uploading;
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (editing.videoSource === "youtube" && !YOUTUBE_PATTERN.test(editing.videoUrl.trim())) {
      toast.error("Enter a valid YouTube video URL");
      return;
    }
    try {
      await save({
        data: {
          ...(editing.id ? { id: editing.id } : {}),
          title: editing.title,
          categoryId: editing.categoryId,
          description: editing.description,
          notes: editing.notes,
          ...(editing.videoSource === "upload"
            ? { videoPath: editing.videoPath }
            : { videoUrl: editing.videoUrl }),
          durationMinutes: editing.durationMinutes,
          price: editing.price,
          isPublished: editing.isPublished,
        },
      });
      await qc.invalidateQueries({ queryKey: ["admin-courses"] });
      setEditing(null);
      toast.success("Course saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save course");
    }
  }
  async function uploadVideo(e: ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    if (!file || !editing) return;
    try {
      let body: Blob = file;
      let ext = /\.([a-z0-9]{1,5})$/i.exec(file.name)?.[1]?.toLowerCase() ?? "mp4";
      let contentType = file.type || "video/mp4";
      // Storage rejects files over the plan's size cap, so only large videos are re-encoded (slow, in-browser).
      if (file.size > MAX_DIRECT_UPLOAD_BYTES) {
        setConverting(true);
        setConvertProgress(0);
        const { transcodeToWebm } = await import("@/lib/video-transcode");
        body = await transcodeToWebm(file, setConvertProgress);
        ext = "webm";
        contentType = "video/webm";
        setConverting(false);
        if (body.size > MAX_DIRECT_UPLOAD_BYTES)
          throw new Error(
            `Even after conversion the video is ${(body.size / 1048576).toFixed(0)} MB; the limit is 50 MB. Use a shorter or more compressed video, or paste a YouTube/URL link.`,
          );
      }
      setUploading(true);
      const { path, token } = await requestUpload({ data: { fileExt: ext } });
      const { error } = await supabase.storage
        .from(COURSE_VIDEO_BUCKET)
        .uploadToSignedUrl(path, token, body, { contentType });
      if (error) throw error;
      setEditing((current) =>
        current ? { ...current, videoPath: path, videoFileName: file.name } : current,
      );
      toast.success("Video uploaded");
    } catch (error) {
      console.error("Video upload failed", error);
      toast.error(describeError(error));
    } finally {
      setConverting(false);
      setUploading(false);
      input.value = "";
    }
  }
  return (
    <AdminShell
      title="Courses"
      description="Manage pricing, access, video links, and publishing."
      action={
        <Button
          size="sm"
          disabled={!categories.length}
          onClick={() => setEditing({ ...blank, categoryId: categories[0]?.id ?? "" })}
        >
          <Plus />
          Add
        </Button>
      }
    >
      {!categories.length && (
        <p className="mb-4 rounded-md border bg-warning-muted p-4 text-sm">
          Create a category before adding your first course.
        </p>
      )}
      {data.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.map((course) => (
            <article key={course.id} className="rounded-md border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge variant={course.is_published ? "default" : "secondary"}>
                    {course.is_published ? "Published" : "Draft"}
                  </Badge>
                  <h2 className="mt-3 text-lg font-bold">{course.title}</h2>
                  <p className="mt-1 text-xs font-semibold text-primary">
                    {course.categories?.name}
                  </p>
                </div>
                <div className="flex">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Edit ${course.title}`}
                    onClick={() =>
                      setEditing({
                        id: course.id,
                        title: course.title,
                        categoryId: course.category_id,
                        description: course.description,
                        notes: course.notes,
                        videoSource: course.video_path
                          ? "upload"
                          : course.video_url && YOUTUBE_PATTERN.test(course.video_url)
                            ? "youtube"
                            : "url",
                        videoUrl: course.video_url ?? "",
                        videoPath: course.video_path ?? "",
                        videoFileName: "",
                        durationMinutes: course.duration_minutes,
                        price: course.price,
                        isPublished: course.is_published,
                      })
                    }
                  >
                    <Pencil />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Delete ${course.title}`}
                    onClick={async () => {
                      if (!confirm(`Delete ${course.title}?`)) return;
                      await remove({ data: { id: course.id } });
                      await qc.invalidateQueries({ queryKey: ["admin-courses"] });
                      toast.success("Course deleted");
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
                {course.description || "No description"}
              </p>
              <div className="mt-5 flex items-center justify-between border-t pt-4 text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock3 className="size-4" />
                  {course.duration_minutes} min
                </span>
                <strong>{Number(course.price).toFixed(2)}</strong>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed py-16 text-center text-sm text-muted-foreground">
          No courses yet
        </div>
      )}
      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit course" : "New course"}</DialogTitle>
            <DialogDescription>Add the essential details students need.</DialogDescription>
          </DialogHeader>
          {editing && (
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
              <Field label="Title">
                <Input
                  required
                  minLength={2}
                  maxLength={120}
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                />
              </Field>
              <Field label="Category">
                <Select
                  required
                  value={editing.categoryId}
                  onValueChange={(value) => setEditing({ ...editing, categoryId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="space-y-2 sm:col-span-2">
                <Label>Description</Label>
                <Textarea
                  maxLength={2000}
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Notes</Label>
                <Textarea
                  maxLength={5000}
                  placeholder="Supplementary notes or materials for this course"
                  value={editing.notes}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Video</Label>
                <Tabs
                  value={editing.videoSource}
                  onValueChange={(value) =>
                    setEditing({ ...editing, videoSource: value as Draft["videoSource"] })
                  }
                >
                  <TabsList>
                    <TabsTrigger value="url">Paste URL</TabsTrigger>
                    <TabsTrigger value="youtube">YouTube</TabsTrigger>
                    <TabsTrigger value="upload">Upload file</TabsTrigger>
                  </TabsList>
                </Tabs>
                {editing.videoSource === "url" ? (
                  <Input
                    required
                    type="url"
                    value={editing.videoUrl}
                    onChange={(e) => setEditing({ ...editing, videoUrl: e.target.value })}
                  />
                ) : editing.videoSource === "youtube" ? (
                  <div className="space-y-1">
                    <Input
                      required
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=…"
                      value={editing.videoUrl}
                      onChange={(e) => setEditing({ ...editing, videoUrl: e.target.value })}
                    />
                    {editing.videoUrl && !YOUTUBE_PATTERN.test(editing.videoUrl.trim()) && (
                      <p className="text-xs text-destructive">
                        That doesn't look like a YouTube link
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {editing.videoPath ? (
                      <div className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
                        <span className="flex min-w-0 items-center gap-2 truncate">
                          <FileVideo className="size-4 shrink-0 text-success" />
                          {editing.videoFileName || "Video uploaded"}
                        </span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label="Remove video"
                          onClick={() =>
                            setEditing({ ...editing, videoPath: "", videoFileName: "" })
                          }
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Input
                          type="file"
                          accept="video/*"
                          disabled={busy}
                          onChange={uploadVideo}
                        />
                        <p className="text-xs text-muted-foreground">
                          Up to 50 MB uploads directly; larger videos are compressed first.
                        </p>
                      </>
                    )}
                    {converting && (
                      <p className="text-xs text-muted-foreground">
                        Video is large, compressing in your browser (this can take several minutes)…{" "}
                        {Math.round(convertProgress * 100)}%
                      </p>
                    )}
                    {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
                  </div>
                )}
              </div>
              <Field label="Duration (minutes)">
                <Input
                  required
                  type="number"
                  min={0}
                  value={editing.durationMinutes || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, durationMinutes: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Price">
                <Input
                  required
                  type="number"
                  min={0}
                  step="0.01"
                  value={editing.price || ""}
                  onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
                />
              </Field>
              <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
                <Label htmlFor="publish">Published</Label>
                <Switch
                  id="publish"
                  checked={editing.isPublished}
                  onCheckedChange={(value) => setEditing({ ...editing, isPublished: value })}
                />
              </div>
              <DialogFooter className="sm:col-span-2">
                <Button
                  type="submit"
                  disabled={busy || (editing.videoSource === "upload" && !editing.videoPath)}
                >
                  Save course
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
