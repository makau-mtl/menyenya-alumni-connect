import type { Metadata } from "next";
import Link from "next/link";
import { Globe, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/page-hero";
import { buttonClass } from "@/components/ui";

export const metadata: Metadata = {
  title: "Buy from alumni",
  description: "Businesses run by alumni and friends of Menyenya SDA High School.",
};
export const revalidate = 300;

type Biz = { id: string; name: string; description: string; sector: string; county: string; area: string; phone: string | null; whatsapp: boolean; email: string | null; website: string | null; owner_year: number | null };

export default async function BusinessesPage() {
  let list: Biz[] = [];
  if (isSupabaseConfigured) {
    const { data, error } = await createPublicClient().rpc("public_businesses");
    if (error) console.error("Could not read businesses", error);
    list = (data ?? []) as Biz[];
  }
  const sectors = [...new Set(list.map((b) => b.sector))];
  return (
    <>
      <PageHero title="Buy from alumni" intro="Businesses run by Menyenya alumni and friends. Every purchase supports someone from our community.">
        <Link href="/app/opportunities/business" className={buttonClass("primary", "lg")}>List your business</Link>
      </PageHero>
      <section className="section pt-14">
        {list.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-line p-10 text-center">
            <h2 className="text-2xl font-bold">The first businesses are coming</h2>
            <p className="mx-auto mt-2 max-w-xl text-ink-soft">Members can list their business and choose to show it here.</p>
          </div>
        ) : sectors.map((s) => (
          <div key={s} className="mb-12">
            <h2 className="text-2xl font-bold">{s}</h2>
            <ul className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {list.filter((b) => b.sector === s).map((b) => (
                <li key={b.id} className="flex flex-col gap-3 rounded-2xl bg-card p-6 ring-1 ring-line">
                  <h3 className="text-xl font-bold">{b.name}</h3>
                  <p className="text-ink-soft">{b.description}</p>
                  {(b.area || b.county) && <p className="flex items-center gap-1.5 text-sm text-ink-soft"><MapPin className="size-4" /> {[b.area, b.county].filter(Boolean).join(", ")}</p>}
                  <div className="mt-auto flex flex-wrap gap-3 pt-2 text-sm font-semibold text-tea">
                    {b.phone && <a href={`tel:${b.phone}`} className="flex items-center gap-1 hover:underline"><Phone className="size-4" /> Call</a>}
                    {b.phone && b.whatsapp && <a href={`https://wa.me/${b.phone.replace(/\D/g, "").replace(/^0/, "254")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline"><MessageCircle className="size-4" /> WhatsApp</a>}
                    {b.email && <a href={`mailto:${b.email}`} className="flex items-center gap-1 hover:underline"><Mail className="size-4" /> Email</a>}
                    {b.website && <a href={b.website} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1 hover:underline"><Globe className="size-4" /> Website</a>}
                  </div>
                  {b.owner_year && <p className="text-xs text-ink-soft">Run by a member of the Class of {b.owner_year}</p>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </>
  );
}
