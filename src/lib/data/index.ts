import "server-only";
import type { Cause, CauseProgress, DonationRecord, Fund, PaymentChannel, PledgeRecord } from "@/lib/types";
import { donationReference, pledgeReference } from "@/lib/references";
import { causes, channels, funds, plenaryPledges } from "./sample";

// The data layer. Pages call these functions only, never the sample arrays directly,
// so the Supabase implementation can replace this file without touching the screens.

interface Store {
  donations: DonationRecord[];
  pledges: PledgeRecord[];
  donationSeq: number;
  pledgeSeq: number;
}

// Preview only: records live in memory and are lost when the server restarts.
const g = globalThis as unknown as { __menyenyaStore?: Store };
const store: Store = (g.__menyenyaStore ??= { donations: [], pledges: [], donationSeq: 0, pledgeSeq: 0 });

export async function listCauses(): Promise<Cause[]> {
  return causes;
}

export async function getCause(slug: string): Promise<Cause | null> {
  return causes.find((c) => c.slug === slug) ?? null;
}

export async function getFund(id: string): Promise<Fund | null> {
  return funds.find((f) => f.id === id) ?? null;
}

export async function getChannelForCause(cause: Cause): Promise<PaymentChannel> {
  const fund = funds.find((f) => f.id === cause.fundId);
  const channel = channels.find((c) => c.id === fund?.channelId);
  if (!channel) throw new Error(`No payment channel for cause ${cause.slug}`);
  return channel;
}

export async function getCauseProgress(slug: string): Promise<CauseProgress> {
  const founding = slug === plenaryPledges.causeSlug ? plenaryPledges : { total: 0, count: 0 };
  const online = store.pledges.filter((p) => p.causeSlug === slug);
  return {
    pledged: founding.total + online.reduce((sum, p) => sum + (p.totalAmount ?? 0), 0),
    received: 0, // payments are recorded from the launch of giving
    pledgeCount: founding.count + online.length,
    updatedAt: new Date().toISOString(),
  };
}

export async function createDonation(input: Omit<DonationRecord, "reference" | "status" | "createdAt">) {
  store.donationSeq += 1;
  const record: DonationRecord = {
    ...input,
    reference: donationReference(new Date().getFullYear(), store.donationSeq),
    status: "initiated",
    createdAt: new Date().toISOString(),
  };
  store.donations.push(record);
  return record;
}

export async function createPledge(input: Omit<PledgeRecord, "reference" | "status" | "createdAt">) {
  store.pledgeSeq += 1;
  const record: PledgeRecord = {
    ...input,
    reference: pledgeReference(new Date().getFullYear(), store.pledgeSeq),
    status: "active",
    createdAt: new Date().toISOString(),
  };
  store.pledges.push(record);
  return record;
}

export async function findByReference(reference: string) {
  const donation = store.donations.find((d) => d.reference === reference);
  if (donation) return { kind: "donation" as const, record: donation };
  const pledge = store.pledges.find((p) => p.reference === reference);
  if (pledge) return { kind: "pledge" as const, record: pledge };
  return null;
}
