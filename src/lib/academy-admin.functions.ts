import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import type { CountryCode } from "libphonenumber-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isValidPhone, normalizePhone, phoneToLoginEmail } from "@/lib/phone-auth";

type CourseInput = {
  id?: string;
  title: string;
  categoryId: string;
  description: string;
  notes: string;
  videoUrl?: string;
  videoPath?: string;
  durationMinutes: number;
  price: number;
  isPublished: boolean;
};

const COURSE_VIDEO_BUCKET = "course-videos";

async function requireAdmin(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Administrator access required");
}

async function requireAdminOrAssigner(context: {
  supabase: SupabaseClient<Database>;
  userId: string;
}) {
  const [admin, assigner] = await Promise.all([
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "assigner" }),
  ]);
  if ((admin.error || !admin.data) && (assigner.error || !assigner.data))
    throw new Error("Administrator or assigner access required");
}

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const [categories, courses, inquiries] = await Promise.all([
      context.supabase.from("categories").select("id", { count: "exact", head: true }),
      context.supabase.from("courses").select("id", { count: "exact", head: true }),
      context.supabase
        .from("contact_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "new"),
    ]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "student");
    return {
      categories: categories.count ?? 0,
      courses: courses.count ?? 0,
      inquiries: inquiries.count ?? 0,
      students: roles?.length ?? 0,
    };
  });

export const listCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { data, error } = await context.supabase
      .from("categories")
      .select("id,name,description,created_at")
      .order("name");
    if (error) throw new Error(error.message);
    return data;
  });

export const saveCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id?: string; name: string; description: string }) => data)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const name = data.name.trim();
    if (name.length < 2 || name.length > 80 || data.description.length > 500)
      throw new Error("Check the category details");
    const query = data.id
      ? context.supabase
          .from("categories")
          .update({ name, description: data.description.trim() })
          .eq("id", data.id)
      : context.supabase.from("categories").insert({ name, description: data.description.trim() });
    const { error } = await query;
    if (error)
      throw new Error(error.code === "23505" ? "That category already exists" : error.message);
    return { ok: true };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await context.supabase.from("categories").delete().eq("id", data.id);
    if (error)
      throw new Error(
        error.code === "23503" ? "Move or delete this category's courses first" : error.message,
      );
    return { ok: true };
  });

export const listCourses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("courses")
      .select(
        "id,title,description,notes,video_url,video_path,duration_minutes,price,is_published,category_id,categories(name)",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const createCourseVideoUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { fileExt: string }) => data)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const fileExt = data.fileExt.replace(/[^a-z0-9]/gi, "").slice(0, 10) || "mp4";
    const path = `${crypto.randomUUID()}.${fileExt}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from(COURSE_VIDEO_BUCKET)
      .createSignedUploadUrl(path);
    if (error || !signed) throw new Error(error?.message ?? "Could not prepare the upload");
    return { path, token: signed.token };
  });

export const saveCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: CourseInput) => data)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const videoUrl = data.videoUrl?.trim() || undefined;
    const videoPath = data.videoPath?.trim() || undefined;
    if (
      data.title.trim().length < 2 ||
      (!videoUrl && !videoPath) ||
      (videoUrl && !URL.canParse(videoUrl)) ||
      data.durationMinutes < 0 ||
      data.price < 0
    )
      throw new Error("Check the course details");
    const values = {
      title: data.title.trim(),
      category_id: data.categoryId,
      description: data.description.trim(),
      notes: data.notes.trim(),
      video_url: videoUrl ?? null,
      video_path: videoPath ?? null,
      duration_minutes: Math.round(data.durationMinutes),
      price: data.price,
      is_published: data.isPublished,
    };
    const query = data.id
      ? context.supabase.from("courses").update(values).eq("id", data.id)
      : context.supabase.from("courses").insert(values);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await context.supabase.from("courses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdminOrAssigner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [
      { data: roles },
      { data: profiles },
      { data: assignments },
      { data: courses },
      { data: devices },
    ] = await Promise.all([
      supabaseAdmin
        .from("user_roles")
        .select("user_id,created_at")
        .eq("role", "student")
        .limit(500),
      supabaseAdmin.from("profiles").select("user_id,phone_number,is_active"),
      supabaseAdmin.from("course_assignments").select("user_id,course_id"),
      supabaseAdmin.from("courses").select("id,title,is_published").order("title"),
      (supabaseAdmin as unknown as SupabaseClient)
        .from("student_devices")
        .select("user_id,bound_at,user_agent")
        .then(
          (result) =>
            result as {
              data: Array<{ user_id: string; bound_at: string; user_agent: string | null }> | null;
            },
        ),
    ]);
    const deviceMap = new Map((devices ?? []).map((d) => [d.user_id, d]));
    const profileMap = new Map((profiles ?? []).map((item) => [item.user_id, item]));
    return {
      courses: courses ?? [],
      students: (roles ?? []).map((role) => ({
        ...role,
        profile: profileMap.get(role.user_id) ?? null,
        device: deviceMap.get(role.user_id) ?? null,
        courseIds: (assignments ?? [])
          .filter((a) => a.user_id === role.user_id)
          .map((a) => a.course_id),
      })),
    };
  });

export const updateStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      userId: string;
      country: string;
      phone: string;
      password?: string;
      isActive: boolean;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (!isValidPhone(data.phone, data.country as CountryCode))
      throw new Error("Enter a valid phone number");
    if (data.password && data.password.length < 8)
      throw new Error("Password must be at least 8 characters");
    const phone = normalizePhone(data.phone, data.country as CountryCode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const attributes: {
      email: string;
      ban_duration: string;
      password?: string;
      user_metadata: { phone_number: string };
    } = {
      email: phoneToLoginEmail(phone),
      ban_duration: data.isActive ? "none" : "876000h",
      user_metadata: { phone_number: phone },
    };
    if (data.password) attributes.password = data.password;
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      data.userId,
      attributes,
    );
    if (authError) throw new Error(authError.message);
    const { error } = await supabaseAdmin
      .from("profiles")
      .upsert({ user_id: data.userId, phone_number: phone, is_active: data.isActive });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setCourseAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; courseId: string; assigned: boolean }) => data)
  .handler(async ({ data, context }) => {
    await requireAdminOrAssigner(context);
    const query = data.assigned
      ? context.supabase
          .from("course_assignments")
          .upsert(
            { user_id: data.userId, course_id: data.courseId },
            { onConflict: "user_id,course_id" },
          )
      : context.supabase
          .from("course_assignments")
          .delete()
          .eq("user_id", data.userId)
          .eq("course_id", data.courseId);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listInquiries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { data, error } = await context.supabase
      .from("contact_requests")
      .select("id,contact_type,contact_value,message,status,created_at")
      .order("created_at", { ascending: false })
      .limit(250);
    if (error) throw new Error(error.message);
    return data;
  });

export const updateInquiryStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; status: "new" | "read" | "resolved" }) => data)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await context.supabase
      .from("contact_requests")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteInquiry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("contact_requests").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyAssignedCourses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Video locations are deliberately not selected here — see getCourseVideoAccess.
    const { data, error } = await context.supabase
      .from("course_assignments")
      .select(
        "id,assigned_at,expires_at,courses(id,title,description,notes,duration_minutes,price,is_published,categories(name))",
      )
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? []).flatMap((a) => {
      const c = a.courses;
      if (!c) return [];
      return [
        {
          id: a.id,
          assigned_at: a.assigned_at,
          expires_at: a.expires_at,
          courses: {
            id: c.id,
            title: c.title,
            description: c.description,
            notes: c.notes,
            duration_minutes: c.duration_minutes,
            price: c.price,
            is_published: c.is_published,
            categories: c.categories ? { name: c.categories.name } : null,
          },
        },
      ];
    });
  });

const VIDEO_URL_TTL_SECONDS = 900;

// The only place a video location leaves the server. Checks, in order: the student is
// enrolled in this course, the enrollment has not expired, and the request comes from the
// one device registered to this student (the first device to open a video is registered).
export const getCourseVideoAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { courseId: string; deviceId: string }) => data)
  .handler(async ({ data, context }) => {
    const deviceId = data.deviceId?.trim();
    if (!deviceId || deviceId.length < 16 || deviceId.length > 100)
      throw new Error("This device could not be verified.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: assignment }, { data: profile }] = await Promise.all([
      supabaseAdmin
        .from("course_assignments")
        .select("expires_at")
        .eq("user_id", context.userId)
        .eq("course_id", data.courseId)
        .maybeSingle(),
      supabaseAdmin
        .from("profiles")
        .select("is_active")
        .eq("user_id", context.userId)
        .maybeSingle(),
    ]);
    if (!assignment) throw new Error("You are not enrolled in this course.");
    if (profile && profile.is_active === false) throw new Error("Your account is disabled.");
    if (assignment.expires_at && new Date(assignment.expires_at).getTime() < Date.now())
      throw new Error("Your access to this course has expired.");

    const devices = (supabaseAdmin as unknown as SupabaseClient).from("student_devices");
    const { data: bound } = await devices
      .select("device_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    const userAgent = getRequestHeader("user-agent")?.slice(0, 300) ?? null;
    if (!bound) {
      const { error: bindError } = await (supabaseAdmin as unknown as SupabaseClient)
        .from("student_devices")
        .insert({ user_id: context.userId, device_id: deviceId, user_agent: userAgent });
      if (bindError) throw new Error("Could not register this device. Please try again.");
    } else if (bound.device_id !== deviceId) {
      throw new Error("DEVICE_MISMATCH");
    } else {
      await (supabaseAdmin as unknown as SupabaseClient)
        .from("student_devices")
        .update({ last_seen_at: new Date().toISOString(), user_agent: userAgent })
        .eq("user_id", context.userId);
    }

    const { data: course } = await supabaseAdmin
      .from("courses")
      .select("video_url,video_path")
      .eq("id", data.courseId)
      .maybeSingle();
    if (!course) throw new Error("This video isn't available.");
    if (course.video_path) {
      const { data: signed, error } = await supabaseAdmin.storage
        .from(COURSE_VIDEO_BUCKET)
        .createSignedUrl(course.video_path, VIDEO_URL_TTL_SECONDS);
      if (error || !signed) throw new Error("Could not prepare the video. Please try again.");
      return { url: signed.signedUrl, expiresInSeconds: VIDEO_URL_TTL_SECONDS };
    }
    if (!course.video_url) throw new Error("This video isn't available.");
    return { url: course.video_url, expiresInSeconds: null };
  });

export const resetStudentDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as unknown as SupabaseClient)
      .from("student_devices")
      .delete()
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getExploreCourses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: assigned, error: assignedError } = await context.supabase
      .from("course_assignments")
      .select("course_id")
      .eq("user_id", context.userId);
    if (assignedError) throw new Error(assignedError.message);
    const assignedIds = (assigned ?? []).map((a) => a.course_id);
    let query = context.supabase
      .from("courses")
      .select("id,title,description,duration_minutes,price,category_id,categories(name)")
      .eq("is_published", true)
      .order("created_at", { ascending: false });
    if (assignedIds.length) query = query.not("id", "in", `(${assignedIds.join(",")})`);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      durationMinutes: c.duration_minutes,
      price: c.price,
      categoryName: c.categories?.name ?? null,
    }));
  });

export const requestCourseAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { courseId: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("course_access_requests").upsert(
      {
        user_id: context.userId,
        course_id: data.courseId,
        status: "pending",
        requested_at: new Date().toISOString(),
      },
      { onConflict: "user_id,course_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyCourseRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: requests, error: reqError }, { data: assignments, error: asgError }] =
      await Promise.all([
        context.supabase
          .from("course_access_requests")
          .select("id,requested_at,status,courses(id,title,categories(name))")
          .eq("user_id", context.userId)
          .order("requested_at", { ascending: false }),
        context.supabase
          .from("course_assignments")
          .select("course_id")
          .eq("user_id", context.userId),
      ]);
    if (reqError) throw new Error(reqError.message);
    if (asgError) throw new Error(asgError.message);
    const enrolledIds = new Set((assignments ?? []).map((a) => a.course_id));
    return (requests ?? []).flatMap((r) => {
      const c = r.courses;
      if (!c || enrolledIds.has(c.id)) return [];
      return [
        {
          id: r.id,
          requestedAt: r.requested_at,
          courseId: c.id,
          title: c.title,
          categoryName: c.categories?.name ?? null,
          status: r.status,
        },
      ];
    });
  });

export const createStaffAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { email: string; password: string; role: "admin" | "assigner" }) => data)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const email = data.email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Enter a valid email address");
    if (data.password.length < 8) throw new Error("Password must be at least 8 characters");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
    });
    if (createError || !created.user) {
      if (createError?.message.toLowerCase().includes("already"))
        throw new Error("An account already exists for this email.");
      throw new Error("The account could not be created.");
    }
    const { error: insertError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: data.role });
    if (insertError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error("The account could not be created.");
    }
    return { ok: true };
  });

export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id,role,created_at")
      .in("role", ["admin", "assigner"])
      .order("created_at", { ascending: false });
    const staff = await Promise.all(
      (roles ?? []).map(async (r) => {
        const { data } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
        return {
          userId: r.user_id,
          role: r.role as "admin" | "assigner",
          email: data.user?.email ?? "—",
          createdAt: r.created_at,
        };
      }),
    );
    return staff;
  });
