import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ImpactFigure = { id: string; value: string; label: string; as_of: string; note: string; cause_slug: string; cause_title: string };

/** Published impact figures, optionally for one initiative. Typed by officials, never computed. */
export async function loadImpactFigures(db: SupabaseClient | null, causeSlug?: string): Promise<ImpactFigure[]> {
  if (!db) return [];
  const { data, error } = await db
    .from("impact_figures")
    .select("id, value, label, as_of, note, sort_order, causes!inner(slug, title, sort_order)")
    .eq("status", "published")
    .order("sort_order");
  if (error) {
    console.error("Could not read impact figures", error);
    return [];
  }
  const rows = (data ?? []).map((r) => {
    const c = r.causes as unknown as { slug: string; title: string; sort_order: number };
    return { id: r.id, value: r.value, label: r.label, as_of: r.as_of, note: r.note, cause_slug: c.slug, cause_title: c.title, order: c.sort_order };
  });
  return rows
    .filter((r) => !causeSlug || r.cause_slug === causeSlug)
    .sort((a, b) => a.order - b.order)
    .map((r) => ({ id: r.id, value: r.value, label: r.label, as_of: r.as_of, note: r.note, cause_slug: r.cause_slug, cause_title: r.cause_title }));
}

export const asAt = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" });
