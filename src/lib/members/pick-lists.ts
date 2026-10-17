import "server-only";
import { createPublicClient } from "@/lib/supabase/server";

// Pick lists for registration and the profile. All are public reference data.

export type Level = {
  name: string;
  description: string;
  offers: string | null;
  feeAmount: number;
  feeType: "none" | "one_off" | "annual";
  canMentor: boolean;
  canRequestMentor: boolean;
};

export type PickLists = {
  counties: { name: string; region: string }[];
  regions: { name: string; description: string | null }[];
  levels: Level[];
  years: number[];
  friendFee: { amount: number; type: string };
  feesOn: boolean;
  registrationOpen: boolean;
};

export async function getPickLists(): Promise<PickLists> {
  const db = createPublicClient();
  const [counties, regions, levels, cohorts, categories, modules] = await Promise.all([
    db.from("counties").select("name, sort_order, clusters(name)").eq("active", true).order("sort_order"),
    db.from("clusters").select("name, description").eq("active", true).order("sort_order"),
    db
      .from("membership_levels")
      .select("name, description, offers, fee_amount, fee_type, can_mentor, can_request_mentor")
      .eq("active", true)
      .order("sort_order"),
    db.from("cohorts").select("year_left").order("year_left", { ascending: false }),
    db.from("member_categories").select("key, fee_amount, fee_type").eq("key", "friend").maybeSingle(),
    db.from("module_settings").select("module_key, enabled"),
  ]);
  const enabled = (key: string) => Boolean(modules.data?.find((m) => m.module_key === key)?.enabled);
  return {
    counties: ((counties.data ?? []) as unknown as { name: string; clusters: { name: string } | null }[]).map((c) => ({
      name: c.name,
      region: c.clusters?.name ?? "",
    })),
    regions: regions.data ?? [],
    levels: (levels.data ?? []).map((l) => ({
      name: l.name,
      description: l.description ?? "",
      offers: l.offers,
      feeAmount: Number(l.fee_amount),
      feeType: l.fee_type,
      canMentor: l.can_mentor,
      canRequestMentor: l.can_request_mentor,
    })),
    years: (cohorts.data ?? []).map((c) => c.year_left).filter((y) => y <= new Date().getFullYear()),
    friendFee: { amount: Number(categories.data?.fee_amount ?? 0), type: categories.data?.fee_type ?? "none" },
    feesOn: enabled("membership_fees"),
    registrationOpen: enabled("registration"),
  };
}

export async function getInvite(token: string | undefined) {
  if (!token || !/^[\w-]{6,40}$/.test(token)) return null;
  const { data } = await createPublicClient().rpc("invite_info", { p_token: token });
  const row = (data as { label: string; year_left: number | null; tester?: boolean }[] | null)?.[0];
  return row ? { token, label: row.label, yearLeft: row.year_left, tester: row.tester === true } : null;
}
