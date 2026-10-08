import { createServerFn } from "@tanstack/react-start";
import { getCountries, type CountryCode } from "libphonenumber-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isValidPhone, normalizePhone, phoneToLoginEmail } from "@/lib/phone-auth";

const countries = new Set<string>(getCountries());
const studentAccountSchema = z
  .object({
    country: z
      .string()
      .length(2)
      .refine((country) => countries.has(country), "Select a valid country."),
    phone: z.string().trim().min(4).max(30),
    password: z.string().min(8, "Use at least 8 characters.").max(72),
  })
  .superRefine((data, context) => {
    if (!isValidPhone(data.phone, data.country as CountryCode)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "Enter a valid phone number for the selected country.",
      });
    }
  });

export const createStudentAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => studentAccountSchema.parse(input))
  .handler(async ({ data, context }) => {
    // Admins and assigners may create student logins.
    const [admin, assigner] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "assigner" }),
    ]);
    if ((admin.error || !admin.data) && (assigner.error || !assigner.data)) {
      throw new Error("Forbidden");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const normalizedPhone = normalizePhone(data.phone, data.country as CountryCode);
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: phoneToLoginEmail(normalizedPhone),
      password: data.password,
      email_confirm: true,
      user_metadata: { phone_number: normalizedPhone },
    });
    if (createError || !created.user) {
      if (createError?.message.toLowerCase().includes("already"))
        throw new Error("An account already exists for this phone number.");
      throw new Error("The student account could not be created.");
    }

    const { error: insertError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: "student" });
    if (insertError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error("The student account could not be created.");
    }
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({ user_id: created.user.id, phone_number: normalizedPhone, is_active: true });
    if (profileError) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", created.user.id);
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error("The student account could not be created.");
    }
    return { ok: true, phone: normalizedPhone };
  });
