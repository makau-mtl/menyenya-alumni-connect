// Domain types, mirroring docs/SPEC.md §5.4–5.5.
// Amounts are whole Kenyan shillings in this preview; the database will use NUMERIC(14,2).

export type AccountHolder = "school_bom" | "association";

export interface PaymentChannel {
  id: string;
  name: string;
  holder: AccountHolder;
  /** Shown to donors. Null until the account details are confirmed. */
  paybillNumber: string | null;
  accountDisplayName: string;
}

export interface Fund {
  id: string;
  name: string;
  channelId: string;
}

export type CauseKind = "campaign" | "ongoing_fund" | "general" | "appeal";
export type Lifecycle = "draft" | "in_review" | "approved" | "preparation" | "live" | "construction" | "closed";
export type RecurringPeriod = "monthly" | "quarterly" | "annually";

export interface SuggestedPledge {
  label: string;
  perPeriod: number;
  periods: number;
  period: "monthly" | "one_time";
  sweetSpot?: boolean;
}

export interface ReadinessItem {
  label: string;
  done: boolean;
}

export interface Component {
  name: string;
  purpose: string;
}

export interface Cause {
  slug: string;
  title: string;
  summary: string;
  story: string[];
  kind: CauseKind;
  fundId: string;
  targetAmount: number | null;
  lifecycle: Lifecycle;
  pledgesEnabled: boolean;
  presetAmounts: number[];
  recurringPeriods: RecurringPeriod[];
  suggestedPledges: SuggestedPledge[];
  components: Component[];
  readiness: ReadinessItem[];
}

export type PledgeType = "one_time" | "monthly" | "quarterly" | "annual" | "in_kind";

export interface Donor {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  organisationName?: string;
  anonymous: boolean;
  impactUpdates: boolean;
}

export interface DonationRecord {
  reference: string;
  causeSlug: string;
  amount: number;
  frequency: "once" | RecurringPeriod;
  dedication?: string;
  donor: Donor;
  status: "initiated";
  createdAt: string;
}

export interface PledgeRecord {
  reference: string;
  causeSlug: string;
  pledgeType: PledgeType;
  amountPerPeriod: number | null;
  numberOfPeriods: number | null;
  totalAmount: number | null;
  inKindDescription?: string;
  isFounding: boolean;
  donor: Donor;
  status: "active";
  createdAt: string;
}

export interface CauseProgress {
  pledged: number;
  received: number;
  pledgeCount: number;
  updatedAt: string;
}

/** What the thank-you page shows. Read with the private receipt token. */
export interface Receipt {
  kind: "donation" | "pledge";
  reference: string;
  causeSlug: string;
  causeTitle: string;
  firstName: string;
  email: string | null;
  amount?: number;
  frequency?: "once" | RecurringPeriod;
  pledgeType?: PledgeType;
  amountPerPeriod?: number | null;
  numberOfPeriods?: number | null;
  totalAmount?: number | null;
  inKindDescription?: string | null;
  isFounding?: boolean;
}

export interface GiftInput {
  causeSlug: string;
  amount: number;
  frequency: "once" | RecurringPeriod;
  dedication?: string;
  donor: Donor;
}

export interface PledgeInput {
  causeSlug: string;
  pledgeType: PledgeType;
  amountPerPeriod: number | null;
  numberOfPeriods: number | null;
  inKindDescription?: string;
  donor: Donor;
}

export interface RecordedGift {
  reference: string;
  receiptToken: string;
}
