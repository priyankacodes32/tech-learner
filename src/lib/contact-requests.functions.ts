import { createClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { isValidPhone, normalizePhone } from "@/lib/phone-auth";

const contactRequestSchema = z
  .object({
    phone: z.string().trim().max(30),
    email: z.string().trim().max(255),
    message: z.string().trim().min(10, "Please share a little more detail.").max(2000),
  })
  .superRefine((data, context) => {
    const hasPhone = isValidPhone(data.phone);
    const hasEmail = z.string().email().safeParse(data.email).success;
    if (!hasPhone && !hasEmail) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid phone number or email address.",
      });
    }
  });

export const submitContactRequest = createServerFn({ method: "POST" })
  .inputValidator((input) => contactRequestSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const supabasePublic = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`)
            headers.delete("Authorization");
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        },
      },
    });

    const phone = isValidPhone(data.phone) ? normalizePhone(data.phone) : "";
    const email = data.email.trim().toLowerCase();
    const { error } = await supabasePublic.from("contact_requests").insert({
      contact_type: phone ? "phone" : "email",
      contact_value: phone || email,
      message: data.message.trim(),
    });

    if (error) throw new Error("Your message could not be sent. Please try again.");
    return { ok: true };
  });

export const getContactRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: hasAdminRole, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !hasAdminRole) throw new Error("Forbidden");

    const { data, error } = await context.supabase
      .from("contact_requests")
      .select("id, contact_type, contact_value, message, status, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error("The inbox could not be loaded.");
    return data;
  });
