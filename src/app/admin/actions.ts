"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getStaff, type ActionState, type Staff } from "@/lib/admin/staff";
import { hasPhoto, savePhoto, UploadError } from "@/lib/admin/uploads";
import { slugify, toParagraphs, youtubeId } from "@/lib/photos";
import { photoSpaceKeys } from "@/content/photo-spaces";

// Every action checks who is signed in; the database rules check again on every write.

type Need = "admin" | "news";

async function staffFor(need: Need): Promise<Staff | string> {
  const staff = await getStaff();
  if (!staff) return "Your sign-in has expired. Log in again and retry.";
  if (need === "admin" && !staff.isAdmin) return "Only administrators can change this.";
  if (need === "news" && !staff.canEditNews) return "Only administrators and the Secretary can change news.";
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
  const scope = (role.allowed_scope_types as string[])[0] ?? "association";
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
