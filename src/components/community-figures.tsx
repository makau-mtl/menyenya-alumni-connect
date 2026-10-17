import { formatKesShort } from "@/lib/money";
import type { PublicFigures } from "@/lib/figures";

const n = new Intl.NumberFormat("en-KE");

/** "Our community in numbers": a band of live totals. Figures that aren't known yet are left out. */
export function CommunityFigures({ f, tone = "dark" }: { f: PublicFigures | null; tone?: "dark" | "light" }) {
  if (!f) return null;
  const items = [
    { value: n.format(f.members), label: "members registered", show: f.members > 0 },
    { value: n.format(f.classes), label: "classes represented", show: f.classes > 0 },
    { value: n.format(f.regions), label: "regions", show: f.regions > 0 },
    { value: f.tuitionPledged ? formatKesShort(f.tuitionPledged) : "", label: "pledged to the tuition block", show: Boolean(f.tuitionPledged) },
    { value: f.supported_by_alumni !== null ? n.format(f.supported_by_alumni) : "", label: "students supported by alumni", show: f.supported_by_alumni !== null && f.supported_by_alumni > 0 },
  ].filter((i) => i.show);
  if (items.length < 2) return null;
  const dark = tone === "dark";
  return (
    <section aria-labelledby="figures-heading" className={dark ? "bg-ink text-white" : "bg-surface"}>
      <div className="section py-14 lg:py-16">
        <h2 id="figures-heading" className={`text-sm font-semibold uppercase tracking-[0.16em] ${dark ? "text-gold" : "text-tea"}`}>
          Our community in numbers
        </h2>
        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((i) => (
            <div key={i.label} className={`border-l-2 pl-4 ${dark ? "border-gold/60" : "border-tea/40"}`}>
              <dd className="whitespace-nowrap font-display text-[1.65rem] font-bold sm:text-4xl">{i.value}</dd>
              <dt className={`mt-1 text-sm ${dark ? "text-white/75" : "text-ink-soft"}`}>{i.label}</dt>
            </div>
          ))}
        </dl>
        <p className={`mt-6 text-xs ${dark ? "text-white/60" : "text-ink-soft"}`}>Live from the platform. Totals only; nothing about any one person.</p>
      </div>
    </section>
  );
}
