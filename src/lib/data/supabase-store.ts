import "server-only";
import type {
  Cause,
  CauseProgress,
  GiftInput,
  PaymentChannel,
  PledgeInput,
  Receipt,
  RecordedGift,
} from "@/lib/types";
import { createPublicClient } from "@/lib/supabase/server";
import { GivingError } from "./sample-store";

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
};

const causeColumns =
  "slug, title, summary, story, components, readiness, kind, target_amount, lifecycle, pledges_enabled, preset_amounts, recurring_periods, suggested_pledges, funds(key)";

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
