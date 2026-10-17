import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Story photos are private until the story is published; they are shown through short-lived links.
export const STORY_BUCKET = "story-photos";
export const storyFile = (path: string, size: "large" | "small") => `${path}-${size === "large" ? 1600 : 800}.webp`;

export async function storyPhotoUrls(db: SupabaseClient, paths: (string | null)[], size: "large" | "small") {
  const urls = new Map<string, string>();
  const files = [...new Set(paths.filter((p): p is string => Boolean(p)))].map((p) => storyFile(p, size));
  if (!files.length) return urls;
  const { data } = await db.storage.from(STORY_BUCKET).createSignedUrls(files, 3600);
  for (const item of data ?? []) {
    if (item.signedUrl && item.path) urls.set(item.path.replace(/-(1600|800)\.webp$/, ""), item.signedUrl);
  }
  return urls;
}

export type PublicStory = {
  slug: string; title: string; summary: string; subject_name: string; subject_year_left: number | null;
  photo_path: string | null; photo_caption: string | null; featured: boolean; published_at: string;
};

export const storyStatus: Record<string, { label: string; tone: "good" | "warn" | "muted" | "bad" | "info" }> = {
  submitted: { label: "Waiting for review", tone: "warn" },
  published: { label: "On the website", tone: "good" },
  declined: { label: "Not published", tone: "muted" },
  archived: { label: "Hidden", tone: "muted" },
};

/** The short line under a story: "Class of 2009" (or nothing). */
export const classOf = (year: number | null) => (year ? `Class of ${year}` : null);

export type ReviewStory = {
  id: string; slug: string | null; kind: string; submitted_by_name: string; subject_name: string; subject_year_left: number | null;
  subject_contact: string | null; title: string; summary: string; body: string; photo_path: string | null; photo_caption: string | null;
  consent_given: boolean; consent_note: string; status: string; featured: boolean; editor_note: string; published_at: string | null; created_at: string;
};

export type StoryCardData = PublicStory & { photo: string | null };

/** Published stories for the website, with photo links. Empty when the database isn't connected. */
export async function loadPublicStories(db: SupabaseClient | null, limit = 24, featuredOnly = false): Promise<StoryCardData[]> {
  if (!db) return [];
  const { data, error } = await db.rpc("public_stories", { p_limit: limit, p_featured_only: featuredOnly });
  if (error) {
    console.error("Could not read stories", error);
    return [];
  }
  const rows = (data ?? []) as PublicStory[];
  const urls = await storyPhotoUrls(db, rows.map((r) => r.photo_path), "small");
  return rows.map((r) => ({ ...r, photo: r.photo_path ? urls.get(r.photo_path) ?? null : null }));
}

/** The summary to show on a card: the given one, or the start of the story. */
export const teaser = (summary: string, body?: string) =>
  summary || (body ? `${body.slice(0, 200).replace(/\s+\S*$/, "")}…` : "");
