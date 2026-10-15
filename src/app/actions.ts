"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { GivingError, getCause, recordGift, recordPledge } from "@/lib/data";
import { parseKes } from "@/lib/money";
import type { Donor, PledgeType, RecordedGift } from "@/lib/types";
import { donationSchema, fieldErrors, pledgeSchema, type FieldErrors } from "@/lib/validation";

export type FormState = { errors: FieldErrors; values: Record<string, string> } | null;

function valuesOf(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  formData.forEach((v, k) => {
    if (typeof v === "string") out[k] = v;
  });
  return out;
}

function donorFrom(d: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  asOrganisation: boolean;
  organisationName?: string;
  anonymous: boolean;
  impactUpdates: boolean;
}): Donor {
  return {
    firstName: d.firstName,
    lastName: d.lastName,
    email: d.email,
    phone: d.phone,
    organisationName: d.asOrganisation ? d.organisationName : undefined,
    anonymous: d.anonymous,
    impactUpdates: d.impactUpdates,
  };
}

function giftUrl(r: RecordedGift) {
  return `/thank-you/${encodeURIComponent(r.reference)}?t=${encodeURIComponent(r.receiptToken)}`;
}

function failure(e: unknown, values: Record<string, string>): FormState {
  const message = e instanceof GivingError ? e.message : "We could not record this right now. Please try again in a moment.";
  if (!(e instanceof GivingError)) console.error(e);
  return { errors: { form: message }, values };
}

/** Progress figures change when a pledge is recorded; refresh the pages that show them. */
function refreshProgress(slug: string) {
  revalidatePath("/");
  revalidatePath("/donate");
  revalidatePath(`/causes/${slug}`);
}

export async function submitDonation(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = valuesOf(formData);
  const parsed = donationSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const cause = await getCause(parsed.data.causeSlug);
  if (!cause) return { errors: { form: "This cause is no longer open for gifts." }, values };
  if (parsed.data.frequency !== "once" && !cause.recurringPeriods.includes(parsed.data.frequency)) {
    return { errors: { frequency: "Choose one of the options shown" }, values };
  }

  let recorded: RecordedGift;
  try {
    recorded = await recordGift({
      causeSlug: cause.slug,
      amount: parsed.data.amount,
      frequency: parsed.data.frequency,
      dedication: parsed.data.dedication || undefined,
      donor: donorFrom(parsed.data),
    });
  } catch (e) {
    return failure(e, values);
  }
  redirect(giftUrl(recorded));
}

export async function submitPledge(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = valuesOf(formData);
  const parsed = pledgeSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const cause = await getCause(parsed.data.causeSlug);
  if (!cause || !cause.pledgesEnabled) {
    return { errors: { form: "This cause is not taking pledges. You can give once instead." }, values };
  }

  const type = parsed.data.pledgeType as PledgeType;
  let recorded: RecordedGift;
  try {
    recorded = await recordPledge({
      causeSlug: cause.slug,
      pledgeType: type,
      amountPerPeriod: type === "in_kind" ? null : parseKes(parsed.data.amountPerPeriod ?? ""),
      numberOfPeriods: type === "in_kind" ? null : type === "one_time" ? 1 : Number(parsed.data.numberOfPeriods),
      inKindDescription: type === "in_kind" ? parsed.data.inKindDescription : undefined,
      donor: donorFrom(parsed.data),
    });
  } catch (e) {
    return failure(e, values);
  }
  refreshProgress(cause.slug);
  redirect(giftUrl(recorded));
}
