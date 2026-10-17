"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getStaff, type ActionState, type Staff } from "@/lib/admin/staff";
import { hasPhoto, savePhoto, UploadError } from "@/lib/admin/uploads";
import { slugify, toParagraphs, youtubeId } from "@/lib/photos";
import { photoSpaceKeys } from "@/content/photo-spaces";

// Every action checks who is signed in; the database rules check again on every write.

type Need = "admin" | "news" | "shop" | "school" | "stories" | "reports" | "impact";

async function staffFor(need: Need): Promise<Staff | string> {
  const staff = await getStaff();
  if (!staff) return "Your sign-in has expired. Log in again and retry.";
  if (need === "admin" && !staff.isAdmin) return "Only administrators can change this.";
  if (need === "news" && !staff.canEditNews) return "Only administrators and the Secretary can change news.";
  if (need === "school" && !staff.canEditSchool) return "Only administrators and the school liaison can change the school's figures.";
  if (need === "shop" && !staff.canManageShop) return "Only administrators, the Secretary and the Treasurer can manage merchandise.";
  if (need === "impact" && !staff.canEditImpact) return "Only the officials can change impact figures.";
  if (need === "reports" && !staff.canManageReports) return "Only the Treasurer, the Chairman and administrators can manage reports.";
  if (need === "stories" && !staff.canEditStories) return "Only administrators, the Secretary and the Chairman can review stories.";
  return staff;
}

/** Content shows on many pages; refresh them all after any change. */
function refreshSite() {
  revalidatePath("/", "layout");
}

const fail = (message: string, errors?: Record<string, string>): ActionState => ({ ok: false, message, errors });

function fieldErrors(error: z.ZodError) {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) errors[String(issue.path[0])] ??= issue.message;
  return errors;
}

function uploadMessage(e: unknown) {
  if (e instanceof UploadError) return e.message;
  console.error(e);
  return "Something went wrong. Please try again.";
}

// Causes ----------------------------------------------------------------------------------------

const lifecycles = ["draft", "in_review", "approved", "preparation", "live", "construction", "closed"] as const;

const causeSchema = z.object({
  slug: z.string().min(1),
  title: z.string().trim().min(3, "Give the cause a title.").max(120, "Keep the title under 120 characters."),
  summary: z.string().trim().min(10, "Write a one or two sentence summary.").max(400, "Keep the summary under 400 characters."),
  story: z.string().max(10_000, "The story is too long."),
  components: z.array(z.object({ name: z.string().trim().max(80), purpose: z.string().trim().max(300) })).max(20),
  readiness: z.array(z.object({ label: z.string().trim().max(200), done: z.boolean() })).max(30),
  target: z
    .string()
    .transform((v) => v.replace(/[,\s]/g, ""))
    .refine((v) => v === "" || /^\d{1,12}$/.test(v), "Enter the target in shillings, numbers only.")
    .transform((v) => (v === "" ? null : Number(v))),
  lifecycle: z.enum(lifecycles),
  visibility: z.enum(["public", "members"]),
  pledgesEnabled: z.boolean(),
});

function parseJson(value: FormDataEntryValue | null) {
  try {
    return JSON.parse(String(value ?? "[]"));
  } catch {
    return [];
  }
}

export async function updateCause(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await staffFor("admin");
  if (typeof staff === "string") return fail(staff);

  const parsed = causeSchema.safeParse({
    slug: formData.get("slug"),
    title: formData.get("title"),
    summary: formData.get("summary"),
    story: formData.get("story") ?? "",
    components: parseJson(formData.get("components")),
    readiness: parseJson(formData.get("readiness")),
    target: formData.get("target") ?? "",
    lifecycle: formData.get("lifecycle"),
    visibility: formData.get("visibility"),
    pledgesEnabled: formData.get("pledgesEnabled") === "on",
  });
  if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrors(parsed.error));
  const c = parsed.data;

  const { data, error } = await staff.supabase
    .from("causes")
    .update({
      title: c.title,
      summary: c.summary,
      story: toParagraphs(c.story),
      components: c.components.filter((x) => x.name),
      readiness: c.readiness.filter((x) => x.label),
      target_amount: c.target,
      lifecycle: c.lifecycle,
      visibility: c.visibility,
      pledges_enabled: c.pledgesEnabled,
    })
    .eq("slug", c.slug)
    .select("slug");
  if (error || !data?.length) {
    if (error) console.error("Cause update failed", error);
    return fail("The changes could not be saved. Only administrators can edit causes.");
  }
  refreshSite();
  return { ok: true, message: "Saved. The website shows the changes now." };
}

export async function addCausePhoto(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await staffFor("admin");
  if (typeof staff === "string") return fail(staff);
  const slug = String(formData.get("slug") ?? "");
  const caption = String(formData.get("caption") ?? "").trim().slice(0, 200);

  const { data: cause } = await staff.supabase.from("causes").select("id").eq("slug", slug).maybeSingle();
  if (!cause) return fail("That cause was not found.");
  try {
    const path = await savePhoto(staff, `causes/${slug}`, formData);
    const { data: last } = await staff.supabase
      .from("cause_photos")
      .select("sort_order")
      .eq("cause_id", cause.id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await staff.supabase
      .from("cause_photos")
      .insert({ cause_id: cause.id, path, caption, sort_order: (last?.sort_order ?? 0) + 1 });
    if (error) throw error;
  } catch (e) {
    return fail(uploadMessage(e));
  }
  refreshSite();
  return { ok: true, message: "Photo added." };
}

/** Caption, cover, hide or show. Photos are hidden rather than deleted. */
export async function changeCausePhoto(formData: FormData): Promise<void> {
  const staff = await staffFor("admin");
  if (typeof staff === "string") return;
  const id = String(formData.get("id") ?? "");
  const change = String(formData.get("change") ?? "");
  const photos = staff.supabase.from("cause_photos");

  if (change === "caption") {
    await photos.update({ caption: String(formData.get("caption") ?? "").trim().slice(0, 200) }).eq("id", id);
  } else if (change === "hide" || change === "show") {
    await photos.update({ status: change === "hide" ? "archived" : "published" }).eq("id", id);
  } else if (change === "cover") {
    const { data: photo } = await photos.select("cause_id").eq("id", id).maybeSingle();
    if (!photo) return;
    const { data: first } = await staff.supabase
      .from("cause_photos")
      .select("sort_order")
      .eq("cause_id", photo.cause_id)
      .order("sort_order")
      .limit(1)
      .single();
    await staff.supabase.from("cause_photos").update({ sort_order: (first?.sort_order ?? 0) - 1 }).eq("id", id);
  }
  refreshSite();
}

// Site photos and the Chairman's video --------------------------------------------------------------

export async function setSitePhoto(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await staffFor("admin");
  if (typeof staff === "string") return fail(staff);
  const space = String(formData.get("space") ?? "");
  if (!photoSpaceKeys.has(space)) return fail("Unknown photo space.");
  const caption = String(formData.get("caption") ?? "").trim().slice(0, 200);
  try {
    const path = await savePhoto(staff, `site/${space}`, formData);
    const { error } = await staff.supabase
      .from("site_photos")
      .upsert({ slot: space, path, caption, status: "published" }, { onConflict: "slot" });
    if (error) throw error;
  } catch (e) {
    return fail(uploadMessage(e));
  }
  refreshSite();
  return { ok: true, message: "Photo saved." };
}

export async function removeSitePhoto(formData: FormData): Promise<void> {
  const staff = await staffFor("admin");
  if (typeof staff === "string") return;
  await staff.supabase.from("site_photos").update({ status: "archived" }).eq("slot", String(formData.get("space") ?? ""));
  refreshSite();
}

export async function saveChairVideo(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await staffFor("admin");
  if (typeof staff === "string") return fail(staff);
  const link = String(formData.get("link") ?? "").trim();
  const id = link === "" ? null : youtubeId(link);
  if (link !== "" && !id) {
    return fail("That doesn't look like a YouTube link. Copy it from the Share button on YouTube.", { link: "Not a YouTube link" });
  }
  const { error } = await staff.supabase
    .from("site_settings")
    .upsert({ key: "chair_video", value: { youtubeId: id } }, { onConflict: "key" });
  if (error) {
    console.error(error);
    return fail("The video could not be saved.");
  }
  refreshSite();
  return { ok: true, message: id ? "Video saved. It now shows on the home page." : "Video removed." };
}

// News and events ---------------------------------------------------------------------------------

const newsSchema = z.object({
  id: z.string(),
  kind: z.enum(["news", "event"]),
  title: z.string().trim().min(3, "Give the post a title.").max(140, "Keep the title under 140 characters."),
  summary: z.string().trim().min(10, "Write a short summary.").max(400, "Keep the summary under 400 characters."),
  body: z.string().max(20_000, "The story is too long."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date."),
  status: z.enum(["draft", "published", "archived"]),
  photoCaption: z.string().trim().max(200),
});

async function freeSlug(staff: Staff, title: string) {
  const base = slugify(title) || "post";
  const { data } = await staff.supabase.from("news_posts").select("slug").like("slug", `${base}%`);
  const taken = new Set((data ?? []).map((r) => r.slug));
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

export async function saveNews(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await staffFor("news");
  if (typeof staff === "string") return fail(staff);

  const parsed = newsSchema.safeParse({
    id: formData.get("id") ?? "",
    kind: formData.get("kind"),
    title: formData.get("title"),
    summary: formData.get("summary"),
    body: formData.get("body") ?? "",
    date: formData.get("date"),
    status: formData.get("status"),
    photoCaption: formData.get("photoCaption") ?? "",
  });
  if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrors(parsed.error));
  const n = parsed.data;

  const row: Record<string, unknown> = {
    kind: n.kind,
    title: n.title,
    summary: n.summary,
    body: toParagraphs(n.body),
    happens_on: n.date,
    status: n.status,
    photo_caption: n.photoCaption,
  };

  try {
    let slug: string;
    if (n.id) {
      const { data: existing } = await staff.supabase.from("news_posts").select("slug").eq("id", n.id).maybeSingle();
      if (!existing) return fail("That post was not found.");
      slug = existing.slug;
    } else {
      slug = await freeSlug(staff, n.title);
      row.slug = slug;
    }
    if (hasPhoto(formData)) row.photo_path = await savePhoto(staff, `news/${slug}`, formData);
    else if (formData.get("removePhoto") === "on") row.photo_path = null;

    const query = n.id
      ? staff.supabase.from("news_posts").update(row).eq("id", n.id).select("id")
      : staff.supabase.from("news_posts").insert(row).select("id");
    const { data, error } = await query;
    if (error || !data?.length) throw error ?? new Error("No row saved");
  } catch (e) {
    return fail(uploadMessage(e));
  }
  refreshSite();
  redirect("/admin/news?saved=1");
}

// Members: registration switch and class invite links -------------------------------------------

export async function setRegistrationOpen(formData: FormData): Promise<void> {
  const staff = await staffFor("admin");
  if (typeof staff === "string") return;
  await staff.supabase
    .from("module_settings")
    .update({ enabled: formData.get("open") === "true" })
    .eq("module_key", "registration");
  revalidatePath("/admin/members");
  revalidatePath("/join");
}

export async function createInviteLink(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await staffFor("admin");
  if (typeof staff === "string") return fail(staff);
  const year = Number(formData.get("year") ?? 0);
  const label = String(formData.get("label") ?? "").trim().slice(0, 80);
  let cohortId: string | null = null;
  if (year) {
    const { data } = await staff.supabase.from("cohorts").select("id").eq("year_left", year).maybeSingle();
    cohortId = data?.id ?? null;
  }
  if (!label && !cohortId) return fail("Choose a class, or give the link a name.");
  let inviter: string | null = null;
  if (formData.get("fromMe") === "on") {
    const { data } = await staff.supabase.rpc("current_person_id");
    inviter = (data as string | null) ?? null;
  }
  const { error } = await staff.supabase.from("invite_links").insert({
    label: label || `Class of ${year}`,
    cohort_id: cohortId,
    inviter_person_id: inviter,
    created_by: inviter,
  });
  if (error) {
    console.error(error);
    return fail("The link could not be created.");
  }
  revalidatePath("/admin/members");
  return { ok: true, message: "Link created. Copy it from the list below." };
}

export async function setInviteActive(formData: FormData): Promise<void> {
  const staff = await staffFor("admin");
  if (typeof staff === "string") return;
  await staff.supabase
    .from("invite_links")
    .update({ active: formData.get("active") === "true" })
    .eq("id", String(formData.get("id") ?? ""));
  revalidatePath("/admin/members");
}

// Settings: confirmation (verification) and the rejoin window ---------------------------------------

const confirmRoles = ["cohort_rep", "cluster_rep", "verifier", "admin"] as const;

export async function saveMemberSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await staffFor("admin");
  if (typeof staff === "string") return fail(staff);
  const enabled = formData.get("verification") === "on";
  const pick = (cat: string) => confirmRoles.filter((r) => formData.get(`${cat}_${r}`) === "on");
  const config = { alumnus: pick("alumnus"), friend: pick("friend") };
  if (enabled && (!config.alumnus.length || !config.friend.length)) {
    return fail("Choose at least one role to confirm alumni and one to confirm friends, or switch confirmation off.");
  }
  const days = Number(formData.get("rejoinDays"));
  if (!Number.isInteger(days) || days < 0 || days > 365) return fail("The rejoin window must be between 0 and 365 days.");

  const [a, b] = await Promise.all([
    staff.supabase.from("module_settings").update({ enabled, config }).eq("module_key", "verification").select("id"),
    staff.supabase.from("module_settings").update({ config: { rejoin_days: days } }).eq("module_key", "membership_exit").select("id"),
  ]);
  if (a.error || b.error || !a.data?.length || !b.data?.length) return fail("The settings could not be saved.");
  revalidatePath("/", "layout");
  return { ok: true, message: "Settings saved." };
}

// Roles -------------------------------------------------------------------------------------------------

export async function assignRole(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await staffFor("admin");
  if (typeof staff === "string") return fail(staff);
  const person = String(formData.get("person") ?? "");
  const roleKey = String(formData.get("role") ?? "");
  const { data: role } = await staff.supabase.from("roles").select("id, allowed_scope_types").eq("key", roleKey).maybeSingle();
  if (!person || !role) return fail("Choose a person and a role.");
  // The school liaison works for the one school, so the role covers the whole association.
  const declared = (role.allowed_scope_types as string[])[0] ?? "association";
  const scope = declared === "school" ? "association" : declared;
  let scopeId: string | null = null;
  if (scope === "cohort") {
    const { data } = await staff.supabase.from("cohorts").select("id").eq("year_left", Number(formData.get("year"))).maybeSingle();
    scopeId = data?.id ?? null;
    if (!scopeId) return fail("Choose the class for this role.");
  } else if (scope === "cluster") {
    const { data } = await staff.supabase.from("clusters").select("id").eq("name", String(formData.get("region") ?? "")).maybeSingle();
    scopeId = data?.id ?? null;
    if (!scopeId) return fail("Choose the regional cluster for this role.");
  } else if (scope === "committee") {
    scopeId = String(formData.get("committee") ?? "") || null;
    if (!scopeId) return fail("Choose the committee for this role.");
  } else if (scope !== "association") {
    return fail("This role can't be given from here yet.");
  }
  const { data: me } = await staff.supabase.rpc("current_person_id");
  const { error } = await staff.supabase.from("role_assignments").insert({
    person_id: person,
    role_id: role.id,
    scope_type: scope,
    scope_id: scopeId,
    assigned_by: me ?? null,
    starts_on: String(formData.get("startsOn") || new Date().toISOString().slice(0, 10)),
  });
  if (error) {
    console.error(error);
    return fail(/check|policy|row-level/i.test(error.message) ? "You can't give yourself a role. Ask another administrator." : "The role could not be given.");
  }
  revalidatePath("/admin/roles");
  return { ok: true, message: "Role given. It takes effect the next time they open a page." };
}

export async function endRole(formData: FormData): Promise<void> {
  const staff = await staffFor("admin");
  if (typeof staff === "string") return;
  await staff.supabase
    .from("role_assignments")
    .update({ ends_on: new Date().toISOString().slice(0, 10) })
    .eq("id", String(formData.get("id") ?? ""))
    .is("ends_on", null);
  revalidatePath("/admin/roles");
}

// Duplicates --------------------------------------------------------------------------------------------

export async function resolveDuplicate(formData: FormData): Promise<void> {
  const staff = await getStaff();
  if (!staff || !(staff.isAdmin || staff.isVerifier)) return;
  const action = String(formData.get("action") ?? "");
  if (action === "dismiss") {
    await staff.supabase.rpc("dismiss_duplicate", { p_flag: String(formData.get("flag") ?? "") });
  } else if (action === "merge") {
    const { error } = await staff.supabase.rpc("merge_persons", {
      p_survivor: String(formData.get("survivor") ?? ""),
      p_merged: String(formData.get("merged") ?? ""),
      p_note: String(formData.get("note") ?? "") || null,
    });
    if (error) redirect(`/admin/duplicates?error=${encodeURIComponent(error.code === "22023" ? error.message : "The records could not be merged.")}`);
  } else if (action === "undo") {
    const { error } = await staff.supabase.rpc("undo_merge", { p_merge: String(formData.get("merge") ?? "") });
    if (error) redirect(`/admin/duplicates?error=${encodeURIComponent("The merge could not be undone.")}`);
  }
  revalidatePath("/admin/duplicates");
  redirect("/admin/duplicates?done=1");
}

// Our people: leadership and secretariat positions -----------------------------------------------------

const linkedinPattern = /^https:\/\/([a-z]+\.)?linkedin\.com\//i;
const optionalText = (max: number, message: string) =>
  z.string().trim().max(max, message).transform((v) => (v === "" ? null : v));
const optionalDate = z
  .string()
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Enter a date.")
  .transform((v) => (v === "" ? null : v));

const positionSchema = z
  .object({
    id: z.string(),
    section: z.enum(["leadership", "secretariat"]),
    title: z.string().trim().min(2, "Name the role, for example Chair.").max(120, "Keep the role under 120 characters."),
    holder: z.enum(["member", "other"]),
    personId: z.string(),
    displayName: z.string().trim().max(120, "Keep the name under 120 characters."),
    capacityNote: optionalText(200, "Keep this under 200 characters."),
    summary: optionalText(400, "Keep the summary under 400 characters."),
    linkedinUrl: optionalText(300, "That link is too long.").refine((v) => v === null || linkedinPattern.test(v), "Paste a LinkedIn link starting with https://www.linkedin.com/"),
    hasTenure: z.boolean(),
    termStarts: optionalDate,
    termEnds: optionalDate,
    status: z.enum(["published", "draft"]),
  })
  .superRefine((v, ctx) => {
    if (v.holder === "member" && !v.personId) ctx.addIssue({ code: "custom", path: ["personId"], message: "Choose the member who holds this role." });
    if (v.holder === "other" && v.displayName.length < 2) ctx.addIssue({ code: "custom", path: ["displayName"], message: "Type the person's name." });
    if (v.hasTenure && v.termStarts && v.termEnds && v.termEnds < v.termStarts)
      ctx.addIssue({ code: "custom", path: ["termEnds"], message: "The term must end after it starts." });
  });

export async function savePosition(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await staffFor("admin");
  if (typeof staff === "string") return fail(staff);
  const parsed = positionSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    section: formData.get("section"),
    title: String(formData.get("title") ?? ""),
    holder: formData.get("holder"),
    personId: String(formData.get("personId") ?? ""),
    displayName: String(formData.get("displayName") ?? ""),
    capacityNote: String(formData.get("capacityNote") ?? ""),
    summary: String(formData.get("summary") ?? ""),
    linkedinUrl: String(formData.get("linkedinUrl") ?? ""),
    hasTenure: formData.get("hasTenure") === "yes",
    termStarts: String(formData.get("termStarts") ?? ""),
    termEnds: String(formData.get("termEnds") ?? ""),
    status: formData.get("status") === "draft" ? "draft" : "published",
  });
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrors(parsed.error));
  const v = parsed.data;
  const member = v.holder === "member";

  const row: Record<string, unknown> = {
    section: v.section,
    title: v.title,
    person_id: member ? v.personId : null,
    display_name: member ? null : v.displayName,
    capacity_note: v.capacityNote,
    // A member's summary, LinkedIn and photo come from their own profile.
    summary: member ? null : v.summary,
    linkedin_url: member ? null : v.linkedinUrl,
    has_tenure: v.hasTenure,
    term_starts: v.hasTenure ? v.termStarts : null,
    term_ends: v.hasTenure ? v.termEnds : null,
    status: v.status,
  };
  try {
    if (member) row.photo_path = null;
    else if (hasPhoto(formData)) row.photo_path = await savePhoto(staff, "people", formData);
  } catch (e) {
    return fail(uploadMessage(e));
  }

  if (v.id) {
    const { data, error } = await staff.supabase.from("public_positions").update(row).eq("id", v.id).select("id");
    if (error || !data?.length) {
      console.error(error);
      return fail("The position could not be saved.");
    }
  } else {
    const { data: last } = await staff.supabase
      .from("public_positions")
      .select("sort_order")
      .eq("section", v.section)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await staff.supabase.from("public_positions").insert({ ...row, sort_order: (last?.sort_order ?? 0) + 10 });
    if (error) {
      console.error(error);
      return fail("The position could not be added.");
    }
  }
  refreshSite();
  redirect("/admin/people?saved=1");
}

/** Hide, show or remove (archive) a position. Nothing is ever deleted. */
export async function setPositionStatus(formData: FormData): Promise<void> {
  const staff = await staffFor("admin");
  if (typeof staff === "string") return;
  const status = String(formData.get("status") ?? "");
  if (!["published", "draft", "archived"].includes(status)) return;
  await staff.supabase.from("public_positions").update({ status }).eq("id", String(formData.get("id") ?? ""));
  refreshSite();
}

/** Move a position one place up or down within its section. */
export async function movePosition(formData: FormData): Promise<void> {
  const staff = await staffFor("admin");
  if (typeof staff === "string") return;
  const id = String(formData.get("id") ?? "");
  const up = formData.get("direction") === "up";
  const { data: me } = await staff.supabase.from("public_positions").select("id, section").eq("id", id).maybeSingle();
  if (!me) return;
  const { data: rows } = await staff.supabase
    .from("public_positions")
    .select("id, sort_order")
    .eq("section", me.section)
    .neq("status", "archived")
    .order("sort_order")
    .order("title");
  const list = rows ?? [];
  const i = list.findIndex((r) => r.id === id);
  const j = up ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  // Renumber the whole section so equal numbers can't get stuck.
  await Promise.all(list.map((r, n) => staff.supabase.from("public_positions").update({ sort_order: (n + 1) * 10 }).eq("id", r.id)));
  refreshSite();
}

// Sponsors, partners, packages and enquiries ------------------------------------------------------------

const supporterSchema = z.object({
  id: z.string(),
  kind: z.enum(["sponsor", "partner"]),
  name: z.string().trim().min(2, "Enter the organisation's name.").max(120, "Keep the name under 120 characters."),
  websiteUrl: optionalText(300, "That link is too long.").refine((v) => v === null || /^https:\/\/\S+$/i.test(v), "Paste a link starting with https://"),
  blurb: optionalText(300, "Keep this under 300 characters."),
  packageId: z.string(),
  sinceYear: z
    .string()
    .refine((v) => v === "" || /^(19[7-9]\d|20\d\d)$/.test(v), "Enter a year, e.g. 2026.")
    .transform((v) => (v === "" ? null : Number(v))),
  featured: z.boolean(),
  status: z.enum(["published", "draft"]),
});

export async function saveSupporter(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await staffFor("admin");
  if (typeof staff === "string") return fail(staff);
  const parsed = supporterSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    kind: formData.get("kind"),
    name: String(formData.get("name") ?? ""),
    websiteUrl: String(formData.get("websiteUrl") ?? ""),
    blurb: String(formData.get("blurb") ?? ""),
    packageId: String(formData.get("packageId") ?? ""),
    sinceYear: String(formData.get("sinceYear") ?? ""),
    featured: formData.get("featured") === "on",
    status: formData.get("status") === "draft" ? "draft" : "published",
  });
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrors(parsed.error));
  const v = parsed.data;
  const row: Record<string, unknown> = {
    kind: v.kind,
    name: v.name,
    website_url: v.websiteUrl,
    blurb: v.blurb,
    package_id: v.packageId || null,
    since_year: v.sinceYear,
    featured: v.featured,
    status: v.status,
  };
  try {
    if (hasPhoto(formData)) row.logo_path = await savePhoto(staff, "supporters", formData);
  } catch (e) {
    return fail(uploadMessage(e));
  }
  const table = staff.supabase.from("supporters");
  const { error } = v.id
    ? await table.update(row).eq("id", v.id)
    : await table.insert({ ...row, sort_order: await nextOrder(staff, "supporters", v.kind) });
  if (error) {
    console.error(error);
    return fail("The details could not be saved.");
  }
  refreshSite();
  redirect("/admin/support?saved=1#supporters");
}

const packageSchema = z.object({
  id: z.string(),
  kind: z.enum(["sponsor", "partner"]),
  name: z.string().trim().min(2, "Name the option, e.g. Business Alliance.").max(80, "Keep the name under 80 characters."),
  audience: optionalText(160, "Keep this under 160 characters."),
  description: z.string().trim().max(600, "Keep the description under 600 characters."),
  benefits: z.array(z.string().trim().min(1).max(160, "Keep each benefit under 160 characters.")).max(12, "List up to 12 benefits."),
  amount: z
    .string()
    .transform((v) => v.replace(/[,\s]/g, ""))
    .refine((v) => v === "" || /^\d{1,12}$/.test(v), "Enter the amount in shillings, numbers only, or leave it blank.")
    .transform((v) => (v === "" ? null : Number(v))),
  amountPeriod: z.enum(["one_off", "annual"]),
  status: z.enum(["published", "draft"]),
});

export async function savePackage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await staffFor("admin");
  if (typeof staff === "string") return fail(staff);
  const parsed = packageSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    kind: formData.get("kind"),
    name: String(formData.get("name") ?? ""),
    audience: String(formData.get("audience") ?? ""),
    description: String(formData.get("description") ?? ""),
    benefits: String(formData.get("benefits") ?? "").split("\n").map((b) => b.trim()).filter(Boolean),
    amount: String(formData.get("amount") ?? ""),
    amountPeriod: formData.get("amountPeriod") === "one_off" ? "one_off" : "annual",
    status: formData.get("status") === "draft" ? "draft" : "published",
  });
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrors(parsed.error));
  const v = parsed.data;
  const row = {
    kind: v.kind,
    name: v.name,
    audience: v.audience,
    description: v.description,
    benefits: v.benefits,
    amount_kes: v.amount,
    amount_period: v.amount ? v.amountPeriod : null,
    status: v.status,
  };
  const table = staff.supabase.from("support_packages");
  const { error } = v.id
    ? await table.update(row).eq("id", v.id)
    : await table.insert({ ...row, sort_order: await nextOrder(staff, "support_packages", v.kind) });
  if (error) {
    console.error(error);
    return fail("The option could not be saved.");
  }
  refreshSite();
  redirect("/admin/support?saved=1#packages");
}

type SupportTable = "supporters" | "support_packages";
const supportTables = new Set<string>(["supporters", "support_packages"]);

async function nextOrder(staff: Staff, table: SupportTable, kind: string) {
  const { data } = await staff.supabase.from(table).select("sort_order").eq("kind", kind).order("sort_order", { ascending: false }).limit(1).maybeSingle();
  return (data?.sort_order ?? 0) + 10;
}

/** Show, hide or remove (archive) a sponsor, partner or package. Nothing is deleted. */
export async function setSupportStatus(formData: FormData): Promise<void> {
  const staff = await staffFor("admin");
  if (typeof staff === "string") return;
  const table = String(formData.get("table") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!supportTables.has(table) || !["published", "draft", "archived"].includes(status)) return;
  await staff.supabase.from(table as SupportTable).update({ status }).eq("id", String(formData.get("id") ?? ""));
  refreshSite();
}

/** Move a sponsor, partner or package one place up or down among its kind. */
export async function moveSupport(formData: FormData): Promise<void> {
  const staff = await staffFor("admin");
  if (typeof staff === "string") return;
  const table = String(formData.get("table") ?? "");
  if (!supportTables.has(table)) return;
  const t = table as SupportTable;
  const id = String(formData.get("id") ?? "");
  const { data: me } = await staff.supabase.from(t).select("kind").eq("id", id).maybeSingle();
  if (!me) return;
  const { data: rows } = await staff.supabase.from(t).select("id").eq("kind", me.kind).neq("status", "archived").order("sort_order").order("name");
  const list = rows ?? [];
  const i = list.findIndex((r) => r.id === id);
  const j = formData.get("direction") === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await Promise.all(list.map((r, n) => staff.supabase.from(t).update({ sort_order: (n + 1) * 10 }).eq("id", r.id)));
  refreshSite();
}

/** Mark an enquiry in progress or closed, with a short note. */
export async function updateEnquiry(formData: FormData): Promise<void> {
  const staff = await staffFor("admin");
  if (typeof staff === "string") return;
  const status = String(formData.get("status") ?? "");
  if (!["new", "in_progress", "closed"].includes(status)) return;
  const { data: me } = await staff.supabase.rpc("current_person_id");
  await staff.supabase
    .from("support_enquiries")
    .update({ status, notes: String(formData.get("notes") ?? "").slice(0, 2000), handled_by: me ?? null })
    .eq("id", String(formData.get("id") ?? ""));
  revalidatePath("/admin/support");
}

// Merchandise ------------------------------------------------------------------------------------------

const merchItemSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(2, "Name the item, e.g. Alumni T-shirt.").max(80, "Keep the name under 80 characters."),
  description: z.string().trim().max(600, "Keep the description under 600 characters."),
  price: z
    .string()
    .transform((v) => v.replace(/[,\s]/g, ""))
    .refine((v) => /^\d{1,9}$/.test(v) && Number(v) > 0, "Enter the price in shillings, numbers only.")
    .transform(Number),
  options: z.array(z.string().trim().min(1).max(40)).max(20, "Up to 20 choices."),
  optionLabel: z.string().trim().min(1).max(20, "Keep this short, e.g. Size or Colour."),
  status: z.enum(["published", "draft"]),
});

export async function saveMerchItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await staffFor("shop");
  if (typeof staff === "string") return fail(staff);
  const parsed = merchItemSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    price: String(formData.get("price") ?? ""),
    options: [...new Set(String(formData.get("options") ?? "").split(",").map((o) => o.trim()).filter(Boolean))],
    optionLabel: String(formData.get("optionLabel") || "Size"),
    status: formData.get("status") === "draft" ? "draft" : "published",
  });
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrors(parsed.error));
  const v = parsed.data;
  const row: Record<string, unknown> = {
    name: v.name,
    description: v.description,
    price_kes: v.price,
    options: v.options,
    option_label: v.optionLabel,
    status: v.status,
  };
  try {
    if (hasPhoto(formData)) row.photo_path = await savePhoto(staff, "merchandise", formData);
  } catch (e) {
    return fail(uploadMessage(e));
  }
  const table = staff.supabase.from("merch_items");
  let error;
  if (v.id) {
    ({ error } = await table.update(row).eq("id", v.id));
  } else {
    const { data: last } = await staff.supabase.from("merch_items").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    ({ error } = await table.insert({ ...row, sort_order: (last?.sort_order ?? 0) + 10 }));
  }
  if (error) {
    console.error(error);
    return fail("The item could not be saved.");
  }
  refreshSite();
  redirect("/admin/shop?saved=1#items");
}

/** Show, hide or remove (archive) an item. Past orders keep their own copy of the name and price. */
export async function setMerchItemStatus(formData: FormData): Promise<void> {
  const staff = await staffFor("shop");
  if (typeof staff === "string") return;
  const status = String(formData.get("status") ?? "");
  if (!["published", "draft", "archived"].includes(status)) return;
  await staff.supabase.from("merch_items").update({ status }).eq("id", String(formData.get("id") ?? ""));
  refreshSite();
}

export async function moveMerchItem(formData: FormData): Promise<void> {
  const staff = await staffFor("shop");
  if (typeof staff === "string") return;
  const id = String(formData.get("id") ?? "");
  const { data: rows } = await staff.supabase.from("merch_items").select("id").neq("status", "archived").order("sort_order").order("name");
  const list = rows ?? [];
  const i = list.findIndex((r) => r.id === id);
  const j = formData.get("direction") === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await Promise.all(list.map((r, n) => staff.supabase.from("merch_items").update({ sort_order: (n + 1) * 10 }).eq("id", r.id)));
  refreshSite();
}

const orderStatuses = ["new", "confirmed", "paid", "ready", "collected", "cancelled"];

/** Move an order along (New → Confirmed → Paid → Ready → Collected, or Cancelled) with a note. */
export async function updateMerchOrder(formData: FormData): Promise<void> {
  const staff = await staffFor("shop");
  if (typeof staff === "string") return;
  const status = String(formData.get("status") ?? "");
  if (!orderStatuses.includes(status)) return;
  const { data: me } = await staff.supabase.rpc("current_person_id");
  await staff.supabase
    .from("merch_orders")
    .update({ status, staff_notes: String(formData.get("notes") ?? "").slice(0, 2000), handled_by: me ?? null })
    .eq("id", String(formData.get("id") ?? ""));
  revalidatePath("/admin/shop");
}

// The school: figures, results and priorities -------------------------------------------------------------

const count = (msg: string) =>
  z.string().transform((v) => v.replace(/[,\s]/g, "")).refine((v) => v === "" || /^\d{1,6}$/.test(v), msg).transform((v) => (v === "" ? null : Number(v)));

const schoolStatsSchema = z.object({
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the date of these figures."),
  students: count("Enter the number of students.").refine((v) => v !== null, "Enter the number of students."),
  needy: count("Numbers only."),
  supported: count("Numbers only."),
  teachers: count("Numbers only."),
  note: z.string().trim().max(500, "Keep the note under 500 characters."),
  feesYear: count("Enter a year, e.g. 2027.").refine((v) => v === null || (v >= 2020 && v <= 2100), "Enter a year, e.g. 2027."),
  termFee: count("Numbers only, in shillings."),
  annualFee: count("Numbers only, in shillings."),
  needyAdmitted: count("Numbers only."),
});

/** Records the school's latest figures. Earlier figures are kept as history. */
export async function saveSchoolStats(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await staffFor("school");
  if (typeof staff === "string") return fail(staff);
  const parsed = schoolStatsSchema.safeParse({
    asOf: String(formData.get("asOf") ?? ""), students: String(formData.get("students") ?? ""), needy: String(formData.get("needy") ?? ""),
    supported: String(formData.get("supported") ?? ""), teachers: String(formData.get("teachers") ?? ""), note: String(formData.get("note") ?? ""),
    feesYear: String(formData.get("feesYear") ?? ""), termFee: String(formData.get("termFee") ?? ""),
    annualFee: String(formData.get("annualFee") ?? ""), needyAdmitted: String(formData.get("needyAdmitted") ?? ""),
  });
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrors(parsed.error));
  const v = parsed.data;
  const { data: me } = await staff.supabase.rpc("current_person_id");
  const { error } = await staff.supabase.from("school_stats").insert({
    as_of: v.asOf, students: v.students, needy_students: v.needy, supported_by_alumni: v.supported, teachers: v.teachers, note: v.note, recorded_by: me ?? null,
    fees_year: v.feesYear, term_fee_kes: v.termFee || null, annual_fee_kes: v.annualFee || null, needy_admitted_per_year: v.needyAdmitted,
  });
  if (error) {
    console.error(error);
    return fail("The figures could not be saved.");
  }
  revalidatePath("/app", "layout");
  revalidatePath("/admin/school");
  refreshSite();
  return { ok: true, message: "Figures saved. Members see them on their dashboard; totals and fees show on the website." };
}

const resultSchema = z.object({
  year: z.coerce.number().int().min(1970, "Enter the year.").max(2100, "Enter the year."),
  measure: z.string().trim().min(2, "Say what is measured, e.g. KCSE mean score.").max(60),
  value: z.string().trim().refine((v) => /^\d{1,3}(\.\d{1,3})?$/.test(v), "Enter the score, e.g. 7.125.").transform(Number),
  grade: z.string().trim().max(4, "Up to 4 characters, e.g. C+.").transform((v) => v || null),
  candidates: count("Numbers only."),
});

/** Adds or corrects one year's results. */
export async function saveResult(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await staffFor("school");
  if (typeof staff === "string") return fail(staff);
  const parsed = resultSchema.safeParse({
    year: formData.get("year"), measure: String(formData.get("measure") || "KCSE mean score"), value: String(formData.get("value") ?? ""),
    grade: String(formData.get("grade") ?? ""), candidates: String(formData.get("candidates") ?? ""),
  });
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrors(parsed.error));
  const v = parsed.data;
  const { error } = await staff.supabase
    .from("academic_results")
    .upsert({ year: v.year, measure: v.measure, value: v.value, grade: v.grade, candidates: v.candidates }, { onConflict: "year" });
  if (error) {
    console.error(error);
    return fail("The results could not be saved.");
  }
  revalidatePath("/app", "layout");
  revalidatePath("/admin/school");
  return { ok: true, message: `Results for ${v.year} saved.` };
}

const prioritySchema = z.object({
  id: z.string(),
  title: z.string().trim().min(2, "Name the priority.").max(120, "Keep the name under 120 characters."),
  description: z.string().trim().max(600, "Keep the description under 600 characters."),
});

export async function savePriority(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await staffFor("school");
  if (typeof staff === "string") return fail(staff);
  const parsed = prioritySchema.safeParse({ id: String(formData.get("id") ?? ""), title: String(formData.get("title") ?? ""), description: String(formData.get("description") ?? "") });
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrors(parsed.error));
  const v = parsed.data;
  let error;
  if (v.id) {
    ({ error } = await staff.supabase.from("school_priorities").update({ title: v.title, description: v.description }).eq("id", v.id));
  } else {
    const { data: last } = await staff.supabase.from("school_priorities").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    ({ error } = await staff.supabase.from("school_priorities").insert({ title: v.title, description: v.description, sort_order: (last?.sort_order ?? 0) + 10 }));
  }
  if (error) {
    console.error(error);
    return fail("The priority could not be saved.");
  }
  revalidatePath("/app", "layout");
  redirect("/admin/school?saved=1#priorities");
}

export async function setPriorityStatus(formData: FormData): Promise<void> {
  const staff = await staffFor("school");
  if (typeof staff === "string") return;
  const status = String(formData.get("status") ?? "");
  if (!["published", "draft", "archived"].includes(status)) return;
  await staff.supabase.from("school_priorities").update({ status }).eq("id", String(formData.get("id") ?? ""));
  revalidatePath("/app", "layout");
  revalidatePath("/admin/school");
}

/** Moves a priority up or down; the order is the order shown to members. */
export async function movePriority(formData: FormData): Promise<void> {
  const staff = await staffFor("school");
  if (typeof staff === "string") return;
  const id = String(formData.get("id") ?? "");
  const { data: rows } = await staff.supabase.from("school_priorities").select("id").neq("status", "archived").order("sort_order").order("title");
  const list = rows ?? [];
  const i = list.findIndex((r) => r.id === id);
  const j = formData.get("direction") === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await Promise.all(list.map((r, n) => staff.supabase.from("school_priorities").update({ sort_order: (n + 1) * 10 }).eq("id", r.id)));
  revalidatePath("/app", "layout");
  revalidatePath("/admin/school");
}

// Cases for support (handlers) ----------------------------------------------------------------------------

export async function handlerReply(formData: FormData): Promise<void> {
  const staff = await getStaff();
  if (!staff?.canHandleCases) return;
  const id = String(formData.get("id") ?? "");
  const body = String(formData.get("body") ?? "").trim().slice(0, 4000);
  const internal = formData.get("internal") === "on";
  const { data: me } = await staff.supabase.rpc("current_person_id");
  if (body) {
    await staff.supabase.from("case_updates").insert({ case_id: id, author_id: me, body, visible_to_raiser: !internal });
  }
  const status = String(formData.get("status") ?? "");
  if (["submitted", "under_review", "responded", "closed"].includes(status)) {
    await staff.supabase.from("support_cases").update({ status, handled_by: me ?? null }).eq("id", id);
  }
  revalidatePath(`/admin/cases/${id}`);
  revalidatePath("/admin/cases");
}

const storyEditSchema = z.object({
  id: z.string().uuid(),
  subjectName: z.string().trim().min(2, "Whose story is it?").max(120),
  subjectYear: z.union([z.literal(""), z.string().regex(/^(19[6-9]\d|20\d\d)$/, "Four digits, e.g. 2009.")]),
  title: z.string().trim().min(5, "Give the story a title.").max(120),
  summary: z.string().trim().max(280, "Keep this under 280 characters."),
  body: z.string().trim().min(50, "The story is too short.").max(8000),
  photoCaption: z.string().trim().max(200),
  consentNote: z.string().trim().max(300),
  editorNote: z.string().trim().max(1000),
});

/** Save edits to a story; optionally publish, decline, hide or feature it in the same step. */
export async function saveStory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await staffFor("stories");
  if (typeof staff === "string") return fail(staff);
  const parsed = storyEditSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    subjectName: String(formData.get("subjectName") ?? ""),
    subjectYear: String(formData.get("subjectYear") ?? "").trim(),
    title: String(formData.get("title") ?? ""),
    summary: String(formData.get("summary") ?? ""),
    body: String(formData.get("body") ?? ""),
    photoCaption: String(formData.get("photoCaption") ?? ""),
    consentNote: String(formData.get("consentNote") ?? ""),
    editorNote: String(formData.get("editorNote") ?? ""),
  });
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrors(parsed.error));
  const v = parsed.data;
  const consent = formData.get("consent") === "on";
  const intent = String(formData.get("intent") ?? "save");
  const row: Record<string, unknown> = {
    subject_name: v.subjectName,
    subject_year_left: v.subjectYear ? Number(v.subjectYear) : null,
    title: v.title,
    summary: v.summary,
    body: v.body,
    photo_caption: v.photoCaption || null,
    consent_given: consent,
    consent_note: v.consentNote,
    editor_note: v.editorNote,
    featured: formData.get("featured") === "on",
  };
  if (formData.has("causeId")) row.cause_id = String(formData.get("causeId") || "") || null;
  if (formData.has("videoUrl")) {
    const raw = String(formData.get("videoUrl") ?? "").trim();
    const vid = raw ? youtubeId(raw) : null;
    if (raw && !vid) return fail("Check the highlighted fields.", { videoUrl: "Paste a YouTube link, e.g. https://youtu.be/…" });
    row.video_url = vid ? `https://youtu.be/${vid}` : null;
  }
  if (formData.get("removePhoto") === "on") row.photo_path = null;
  if (intent === "publish") {
    if (!consent) return fail("Tick that the person agreed before publishing.", { consent: "Needed before publishing." });
    row.status = "published";
  }
  if (intent === "decline") row.status = "declined";
  if (intent === "hide") row.status = "archived";
  const { error } = await staff.supabase.from("alumni_stories").update(row).eq("id", v.id);
  if (error) {
    console.error(error);
    return fail("The story could not be saved.");
  }
  refreshSite();
  const messages: Record<string, string> = {
    publish: "Published. It is now on the website.",
    decline: "Marked as not published.",
    hide: "Hidden from the website.",
    save: "Saved.",
  };
  return { ok: true, message: messages[intent] ?? "Saved." };
}

const reportSchema = z.object({
  kind: z.enum(["financial", "moral", "other"]),
  year: z.coerce.number().int().min(2020, "Enter the year the report covers.").max(2100),
  title: z.string().trim().min(3, "Give the report a title.").max(140),
  summary: z.string().trim().max(1200, "Keep the summary under 1,200 characters."),
  filePath: z.string().regex(/^(financial|moral|other)\/[0-9a-f-]{36}\.pdf$/, "Choose the PDF again."),
  fileSize: z.coerce.number().int().positive().max(15 * 1024 * 1024),
  replacesId: z.union([z.literal(""), z.string().uuid()]),
});

/** Record a report after its PDF has been uploaded from the browser. It starts as a draft. */
export async function createReport(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await staffFor("reports");
  if (typeof staff === "string") return fail(staff);
  const parsed = reportSchema.safeParse(Object.fromEntries(["kind", "year", "title", "summary", "filePath", "fileSize", "replacesId"].map((k) => [k, String(formData.get(k) ?? "")])));
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrors(parsed.error));
  const v = parsed.data;
  if (!v.filePath.startsWith(`${v.kind}/`)) return fail("Choose the PDF again.");
  const { error } = await staff.supabase.from("reports").insert({
    kind: v.kind, year: v.year, title: v.title, summary: v.summary, file_path: v.filePath, file_size: v.fileSize, replaces_id: v.replacesId || null,
  });
  if (error) {
    console.error(error);
    return fail(error.message.includes("Only the") ? error.message : "The report could not be saved.");
  }
  revalidatePath("/admin/reports");
  return { ok: true, message: "Saved as a draft. Check it, then press Publish." };
}

/** Change the title or summary (the PDF itself never changes; upload a new version instead). */
export async function saveReportDetails(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await staffFor("reports");
  if (typeof staff === "string") return fail(staff);
  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  if (title.length < 3 || title.length > 140) return fail("Give the report a title.", { title: "3 to 140 characters." });
  if (summary.length > 1200) return fail("Keep the summary under 1,200 characters.", { summary: "Too long." });
  const { error } = await staff.supabase.from("reports").update({ title, summary }).eq("id", String(formData.get("id") ?? ""));
  if (error) return fail("The report could not be saved.");
  refreshSite();
  return { ok: true, message: "Saved." };
}

/** Publish a draft, or withdraw (archive) a report. Nothing is deleted. */
export async function setReportStatus(formData: FormData): Promise<void> {
  const staff = await staffFor("reports");
  if (typeof staff === "string") return;
  const status = String(formData.get("status") ?? "");
  if (!["published", "archived"].includes(status)) return;
  const { error } = await staff.supabase.from("reports").update({ status }).eq("id", String(formData.get("id") ?? ""));
  if (error) console.error(error);
  refreshSite();
}

const impactFigureSchema = z.object({
  id: z.union([z.literal(""), z.string().uuid()]),
  causeId: z.string().uuid("Choose the initiative."),
  value: z.string().trim().min(1, "Enter the figure, e.g. 12 or KES 384,000.").max(24, "Keep the figure short."),
  label: z.string().trim().min(3, "Say what it counts, e.g. students on bursaries in 2027.").max(80),
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the date these figures are correct to."),
  note: z.string().trim().max(200),
});

/** Add or correct an impact figure. Typed by officials and dated; it should match the annual reports. */
export async function saveImpactFigure(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await staffFor("impact");
  if (typeof staff === "string") return fail(staff);
  const parsed = impactFigureSchema.safeParse(Object.fromEntries(["id", "causeId", "value", "label", "asOf", "note"].map((k) => [k, String(formData.get(k) ?? "")])));
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrors(parsed.error));
  const v = parsed.data;
  const row = { cause_id: v.causeId, value: v.value, label: v.label, as_of: v.asOf, note: v.note };
  const table = staff.supabase.from("impact_figures");
  let error;
  if (v.id) ({ error } = await table.update(row).eq("id", v.id));
  else {
    const { data: last } = await staff.supabase.from("impact_figures").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    ({ error } = await table.insert({ ...row, sort_order: (last?.sort_order ?? 0) + 10 }));
  }
  if (error) {
    console.error(error);
    return fail("The figure could not be saved.");
  }
  refreshSite();
  redirect("/admin/impact?saved=1");
}

export async function setImpactFigureStatus(formData: FormData): Promise<void> {
  const staff = await staffFor("impact");
  if (typeof staff === "string") return;
  const status = String(formData.get("status") ?? "");
  if (!["published", "draft", "archived"].includes(status)) return;
  await staff.supabase.from("impact_figures").update({ status }).eq("id", String(formData.get("id") ?? ""));
  refreshSite();
}

export async function moveImpactFigure(formData: FormData): Promise<void> {
  const staff = await staffFor("impact");
  if (typeof staff === "string") return;
  const id = String(formData.get("id") ?? "");
  const { data: me } = await staff.supabase.from("impact_figures").select("cause_id").eq("id", id).maybeSingle();
  if (!me) return;
  const { data: rows } = await staff.supabase.from("impact_figures").select("id").eq("cause_id", me.cause_id).neq("status", "archived").order("sort_order");
  const list = rows ?? [];
  const i = list.findIndex((r) => r.id === id);
  const j = formData.get("direction") === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await Promise.all(list.map((r, n) => staff.supabase.from("impact_figures").update({ sort_order: (n + 1) * 10 }).eq("id", r.id)));
  refreshSite();
}

const impactStorySchema = z.object({
  causeId: z.string().uuid("Choose the initiative."),
  subjectName: z.string().trim().min(2, "Who is it about? A first name only for a student, e.g. Wanjiku, Form 3.").max(120),
  title: z.string().trim().min(5, "Give the story a title.").max(120),
  summary: z.string().trim().max(280),
  body: z.string().trim().min(50, "Tell a little more (at least a few sentences).").max(8000),
  videoUrl: z.string().trim().max(200),
  photoCaption: z.string().trim().max(200),
});

/** Officials write an impact story for an initiative. It starts waiting for review (consent recorded before publishing). */
export async function createImpactStory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await staffFor("stories");
  if (typeof staff === "string") return fail(staff);
  const parsed = impactStorySchema.safeParse(Object.fromEntries(["causeId", "subjectName", "title", "summary", "body", "videoUrl", "photoCaption"].map((k) => [k, String(formData.get(k) ?? "")])));
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrors(parsed.error));
  const v = parsed.data;
  const vid = v.videoUrl ? youtubeId(v.videoUrl) : null;
  if (v.videoUrl && !vid) return fail("Check the highlighted fields.", { videoUrl: "Paste a YouTube link, e.g. https://youtu.be/…" });
  const { data: me } = await staff.supabase.rpc("current_person_id");
  if (!me) return fail("Your account isn't linked to a member record yet, so it can't write stories.");
  let photoPath: string | null = null;
  const large = formData.get("large");
  const small = formData.get("small");
  if (large instanceof File && large.size > 0 && small instanceof File) {
    photoPath = `${me}/${crypto.randomUUID()}`;
    for (const [file, size] of [[large, "1600"], [small, "800"]] as const) {
      if (file.size > 2 * 1024 * 1024 || !["image/webp", "image/jpeg"].includes(file.type)) return fail("The photo couldn't be used. Try a JPG or PNG.");
      const { error } = await staff.supabase.storage.from("story-photos").upload(`${photoPath}-${size}.webp`, file, { contentType: file.type, upsert: false });
      if (error) {
        console.error(error);
        return fail("The photo could not be saved. Please try again.");
      }
    }
  }
  const { data, error } = await staff.supabase.from("alumni_stories").insert({
    kind: "impact", submitted_by: me, subject_name: v.subjectName, title: v.title, summary: v.summary, body: v.body,
    cause_id: v.causeId, video_url: vid ? `https://youtu.be/${vid}` : null, photo_path: photoPath, photo_caption: photoPath ? v.photoCaption || null : null,
  }).select("id").single();
  if (error) {
    console.error(error);
    return fail("The story could not be saved.");
  }
  redirect(`/admin/stories/${data.id}?created=1`);
}
