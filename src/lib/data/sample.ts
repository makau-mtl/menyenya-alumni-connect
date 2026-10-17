import type { Cause, Fund, PaymentChannel } from "@/lib/types";

// Sample data for the preview. Replaced by Supabase tables (SPEC §5.4) in a later milestone.
// Figures marked "plenary" are real: 18 members pledged KES 3.41M on 20 September 2026.

export const channels: PaymentChannel[] = [
  {
    id: "bom-tuition",
    name: "BoM Tuition Block Paybill",
    holder: "school_bom",
    paybillNumber: null, // to be confirmed by the Board of Management
    accountDisplayName: "Menyenya SDA High School Board of Management, Tuition Block project account",
  },
  {
    id: "association",
    name: "Association Paybill",
    holder: "association",
    paybillNumber: null, // opened after registration
    accountDisplayName: "Menyenya SDA High School Alumni Association account",
  },
  {
    id: "association-bursary",
    name: "Bursary Fund account",
    holder: "association",
    paybillNumber: null,
    accountDisplayName: "Menyenya Alumni Bursary Fund account (association)",
  },
];

export const funds: Fund[] = [
  { id: "tuition-block-fund", name: "Tuition Block Fund", channelId: "bom-tuition" },
  { id: "general-fund", name: "General Fund", channelId: "association" },
  { id: "needy-students-fund", name: "Menyenya Alumni Bursary Fund", channelId: "association-bursary" },
];

export const causes: Cause[] = [
  {
    slug: "tuition-block",
    title: "The tuition block",
    summary:
      "A modern tuition block with a library, computer laboratories, classrooms and offices, raised by alumni over three years.",
    story: [
      "At our plenary on 20 September 2026, members agreed to raise KES 100 million over three years for a new tuition block at Menyenya SDA High School.",
      "The block brings together the spaces students need most: a library for quiet study, at least two computer laboratories, more classrooms to ease crowding, and offices to run them.",
      "Before the campaign launches, we are putting the foundations in place: the association's registration, an agreement with the school, and a dedicated project account held by the school's Board of Management.",
    ],
    kind: "campaign",
    fundId: "tuition-block-fund",
    targetAmount: 100_000_000,
    lifecycle: "preparation",
    pledgesEnabled: true,
    presetAmounts: [1_000, 2_500, 5_000, 10_000, 50_000],
    recurringPeriods: ["monthly", "quarterly", "annually"],
    suggestedPledges: [
      { label: "KES 1,000 a month for 3 years", perPeriod: 1_000, periods: 36, period: "monthly" },
      { label: "KES 2,500 a month for 3 years", perPeriod: 2_500, periods: 36, period: "monthly", sweetSpot: true },
      { label: "KES 5,000 a month for 3 years", perPeriod: 5_000, periods: 36, period: "monthly" },
      { label: "KES 100,000 once", perPeriod: 100_000, periods: 1, period: "one_time" },
    ],
    components: [
      { name: "Library", purpose: "Reference materials, quiet study and research" },
      { name: "Computer laboratories", purpose: "At least two, for ICT lessons, digital skills and computer-based exams" },
      { name: "Classrooms", purpose: "Ease crowding in existing classrooms" },
      { name: "Offices", purpose: "To run the library, ICT and the block" },
    ],
    readiness: [
      { label: "Members agree the project at the plenary", done: true },
      { label: "Founding pledges from members", done: true },
      { label: "Association registration certificate", done: false },
      { label: "Alumni–School agreement (MOU) signed", done: false },
      { label: "Board of Management project account and Paybill confirmed", done: false },
      { label: "Alumni representative named to the school's project committee", done: false },
      { label: "Official launch", done: false },
    ],
  },
  {
    slug: "alumni-fund",
    title: "Menyenya Alumni Fund",
    summary:
      "Flexible support for the association's work and the school's urgent needs, directed by elected leaders and reported to members.",
    story: [
      "Gifts to this fund support the association's work: running costs, events that bring alumni together, and urgent needs at the school.",
      "Every shilling is recorded and reported in the association's annual financial report.",
    ],
    kind: "general",
    fundId: "general-fund",
    targetAmount: null,
    lifecycle: "live",
    pledgesEnabled: false,
    presetAmounts: [500, 1_000, 2_500, 5_000],
    recurringPeriods: ["monthly", "annually"],
    suggestedPledges: [],
    components: [],
    readiness: [],
  },
  {
    slug: "bursary-fund",
    title: "Menyenya Alumni Bursary Fund",
    summary: "Bursaries that keep bright students from struggling families in class. Paid straight to the school, for students vetted by alumni.",
    story: [
      "Every year Menyenya admits students whose families cannot keep up with school fees. Some miss weeks of lessons; some never finish. Talent is everywhere, but opportunity is not.",
      "The Menyenya Alumni Bursary Fund removes that barrier. Each bursary pays a student's fees for the full year, straight to the school, so they can stay in class and focus on learning.",
      "Removing barriers to education gives these students hope, and gives Menyenya the chance to do what it does best: shape young people who go on to lift their families and communities.",
    ],
    kind: "ongoing_fund",
    fundId: "needy-students-fund",
    targetAmount: null,
    lifecycle: "live",
    pledgesEnabled: true,
    presetAmounts: [1_000, 5_000, 10_000, 25_000],
    recurringPeriods: ["monthly", "quarterly", "annually"],
    suggestedPledges: [],
    components: [],
    readiness: [],
  },
];

/** Founding pledges made at the plenary, before any online giving. */
export const plenaryPledges = { causeSlug: "tuition-block", total: 3_410_000, count: 18, on: "2026-09-20" };
