import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/opportunities";

/** The bits of a member's profile used to match jobs and opportunities to them. */
export async function profileForMatching(db: SupabaseClient, personId: string): Promise<Profile> {
  const { data } = await db.from("member_profiles").select("profession, skills, headline, home_county").eq("person_id", personId).single();
  return { profession: data?.profession ?? null, skills: data?.skills ?? [], headline: data?.headline ?? null, county: data?.home_county ?? null };
}
