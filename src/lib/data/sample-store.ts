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
import { donationReference, pledgeReference } from "@/lib/references";
import { causes, channels, funds, plenaryPledges } from "./sample";
import { sampleNews } from "@/content/site";

// Sample data held in memory: used when the database is not connected (local work, tests).
// Anything recorded is lost when the server restarts.

interface Stored {
  receipt: Receipt;
  token: string;
  total: number | null;
}

const g = globalThis as unknown as {
  __menyenyaSample?: { donations: Stored[]; pledges: Stored[]; donationSeq: number; pledgeSeq: number };
};
const store = (g.__menyenyaSample ??= { donations: [], pledges: [], donationSeq: 0, pledgeSeq: 0 });

export async function listCauses(): Promise<Cause[]> {
  return causes;
}

export async function getCause(slug: string): Promise<Cause | null> {
  return causes.find((c) => c.slug === slug) ?? null;
}

export async function getChannelForCause(cause: Cause): Promise<PaymentChannel> {
  const fund = funds.find((f) => f.id === cause.fundId);
  const channel = channels.find((c) => c.id === fund?.channelId);
  if (!channel) throw new Error(`No payment channel for cause ${cause.slug}`);
  return channel;
}

export async function getCauseProgress(slug: string): Promise<CauseProgress> {
  const founding = slug === plenaryPledges.causeSlug ? plenaryPledges : { total: 0, count: 0 };
  const online = store.pledges.filter((p) => p.receipt.causeSlug === slug);
  return {
    pledged: founding.total + online.reduce((sum, p) => sum + (p.total ?? 0), 0),
    received: 0,
    pledgeCount: founding.count + online.length,
    updatedAt: new Date().toISOString(),
  };
}

export async function recordGift(input: GiftInput): Promise<RecordedGift> {
  const cause = await getCause(input.causeSlug);
  if (!cause) throw new GivingError("This cause is not open for gifts");
  store.donationSeq += 1;
  const reference = donationReference(new Date().getFullYear(), store.donationSeq);
  const token = crypto.randomUUID();
  store.donations.push({
    token,
    total: input.amount,
    receipt: {
      kind: "donation",
      reference,
      causeSlug: cause.slug,
      causeTitle: cause.title,
      firstName: input.donor.firstName,
      email: input.donor.email.toLowerCase(),
      amount: input.amount,
      frequency: input.frequency,
    },
  });
  return { reference, receiptToken: token };
}

export async function recordPledge(input: PledgeInput): Promise<RecordedGift> {
  const cause = await getCause(input.causeSlug);
  if (!cause || !cause.pledgesEnabled) throw new GivingError("This cause is not taking pledges");
  store.pledgeSeq += 1;
  const reference = pledgeReference(new Date().getFullYear(), store.pledgeSeq);
  const token = crypto.randomUUID();
  const periods = input.pledgeType === "one_time" ? 1 : input.numberOfPeriods;
  const total = input.amountPerPeriod !== null && periods !== null ? input.amountPerPeriod * periods : null;
  store.pledges.push({
    token,
    total,
    receipt: {
      kind: "pledge",
      reference,
      causeSlug: cause.slug,
      causeTitle: cause.title,
      firstName: input.donor.firstName,
      email: input.donor.email.toLowerCase(),
      pledgeType: input.pledgeType,
      amountPerPeriod: input.amountPerPeriod,
      numberOfPeriods: periods,
      totalAmount: total,
      inKindDescription: input.inKindDescription ?? null,
      isFounding: cause.lifecycle === "preparation",
    },
  });
  return { reference, receiptToken: token };
}

export async function getReceipt(reference: string, token: string): Promise<Receipt | null> {
  const found = [...store.donations, ...store.pledges].find((r) => r.receipt.reference === reference && r.token === token);
  return found?.receipt ?? null;
}

// Photos and news: none uploaded without the database; news shows the starting items.
export async function listCausePhotos(slug: string): Promise<CausePhoto[]> {
  void slug;
  return [];
}

export async function getCoverPhotos(): Promise<Record<string, Photo>> {
  return {};
}

export async function getSitePhotos(): Promise<Record<string, Photo>> {
  return {};
}

export async function getChairVideoId(): Promise<string | null> {
  return null;
}

export async function listNews(): Promise<NewsPost[]> {
  return sampleNews;
}

export async function getNewsPost(slug: string): Promise<NewsPost | null> {
  return sampleNews.find((n) => n.slug === slug) ?? null;
}

/** A problem the giver can fix or should be told about, with a message safe to show them. */
export class GivingError extends Error {}
