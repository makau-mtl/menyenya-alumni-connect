import "server-only";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/server";
import { getCauseProgress } from "@/lib/data";

export type PublicFigures = {
  members: number; alumni: number; friends: number; classes: number; regions: number;
  students: number | null; needy_students: number | null; supported_by_alumni: number | null; school_as_of: string | null;
  tuitionPledged: number | null;
};

/** Live totals for the website. Null when the database isn't connected. */
export async function getPublicFigures(): Promise<PublicFigures | null> {
  if (!isSupabaseConfigured) return null;
  const [{ data, error }, progress] = await Promise.all([
    createPublicClient().rpc("public_figures"),
    getCauseProgress("tuition-block").catch(() => null),
  ]);
  if (error || !data) {
    if (error) console.error("Could not read figures", error);
    return null;
  }
  return { ...(data as Omit<PublicFigures, "tuitionPledged">), tuitionPledged: progress?.pledged ?? null };
}
