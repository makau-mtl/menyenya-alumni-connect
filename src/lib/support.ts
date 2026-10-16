import "server-only";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/server";
import { toPhoto } from "@/lib/photos";

export type SupporterKind = "sponsor" | "partner";

export type SupportPackage = {
  id: string;
  name: string;
  audience: string | null;
  description: string;
  benefits: string[];
  amount: string;
};

export type Supporter = { id: string; name: string; url: string | null; logo: string | null; blurb: string | null; kind: SupporterKind };

const kes = new Intl.NumberFormat("en-KE");

export function amountLabel(amount: number | null, period: string | null) {
  if (!amount) return "Amount on request";
  return `KES ${kes.format(amount)}${period === "annual" ? " a year" : ""}`;
}

/** Published packages for one page. Empty if the database isn't reachable (e.g. before migrations run). */
export async function getPackages(kind: SupporterKind): Promise<SupportPackage[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await createPublicClient()
    .from("support_packages")
    .select("id, name, audience, description, benefits, amount_kes, amount_period")
    .eq("kind", kind)
    .eq("status", "published")
    .order("sort_order")
    .order("name");
  if (error) return [];
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    audience: p.audience,
    description: p.description,
    benefits: p.benefits ?? [],
    amount: amountLabel(p.amount_kes, p.amount_period),
  }));
}

/** Published sponsors and partners. `featuredOnly` for the home page strip. */
export async function getSupporters(opts: { kind?: SupporterKind; featuredOnly?: boolean } = {}): Promise<Supporter[]> {
  if (!isSupabaseConfigured) return [];
  let q = createPublicClient()
    .from("supporters")
    .select("id, kind, name, website_url, logo_path, blurb")
    .eq("status", "published")
    .order("sort_order")
    .order("name");
  if (opts.kind) q = q.eq("kind", opts.kind);
  if (opts.featuredOnly) q = q.eq("featured", true);
  const { data, error } = await q;
  if (error) return [];
  return (data ?? []).map((s) => ({
    id: s.id,
    kind: s.kind,
    name: s.name,
    url: s.website_url,
    logo: s.logo_path ? toPhoto(s.logo_path, s.name).srcSmall : null,
    blurb: s.blurb,
  }));
}
