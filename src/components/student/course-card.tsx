import { useNavigate } from "@tanstack/react-router";
import { Clock3, LockKeyhole, Play } from "lucide-react";
import type { MouseEvent } from "react";

import courseFallback from "@/assets/course-react.jpg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AssignedCourseCardProps = {
  variant: "assigned";
  id: string;
  title: string;
  categoryName: string | null;
  description: string;
  notes: string;
  durationMinutes: number;
  onOpenDetails: () => void;
};

type ExploreCourseCardProps = {
  variant: "explore";
  id: string;
  title: string;
  categoryName: string | null;
  description: string;
  durationMinutes: number;
  price: number;
  requestStatus: "none" | "pending" | "approved" | "rejected";
  onRequest: () => void;
  requesting: boolean;
  onOpenDetails: () => void;
};

export function CourseCard(props: AssignedCourseCardProps | ExploreCourseCardProps) {
  const navigate = useNavigate();
  const canRequest =
    props.variant === "explore" &&
    (props.requestStatus === "none" || props.requestStatus === "rejected");

  function stop(e: MouseEvent) {
    e.stopPropagation();
  }

  return (
    <article
      className="group cursor-pointer overflow-hidden rounded-xl border border-border bg-card shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-card-hover"
      onClick={props.onOpenDetails}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") props.onOpenDetails();
      }}
    >
      <div className="relative aspect-video overflow-hidden">
        <img
          src={courseFallback}
          alt=""
          width={1200}
          height={675}
          className="size-full select-none object-cover transition duration-500 group-hover:scale-[1.03]"
          draggable={false}
        />
        {props.variant === "assigned" ? (
          <>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-black/5 to-transparent" />
            <div className="absolute inset-0 grid place-items-center">
              <button
                type="button"
                onClick={(e) => {
                  stop(e);
                  void navigate({
                    to: "/dashboard/watch/$courseId",
                    params: { courseId: props.id },
                  });
                }}
                onKeyDown={(e) => e.stopPropagation()}
                className="play-button grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-brand outline-none ring-4 ring-white/70 focus-visible:ring-white"
                aria-label={`Watch ${props.title}`}
              >
                <Play className="ml-0.5 size-5 fill-current" />
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="absolute left-4 top-4 grid size-9 place-items-center rounded-full bg-card/90 text-foreground backdrop-blur">
              <LockKeyhole className="size-4" />
            </span>
            <span className="absolute bottom-4 right-4 rounded-md bg-foreground px-2.5 py-1 text-xs font-bold text-background">
              {props.price}
            </span>
          </>
        )}
      </div>
      <div className="flex flex-col p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-xs font-bold uppercase text-primary">
            {props.categoryName ?? "Course"}
          </p>
          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <Clock3 className="size-3.5" />
            {props.durationMinutes} min
          </span>
        </div>
        <h3 className="mt-2 font-display text-base font-bold leading-snug">{props.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
          {props.description || "No description"}
        </p>
        {props.variant === "assigned" && props.notes && (
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{props.notes}</p>
        )}
        {props.variant === "explore" && (
          <div className="mt-5" onClick={stop}>
            {props.requestStatus === "rejected" && (
              <p className="mb-2 text-xs text-destructive">
                Previously declined — you can request again.
              </p>
            )}
            <Button
              className="w-full"
              variant={canRequest ? "outline" : "secondary"}
              disabled={!canRequest || props.requesting}
              onClick={props.onRequest}
            >
              {props.requestStatus === "approved" ? (
                <>Access granted</>
              ) : props.requestStatus === "pending" ? (
                <>
                  <Clock3 /> Requested
                </>
              ) : (
                <>
                  <LockKeyhole /> Request access
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}

export function StatusBadge({ status }: { status: "approved" | "pending" | "rejected" }) {
  const label = status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Pending";
  const variant =
    status === "approved" ? "default" : status === "rejected" ? "destructive" : "secondary";
  return <Badge variant={variant}>{label}</Badge>;
}
