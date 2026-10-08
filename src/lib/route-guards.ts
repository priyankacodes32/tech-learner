import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

async function requireRole(roles: Array<"admin" | "assigner">) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw redirect({ to: "/" });
  const { data: rows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id);
  const userRoles = new Set((rows ?? []).map((r) => r.role));
  if (!roles.some((r) => userRoles.has(r))) throw redirect({ to: "/dashboard" });
}

export const requireAdminRoute = () => requireRole(["admin"]);
export const requireAssignerRoute = () => requireRole(["admin", "assigner"]);
