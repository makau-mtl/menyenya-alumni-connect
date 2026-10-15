"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createDonation, createPledge, getCause } from "@/lib/data";
import { parseKes } from "@/lib/money";
import type { Donor, PledgeType } from "@/lib/types";
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

export async function submitDonation(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = valuesOf(formData);
  const parsed = donationSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const cause = await getCause(parsed.data.causeSlug);
  if (!cause) return { errors: { form: "This cause is no longer open for gifts." }, values };
  if (parsed.data.frequency !== "once" && !cause.recurringPeriods.includes(parsed.data.frequency)) {
    return { errors: { frequency: "Choose one of the options shown" }, values };
  }

  const record = await createDonation({
    causeSlug: cause.slug,
    amount: parsed.data.amount,
    frequency: parsed.data.frequency,
    dedication: parsed.data.dedication || undefined,
    donor: donorFrom(parsed.data),
  });
  redirect(`/thank-you/${record.reference}`);
}

/** Progress figures change when a pledge is recorded; refresh the pages that show them. */
function refreshProgress(slug: string) {
  revalidatePath("/");
  revalidatePath(`/causes/${slug}`);
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
  const perPeriod = type === "in_kind" ? null : parseKes(parsed.data.amountPerPeriod ?? "");
  const periods = type === "in_kind" ? null : type === "one_time" ? 1 : Number(parsed.data.numberOfPeriods);

  const record = await createPledge({
    causeSlug: cause.slug,
    pledgeType: type,
    amountPerPeriod: perPeriod,
    numberOfPeriods: periods,
    totalAmount: perPeriod !== null && periods !== null ? perPeriod * periods : null,
    inKindDescription: type === "in_kind" ? parsed.data.inKindDescription : undefined,
    isFounding: cause.lifecycle === "preparation",
    donor: donorFrom(parsed.data),
  });
  refreshProgress(cause.slug);
  redirect(`/thank-you/${record.reference}`);
}
