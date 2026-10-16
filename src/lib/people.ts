import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toPhoto } from "@/lib/photos";
import { signedPhotoUrls } from "@/lib/members/photo-urls";

export type PersonCardData = {
  key: string;
  name: string;
  subtitle: string;
  classLabel: string | null;
  capacityNote: string | null;
  summary: string | null;
  linkedinUrl: string | null;
  photo: string | null;
  term: string | null;
  link?: string;
};

type PositionRow = {
  id: string; section: "leadership" | "secretariat"; title: string; person_id: string | null; name: string;
  capacity_note: string | null; summary: string | null; linkedin_url: string | null; photo_path: string | null;
  photo_is_member: boolean; category: string | null; year_left: number | null; has_tenure: boolean;
};

const monthYear = new Intl.DateTimeFormat("en-KE", { month: "long", year: "numeric", timeZone: "Africa/Nairobi" });

export function classLabel(category: string | null, year: number | null) {
  if (category === "alumnus" && year) return `Class of ${year}`;
  if (category === "friend") return "Friend of the alumni";
  return null;
}

/** Leadership and secretariat cards. Term dates only when `terms` is given (signed-in members). */
export async function loadPositions(db: SupabaseClient, terms: Map<string, { term_starts: string | null; term_ends: string | null }> | null) {
  const { data, error } = await db.rpc("people_positions");
  if (error) {
    console.error("Could not read positions", error);
    return { leadership: [], secretariat: [] };
  }
  const rows = (data ?? []) as PositionRow[];
  const signed = await signedPhotoUrls(db, rows.filter((r) => r.photo_is_member).map((r) => r.photo_path), "large");
  const card = (r: PositionRow): PersonCardData => {
    const t = terms?.get(r.id);
    const term = !terms
      ? r.has_tenure ? null : "No fixed term"
      : r.has_tenure
        ? t?.term_starts || t?.term_ends
          ? `Term: ${t.term_starts ? monthYear.format(new Date(t.term_starts)) : "?"} to ${t.term_ends ? monthYear.format(new Date(t.term_ends)) : "?"}`
          : null
        : "No fixed term";
    return {
      key: r.id,
      name: r.name,
      subtitle: r.title,
      classLabel: classLabel(r.category, r.year_left),
      capacityNote: r.capacity_note,
      summary: r.summary,
      linkedinUrl: r.linkedin_url,
      photo: r.photo_path ? (r.photo_is_member ? signed.get(r.photo_path) ?? null : toPhoto(r.photo_path, r.name).src) : null,
      term,
    };
  };
  return {
    leadership: rows.filter((r) => r.section === "leadership").map(card),
    secretariat: rows.filter((r) => r.section === "secretariat").map(card),
  };
}
