import "server-only";
import type {
  Cause,
  CausePhoto,
  CauseProgress,
  NewsPost,
  Photo,
  GiftInput,
  PaymentChannel,
  PledgeInput,
  Receipt,
  RecordedGift,
} from "@/lib/types";
import { createPublicClient } from "@/lib/supabase/server";
import { GivingError } from "./sample-store";
import { toPhoto } from "@/lib/photos";

// The database-backed store. Visitors only read public data and give through the
// give()/make_pledge() database functions; access rules in the database do the rest.

type CauseRow = {
  slug: string;
  title: string;
  summary: string;
  story: string[];
  components: Cause["components"];
  readiness: Cause["readiness"];
  kind: Cause["kind"];
  target_amount: number | null;
  lifecycle: Cause["lifecycle"];
  pledges_enabled: boolean;
  preset_amounts: number[];
  recurring_periods: string[];
  suggested_pledges: Cause["suggestedPledges"];
  funds: { key: string } | null;
  video_url: string | null;
  video_title: string | null;
  video_speaker: string | null;
};

const causeColumns =
  "slug, title, summary, story, components, readiness, kind, target_amount, lifecycle, pledges_enabled, preset_amounts, recurring_periods, suggested_pledges, funds(key), video_url, video_title, video_speaker";

function toCause(r: CauseRow): Cause {
  return {
    slug: r.slug,
    title: r.title,
    summary: r.summary,
    story: r.story ?? [],
    kind: r.kind,
    fundId: r.funds?.key ?? "",
    targetAmount: r.target_amount === null ? null : Number(r.target_amount),
    lifecycle: r.lifecycle,
    pledgesEnabled: r.pledges_enabled,
    presetAmounts: (r.preset_amounts ?? []).map(Number),
    recurringPeriods: (r.recurring_periods ?? []).filter((p): p is Cause["recurringPeriods"][number] => p !== "once"),
    suggestedPledges: r.suggested_pledges ?? [],
    components: r.components ?? [],
    readiness: r.readiness ?? [],
    video: r.video_url && r.video_title
      ? { youtubeId: r.video_url.replace("https://youtu.be/", ""), title: r.video_title, speaker: r.video_speaker }
      : null,
  };
}

export async function listCauses(): Promise<Cause[]> {
  const { data, error } = await createPublicClient().from("causes").select(causeColumns).order("sort_order");
  if (error) throw error;
  return (data as unknown as CauseRow[]).map(toCause);
}

export async function getCause(slug: string): Promise<Cause | null> {
  const { data, error } = await createPublicClient().from("causes").select(causeColumns).eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? toCause(data as unknown as CauseRow) : null;
}

export async function getChannelForCause(cause: Cause): Promise<PaymentChannel> {
  const { data, error } = await createPublicClient()
    .from("funds")
    .select("payment_channels(key, name, holder, paybill_number, account_display_name)")
    .eq("key", cause.fundId)
    .single();
  if (error) throw error;
  const c = (data as unknown as {
    payment_channels: { key: string; name: string; holder: PaymentChannel["holder"]; paybill_number: string | null; account_display_name: string };
  }).payment_channels;
  return {
    id: c.key,
    name: c.name,
    holder: c.holder,
    paybillNumber: c.paybill_number,
    accountDisplayName: c.account_display_name,
  };
}

export async function getCauseProgress(slug: string): Promise<CauseProgress> {
  const { data, error } = await createPublicClient().rpc("cause_progress", { p_slug: slug }).single();
  if (error) throw error;
  const row = data as { pledged: number; received: number; pledge_count: number };
  return {
    pledged: Number(row.pledged),
    received: Number(row.received),
    pledgeCount: Number(row.pledge_count),
    updatedAt: new Date().toISOString(),
  };
}

/** Database messages raised on purpose (code 22023) are safe to show; anything else is not. */
function toGivingError(error: { code?: string; message: string }): Error {
  if (error.code === "22023") return new GivingError(error.message);
  console.error("Giving failed", error);
  return new Error("We could not record this right now. Please try again in a moment.");
}

export async function recordGift(input: GiftInput): Promise<RecordedGift> {
  const { data, error } = await createPublicClient()
    .rpc("give", {
      p_cause_slug: input.causeSlug,
      p_amount: input.amount,
      p_frequency: input.frequency,
      p_first_name: input.donor.firstName,
      p_last_name: input.donor.lastName,
      p_email: input.donor.email,
      p_phone: input.donor.phone,
      p_organisation: input.donor.organisationName ?? null,
      p_anonymous: input.donor.anonymous,
      p_impact_updates: input.donor.impactUpdates,
      p_dedication: input.dedication ?? null,
    })
    .single();
  if (error) throw toGivingError(error);
  const row = data as { reference: string; receipt_token: string };
  return { reference: row.reference, receiptToken: row.receipt_token };
}

export async function recordPledge(input: PledgeInput): Promise<RecordedGift> {
  const { data, error } = await createPublicClient()
    .rpc("make_pledge", {
      p_cause_slug: input.causeSlug,
      p_pledge_type: input.pledgeType,
      p_amount_per_period: input.amountPerPeriod,
      p_number_of_periods: input.numberOfPeriods,
      p_in_kind_description: input.inKindDescription ?? null,
      p_first_name: input.donor.firstName,
      p_last_name: input.donor.lastName,
      p_email: input.donor.email,
      p_phone: input.donor.phone,
      p_organisation: input.donor.organisationName ?? null,
      p_anonymous: input.donor.anonymous,
      p_impact_updates: input.donor.impactUpdates,
    })
    .single();
  if (error) throw toGivingError(error);
  const row = data as { reference: string; receipt_token: string };
  return { reference: row.reference, receiptToken: row.receipt_token };
}

export async function getReceipt(reference: string, token: string): Promise<Receipt | null> {
  const { data, error } = await createPublicClient().rpc("get_receipt", { p_reference: reference, p_token: token });
  if (error || !data) return null;
  const r = data as Record<string, unknown>;
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return {
    kind: r.kind as Receipt["kind"],
    reference: r.reference as string,
    causeSlug: r.cause_slug as string,
    causeTitle: r.cause_title as string,
    firstName: r.first_name as string,
    email: (r.email as string) ?? null,
    amount: num(r.amount) ?? undefined,
    frequency: r.frequency as Receipt["frequency"],
    pledgeType: r.pledge_type as Receipt["pledgeType"],
    amountPerPeriod: num(r.amount_per_period),
    numberOfPeriods: num(r.number_of_periods),
    totalAmount: num(r.total_amount),
    inKindDescription: (r.in_kind_description as string) ?? null,
    isFounding: Boolean(r.is_founding),
  };
}

// Photos, settings and news ------------------------------------------------------------------
// Visitors see only published items; the database rules decide that, not this code.
// If these can't be read (for example while a database update is being applied), pages fall
// back to placeholders instead of failing: content should never take the site down.

function contentUnavailable<T>(what: string, error: unknown, fallback: T): T {
  console.error(`Could not read ${what}; showing placeholders`, error);
  return fallback;
}

type CausePhotoRow = { id: string; path: string; caption: string; status: CausePhoto["status"]; sort_order: number; purpose: CausePhoto["purpose"] };

export async function listCausePhotos(slug: string): Promise<CausePhoto[]> {
  const { data, error } = await createPublicClient()
    .from("cause_photos")
    .select("id, path, caption, status, sort_order, purpose, causes!inner(slug)")
    .eq("causes.slug", slug)
    .order("sort_order")
    .order("created_at");
  if (error) return contentUnavailable("cause photos", error, []);
  return (data as unknown as CausePhotoRow[]).map((r) => ({
    ...toPhoto(r.path, r.caption),
    id: r.id,
    status: r.status,
    sortOrder: r.sort_order,
    purpose: r.purpose ?? "general",
  }));
}

/** The first published photo of each cause, by cause slug. */
export async function getCoverPhotos(): Promise<Record<string, Photo>> {
  const { data, error } = await createPublicClient()
    .from("cause_photos")
    .select("path, caption, causes!inner(slug)")
    .order("sort_order")
    .order("created_at");
  if (error) return contentUnavailable("cover photos", error, {});
  const covers: Record<string, Photo> = {};
  for (const r of data as unknown as { path: string; caption: string; causes: { slug: string } }[]) {
    covers[r.causes.slug] ??= toPhoto(r.path, r.caption);
  }
  return covers;
}

/** Photos for the named spaces on the website, by space name. */
export async function getSitePhotos(): Promise<Record<string, Photo>> {
  const { data, error } = await createPublicClient().from("site_photos").select("slot, path, caption");
  if (error) return contentUnavailable("site photos", error, {});
  return Object.fromEntries(
    (data as { slot: string; path: string; caption: string }[]).map((r) => [r.slot, toPhoto(r.path, r.caption)]),
  );
}

export async function getChairVideoId(): Promise<string | null> {
  const { data } = await createPublicClient().from("site_settings").select("value").eq("key", "chair_video").maybeSingle();
  return ((data?.value as { youtubeId?: string | null } | undefined)?.youtubeId ?? null) || null;
}

export type NewsRow = {
  id: string; slug: string; kind: NewsPost["kind"]; title: string; summary: string; body: string[];
  happens_on: string; photo_path: string | null; photo_caption: string; status: NewsPost["status"];
};
export const newsColumns = "id, slug, kind, title, summary, body, happens_on, photo_path, photo_caption, status";

export function toNewsPost(r: NewsRow): NewsPost {
  return {
    id: r.id,
    slug: r.slug,
    kind: r.kind,
    title: r.title,
    summary: r.summary,
    body: r.body ?? [],
    date: r.happens_on,
    photo: r.photo_path ? toPhoto(r.photo_path, r.photo_caption || r.title) : null,
    status: r.status,
  };
}

export async function listNews(): Promise<NewsPost[]> {
  const { data, error } = await createPublicClient()
    .from("news_posts")
    .select(newsColumns)
    .eq("status", "published")
    .order("happens_on", { ascending: false });
  if (error) return contentUnavailable("news", error, []);
  return (data as NewsRow[]).map(toNewsPost);
}

export async function getNewsPost(slug: string): Promise<NewsPost | null> {
  const { data, error } = await createPublicClient()
    .from("news_posts")
    .select(newsColumns)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) return contentUnavailable("a news post", error, null);
  return data ? toNewsPost(data as NewsRow) : null;
}
