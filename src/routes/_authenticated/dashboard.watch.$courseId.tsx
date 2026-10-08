import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";

import { StudentShell } from "@/components/student/student-shell";
import { WatermarkOverlay } from "@/components/student/watermark-overlay";
import { supabase } from "@/integrations/supabase/client";
import { getCourseVideoAccess, getMyAssignedCourses } from "@/lib/academy-admin.functions";
import { getDeviceId } from "@/lib/device-id";

export const Route = createFileRoute("/_authenticated/dashboard/watch/$courseId")({
  head: () => ({
    meta: [
      { title: "Watch — Tech Learners" },
      { name: "description", content: "Watch your course video." },
    ],
  }),
  component: WatchPage,
});

// Real browser-level hardening we can actually make true:
// - youtube-nocookie.com embed with controls/modestbranding/rel/disablekb params
// - native <video> loses its native download button and PiP, right-click is blocked
// None of this stops screen recording or a determined user — see WatermarkOverlay
// for the part of this that's actually effective (traceability, not prevention).
function toEmbedUrl(url: string): string | null {
  const youtube = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/.exec(
    url,
  );
  if (youtube)
    return `https://www.youtube-nocookie.com/embed/${youtube[1]}?controls=1&modestbranding=1&rel=0&disablekb=1`;
  const vimeo = /vimeo\.com\/(\d+)/.exec(url);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

function WatchPage() {
  const { courseId } = Route.useParams();
  const load = useServerFn(getMyAssignedCourses);
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["my-assigned-courses"],
    queryFn: () => load(),
  });
  const { data: identity } = useQuery({
    queryKey: ["current-user-identity"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return (
        (data.user?.user_metadata?.["phone_number"] as string | undefined) ??
        data.user?.email ??
        "Student"
      );
    },
  });
  const assignment = assignments.find((a) => a.courses.id === courseId);
  const requestAccess = useServerFn(getCourseVideoAccess);
  const {
    data: access,
    error: accessError,
    isLoading: accessLoading,
  } = useQuery({
    queryKey: ["course-video-access", courseId],
    queryFn: () => requestAccess({ data: { courseId, deviceId: getDeviceId() } }),
    enabled: Boolean(assignment),
    retry: false,
    gcTime: 0,
    // Signed links expire; ask the server for a fresh one before that happens.
    refetchInterval: (query) =>
      query.state.data?.expiresInSeconds ? (query.state.data.expiresInSeconds - 120) * 1000 : false,
    refetchIntervalInBackground: true,
  });
  const wrongDevice =
    accessError instanceof Error && accessError.message.includes("DEVICE_MISMATCH");
  const blockedMessage = wrongDevice
    ? "This account is already registered on 2 other devices, which is the maximum, so this video can't be played here. Ask your academy admin to reset your devices if you have changed phones or computers."
    : accessError instanceof Error
      ? accessError.message
      : "This video isn't available. It may not be assigned to you — go back and try again.";

  return (
    <StudentShell>
      <Link
        to="/dashboard/courses"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to my courses
      </Link>
      {isLoading || (assignment && accessLoading) ? (
        <div className="aspect-video w-full animate-pulse rounded-lg bg-muted" />
      ) : !assignment || !access?.url ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-20 text-center text-sm text-muted-foreground">
          {assignment
            ? blockedMessage
            : "This video isn't available. It may not be assigned to you — go back and try again."}
        </div>
      ) : (
        <>
          {(() => {
            const videoUrl = access.url;
            const embedUrl = toEmbedUrl(videoUrl);
            return (
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
                {embedUrl ? (
                  <iframe
                    src={embedUrl}
                    title={assignment.courses.title}
                    className="size-full"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    controls
                    controlsList="nodownload noremoteplayback"
                    disablePictureInPicture
                    onContextMenu={(e) => e.preventDefault()}
                    className="size-full select-none [-webkit-touch-callout:none]"
                    src={videoUrl}
                  >
                    Your browser doesn't support video playback.
                  </video>
                )}
                <WatermarkOverlay identity={identity ?? "Student"} />
              </div>
            );
          })()}
          <div className="mt-6">
            <p className="text-xs font-bold uppercase text-primary">
              {assignment.courses.categories?.name ?? "Course"}
            </p>
            <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
              {assignment.courses.title}
            </h1>
            <p
              className="mt-3 max-w-2xl select-none text-sm leading-6 text-muted-foreground [-webkit-touch-callout:none]"
              onContextMenu={(e) => e.preventDefault()}
            >
              {assignment.courses.description}
            </p>
            {assignment.courses.notes && (
              <div className="mt-5 rounded-lg border border-border bg-card p-4 sm:p-5">
                <p className="text-xs font-bold uppercase text-muted-foreground">Notes</p>
                <p
                  data-copyable
                  className="mt-2 select-text whitespace-pre-line text-sm leading-6 text-foreground"
                >
                  {assignment.courses.notes}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </StudentShell>
  );
}
