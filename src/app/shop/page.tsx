import type { Metadata } from "next";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/server";
import { toPhoto } from "@/lib/photos";
import { SitePhoto } from "@/components/site-photo";
import { Shop, type ShopItem } from "@/components/shop/shop";
import { buttonClass } from "@/components/ui";

export const metadata: Metadata = {
  title: "Alumni merchandise",
  description: "Order Menyenya SDA High School alumni T-shirts, caps, mugs and more. Every purchase supports the association.",
};

async function getItems(): Promise<ShopItem[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await createPublicClient()
    .from("merch_items")
    .select("id, name, description, price_kes, options, option_label, photo_path")
    .eq("status", "published")
    .order("sort_order")
    .order("name");
  if (error) return [];
  return (data ?? []).map((i) => ({
    id: i.id,
    name: i.name,
    description: i.description,
    price: Number(i.price_kes),
    options: i.options ?? [],
    optionLabel: i.option_label,
    photo: i.photo_path ? toPhoto(i.photo_path, i.name).srcSmall : null,
  }));
}

const steps = [
  { title: "Choose and send", text: "Pick your items and sizes and send the order. Nothing to pay yet." },
  { title: "We call to confirm", text: "Someone from the association confirms your order and when it will be ready." },
  { title: "Pay and collect", text: "Pay through the official Paybill with your order reference, then collect your items." },
];

export default async function ShopPage() {
  const items = await getItems();
  return (
    <>
      <section className="relative isolate overflow-hidden bg-ink text-white">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(120deg,#17283b_0%,#1f3a52_55%,#2e6b4f_100%)]" />
        <div className="section grid items-center gap-10 py-14 lg:grid-cols-[1fr_1.1fr] lg:py-20">
          <div>
            <p className="font-semibold uppercase tracking-[0.18em] text-gold">Alumni merchandise</p>
            <h1 className="mt-4 text-4xl font-bold leading-[1.1] sm:text-[3.25rem]">Wear Menyenya with pride</h1>
            <p className="mt-6 max-w-xl text-lg text-white/80 sm:text-xl">
              T-shirts, caps, mugs and more for alumni, friends and families. Every purchase supports the association&rsquo;s work.
            </p>
            <a href="#items" className={`${buttonClass("gold", "lg")} mt-8`}>Order alumni merchandise</a>
          </div>
          <SitePhoto space="shop.hero" sizes="(min-width: 1024px) 55vw, 100vw" className="shadow-2xl" />
        </div>
      </section>

      <section className="section pt-14">
        <ol className="grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold font-display text-lg font-bold text-ink">{i + 1}</span>
              <div>
                <p className="font-display text-xl font-bold">{s.title}</p>
                <p className="mt-1 text-ink-soft">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="items" className="section scroll-mt-24 pb-24 pt-16">
        <h2 className="text-4xl font-bold sm:text-5xl">Order alumni merchandise</h2>
        <div className="mt-10">
          {items.length ? (
            <Shop items={items} />
          ) : (
            <p className="rounded-2xl border-2 border-dashed border-line p-10 text-center text-lg text-ink-soft">
              Merchandise is coming soon. Check back shortly.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
