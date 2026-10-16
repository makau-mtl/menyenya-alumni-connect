"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getMember } from "@/lib/members/session";
import { MEMBER_PHOTO_BUCKET, memberPhotoFile } from "@/lib/members/photos";
import { toInternational } from "@/lib/phone";
import { occupationOptions, type Occupation } from "@/lib/registration";
import type { ActionState } from "@/lib/admin/staff";

// Members change their own details here. The database rules allow only their own record,
// and stop them changing their status or verification.

async function memberOrError() {
  const m = await getMember();
  if (!m) return "Your sign-in has expired. Log in again.";
  if (!m.registered || !m.personId) return "Finish registering first.";
  return m;
}

const done = (message: string): ActionState => {
  revalidatePath("/app", "layout");
  return { ok: true, message };
};
const fail = (message: string, errors?: Record<string, string>): ActionState => ({ ok: false, message, errors });

export async function uploadMemberPhoto(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const m = await memberOrError();
  if (typeof m === "string") return fail(m);
  const large = formData.get("large");
  const small = formData.get("small");
  for (const f of [large, small]) {
    if (!(f instanceof File) || f.size === 0 || f.size > 1024 * 1024 || !["image/webp", "image/jpeg"].includes(f.type)) {
      return fail("That photo couldn't be used. Try another JPG or PNG.");
    }
  }
  const path = `${m.personId}/${crypto.randomUUID()}`;
  for (const [file, size] of [[large as File, "large"], [small as File, "small"]] as const) {
    const { error } = await m.supabase.storage
      .from(MEMBER_PHOTO_BUCKET)
      .upload(memberPhotoFile(path, size), file, { contentType: file.type, cacheControl: "3600", upsert: false });
    if (error) {
      console.error("Member photo upload failed", error);
      return fail("The photo could not be saved. Please try again.");
    }
  }
  const { error } = await m.supabase.from("member_profiles").update({ photo_path: path }).eq("person_id", m.personId);
  if (error) return fail("The photo could not be saved. Please try again.");
  return done("Photo saved. Classmates will see it in the directory.");
}

export async function removeMemberPhoto(): Promise<void> {
  const m = await memberOrError();
  if (typeof m === "string") return;
  await m.supabase.from("member_profiles").update({ photo_path: null }).eq("person_id", m.personId);
  revalidatePath("/app", "layout");
}

function normaliseUrl(v: string) {
  const s = v.trim();
  if (!s) return "";
  return /^https?:\/\//i.test(s) ? s.replace(/^http:\/\//i, "https://") : `https://${s}`;
}

const url = z.string().max(300).refine((v) => v === "" || /^https:\/\/[^\s.]+\.[^\s]+$/.test(v), "Enter a web address, for example https://example.com");

const workSchema = z.object({
  headline: z.string().trim().max(160, "Keep this under 160 characters"),
  occupation_status: z.enum(occupationOptions.map((o) => o.value) as [Occupation, ...Occupation[]]).or(z.literal("")),
  profession: z.string().trim().max(80),
  employer_or_business: z.string().trim().max(120),
  products_services: z.string().trim().max(300),
  skills: z.array(z.string().trim().min(1).max(40)).max(15, "Up to 15 skills"),
  linkedin_url: url.refine((v) => v === "" || /^https:\/\/([a-z]+\.)?linkedin\.com\//i.test(v), "This should be a linkedin.com link"),
  profile_link: url,
  social_links: z.array(z.object({ label: z.string().trim().min(1).max(30), url })).max(3),
  willing_to_volunteer: z.boolean(),
  mentoring_offer: z.enum(["none", "can_mentor", "wants_mentor"]),
});

export async function saveWork(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const m = await memberOrError();
  if (typeof m === "string") return fail(m);
  const socials = [0, 1, 2]
    .map((i) => ({ label: String(formData.get(`social_label_${i}`) ?? "").trim(), url: normaliseUrl(String(formData.get(`social_url_${i}`) ?? "")) }))
    .filter((s) => s.label || s.url);
  const parsed = workSchema.safeParse({
    headline: formData.get("headline") ?? "",
    occupation_status: formData.get("occupation_status") ?? "",
    profession: formData.get("profession") ?? "",
    employer_or_business: formData.get("employer_or_business") ?? "",
    products_services: formData.get("products_services") ?? "",
    skills: String(formData.get("skills") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    linkedin_url: normaliseUrl(String(formData.get("linkedin_url") ?? "")),
    profile_link: normaliseUrl(String(formData.get("profile_link") ?? "")),
    social_links: socials,
    willing_to_volunteer: formData.get("willing_to_volunteer") === "on",
    mentoring_offer: formData.get("mentoring_offer") ?? "none",
  });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return fail("Please fix the highlighted fields.", errors);
  }
  const w = parsed.data;

  // Mentoring choices depend on the member's level (SPEC §5.1).
  const { data: lv } = await m.supabase
    .from("member_profiles")
    .select("membership_levels(can_mentor, can_request_mentor)")
    .eq("person_id", m.personId)
    .single();
  const flags = (lv?.membership_levels as unknown as { can_mentor: boolean; can_request_mentor: boolean } | null) ?? null;
  if ((w.mentoring_offer === "can_mentor" && !flags?.can_mentor) || (w.mentoring_offer === "wants_mentor" && !flags?.can_request_mentor)) {
    return fail("That mentoring choice isn't available for your membership level.");
  }

  const { error } = await m.supabase
    .from("member_profiles")
    .update({
      headline: w.headline || null,
      occupation_status: w.occupation_status || null,
      profession: w.profession || null,
      employer_or_business: w.employer_or_business || null,
      products_services: w.products_services || null,
      skills: w.skills,
      linkedin_url: w.linkedin_url || null,
      profile_link: w.profile_link || null,
      social_links: w.social_links,
      willing_to_volunteer: w.willing_to_volunteer,
      mentoring_offer: w.mentoring_offer,
    })
    .eq("person_id", m.personId);
  if (error) {
    console.error(error);
    return fail("Your changes could not be saved. Please try again.");
  }
  return done("Saved.");
}

const kinSchema = z.object({
  name: z.string().trim().min(3, "Enter their full name").max(120),
  relationship: z.string().trim().min(2, "Say how they're related to you").max(60),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/, "Enter a valid phone number"),
});

export async function saveWelfareContact(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const m = await memberOrError();
  if (typeof m === "string") return fail(m);
  const phone = toInternational(String(formData.get("phone_country") ?? "KE"), String(formData.get("phone") ?? "")) ?? "";
  const parsed = kinSchema.safeParse({ name: formData.get("name"), relationship: formData.get("relationship"), phone });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return fail("Please fix the highlighted fields.", errors);
  }
  const { data: existing } = await m.supabase.from("next_of_kin").select("id").eq("person_id", m.personId).limit(1).maybeSingle();
  const { error } = existing
    ? await m.supabase.from("next_of_kin").update(parsed.data).eq("id", existing.id)
    : await m.supabase.from("next_of_kin").insert({ ...parsed.data, person_id: m.personId });
  if (error) {
    console.error(error);
    return fail("This could not be saved. Please try again.");
  }
  return done("Saved. Only you and the Welfare Coordinator can see this.");
}

const choiceKeys = ["directory_listing", "email_updates", "whatsapp_updates", "public_profile"] as const;

export async function saveChoices(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const m = await memberOrError();
  if (typeof m === "string") return fail(m);
  const { data: rows } = await m.supabase
    .from("consents")
    .select("purpose, granted, created_at")
    .eq("person_id", m.personId)
    .order("created_at", { ascending: false });
  const current = new Map<string, boolean>();
  for (const r of rows ?? []) if (!current.has(r.purpose)) current.set(r.purpose, r.granted);
  // A new row for each change keeps the history (SPEC §5.1).
  const changes = choiceKeys
    .map((k) => ({ purpose: k, granted: formData.get(k) === "on" }))
    .filter((c) => current.get(c.purpose) !== c.granted)
    .map((c) => ({ ...c, person_id: m.personId, wording_version: "v1" }));
  if (changes.length) {
    const { error } = await m.supabase.from("consents").insert(changes);
    if (error) {
      console.error(error);
      return fail("Your choices could not be saved. Please try again.");
    }
  }
  return done(changes.length ? "Your choices are saved." : "Nothing changed.");
}
