import "server-only";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSessionClient } from "@/lib/supabase/server";

// Who is signed in and what they may do in the admin area. The database rules check
// every change again; this decides what to show and gives clear messages.
export const getStaff = cache(async () => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createSessionClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return null;
  const [admin, finance, news] = await Promise.all([
    supabase.rpc("is_admin"),
    supabase.rpc("is_finance"),
    supabase.rpc("can_edit_news"),
  ]);
  return {
    supabase,
    email: (claims.claims.email as string | undefined) ?? "",
    isAdmin: admin.data === true,
    isFinance: finance.data === true,
    canEditNews: news.data === true,
  };
});

export type Staff = NonNullable<Awaited<ReturnType<typeof getStaff>>>;

export type ActionState = { ok?: boolean; message?: string; errors?: Record<string, string> } | null;
