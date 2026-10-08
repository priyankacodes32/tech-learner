import { Link } from "@tanstack/react-router";
import { Clock3, LockKeyhole, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type DetailCourse = {
  id: string;
  title: string;
  categoryName: string | null;
  description: string;
  durationMinutes: number;
};

type AssignedDetail = { variant: "assigned"; notes: string };
type ExploreDetail = {
  variant: "explore";
  price: number;
  requestStatus: "none" | "pending" | "approved" | "rejected";
  onRequest: () => void;
  requesting: boolean;
};

type CourseDetailSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: DetailCourse | null;
} & (AssignedDetail | ExploreDetail);

export function CourseDetailSheet(props: CourseDetailSheetProps) {
  const { open, onOpenChange, course } = props;
  const canRequest =
    props.variant === "explore" &&
    (props.requestStatus === "none" || props.requestStatus === "rejected");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-md">
        {course && (
          <>
            <SheetHeader>
              <p className="text-xs font-bold uppercase text-primary">
                {course.categoryName ?? "Course"}
              </p>
              <SheetTitle className="font-display text-xl">{course.title}</SheetTitle>
              <SheetDescription className="flex items-center gap-1 text-xs">
                <Clock3 className="size-3.5" /> {course.durationMinutes} min
              </SheetDescription>
            </SheetHeader>
            <p
              className="select-none text-sm leading-6 text-muted-foreground [-webkit-touch-callout:none]"
              onContextMenu={(e) => e.preventDefault()}
            >
              {course.description || "No description"}
            </p>
            {props.variant === "assigned" && props.notes && (
              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <p className="text-xs font-bold uppercase text-muted-foreground">Notes</p>
                <p data-copyable className="mt-2 select-text whitespace-pre-line text-sm leading-6">
                  {props.notes}
                </p>
              </div>
            )}
            <div className="mt-auto pt-4">
              {props.variant === "assigned" ? (
                <Button className="w-full" asChild>
                  <Link to="/dashboard/watch/$courseId" params={{ courseId: course.id }}>
                    <Play className="ml-0.5 size-4 fill-current" /> Watch now
                  </Link>
                </Button>
              ) : (
                <>
                  <p className="mb-3 text-right text-sm font-bold">{props.price}</p>
                  {props.requestStatus === "rejected" && (
                    <p className="mb-2 text-xs text-destructive">
                      Previously declined — you can request again.
                    </p>
                  )}
                  <Button
                    className="w-full"
                    variant={canRequest ? "default" : "secondary"}
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
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
