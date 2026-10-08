import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAssigner(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const [assigner, admin] = await Promise.all([
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "assigner" }),
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
  ]);
  if ((assigner.error || !assigner.data) && (admin.error || !admin.data))
    throw new Error("Assigner access required");
}

export const listPendingRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAssigner(context);
    const { data, error } = await context.supabase
      .from("course_access_requests")
      .select("id,requested_at,status,user_id,courses(id,title)")
      .order("requested_at", { ascending: false })
      .limit(250);
    if (error) throw new Error(error.message);
    const requests = (data ?? []).flatMap((r) =>
      r.courses
        ? [
            {
              id: r.id,
              requestedAt: r.requested_at,
              status: r.status,
              userId: r.user_id,
              courseId: r.courses.id,
              courseTitle: r.courses.title,
            },
          ]
        : [],
    );
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles } = await supabaseAdmin.from("profiles").select("user_id,phone_number");
    const phoneByUserId = new Map((profiles ?? []).map((p) => [p.user_id, p.phone_number]));
    return requests.map((r) => ({ ...r, studentPhone: phoneByUserId.get(r.userId) ?? null }));
  });

export const reviewCourseRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { requestId: string; approve: boolean }) => data)
  .handler(async ({ data, context }) => {
    await requireAssigner(context);
    // Role was verified above; the writes use the service role so admins (who have no UPDATE
    // policy on requests) behave the same as assigners and a no-op update can't pass silently.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: request, error: fetchError } = await supabaseAdmin
      .from("course_access_requests")
      .select("user_id,course_id")
      .eq("id", data.requestId)
      .single();
    if (fetchError || !request) throw new Error("Request not found");
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("course_access_requests")
      .update({ status: data.approve ? "approved" : "rejected" })
      .eq("id", data.requestId)
      .select("id");
    if (updateError) throw new Error(updateError.message);
    if (!updated?.length) throw new Error("Could not update the request");
    if (data.approve) {
      const { error: assignError } = await supabaseAdmin
        .from("course_assignments")
        .upsert(
          { user_id: request.user_id, course_id: request.course_id },
          { onConflict: "user_id,course_id" },
        );
      if (assignError) throw new Error(assignError.message);
    }
    return { ok: true };
  });

export const listCoursesForCuration = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAssigner(context);
    const { data, error } = await context.supabase
      .from("courses")
      .select("id,title,is_published,is_featured,categories(name)")
      .order("title");
    if (error) throw new Error(error.message);
    return (data ?? []).map((c) => ({
      id: c.id,
      title: c.title,
      isPublished: c.is_published,
      isFeatured: c.is_featured,
      categoryName: c.categories?.name ?? null,
    }));
  });

export const setCourseFeatured = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { courseId: string; featured: boolean }) => data)
  .handler(async ({ data, context }) => {
    await requireAssigner(context);
    const { error } = await context.supabase
      .from("courses")
      .update({ is_featured: data.featured })
      .eq("id", data.courseId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
