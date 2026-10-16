import "server-only";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSessionClient } from "@/lib/supabase/server";

// The signed-in person, if any, and whether they have finished registering.
export const getMember = cache(async () => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createSessionClient();
  const { data: claims } = await supabase.auth.getClaims();
  const c = claims?.claims;
  if (!c) return null;
  const meta = (c.user_metadata ?? {}) as Record<string, unknown>;
  const { data: person } = await supabase
    .from("persons")
    .select("id, full_name, member_profiles(id, membership_status)")
    .eq("user_id", c.sub)
    .maybeSingle();
  const profile = (person?.member_profiles as unknown as { id: string; membership_status: string }[] | null)?.[0] ?? null;
  return {
    supabase,
    userId: c.sub,
    email: (c.email as string | undefined) ?? "",
    nameFromSignIn: String(meta.full_name ?? meta.name ?? "").trim(),
    personId: person?.id ?? null,
    fullName: person?.full_name ?? null,
    registered: Boolean(profile),
    membershipStatus: profile?.membership_status ?? null,
  };
});

export type Member = NonNullable<Awaited<ReturnType<typeof getMember>>>;
