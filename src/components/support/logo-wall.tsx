/* eslint-disable @next/next/no-img-element */
import type { Supporter } from "@/lib/support";

/** Sponsor or partner logos in a tidy grid. Names stand in until a logo is uploaded. */
export function LogoWall({ supporters, small = false }: { supporters: Supporter[]; small?: boolean }) {
  return (
    <ul className={`grid gap-4 ${small ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"}`}>
      {supporters.map((s) => {
        const inner = s.logo ? (
          <img src={s.logo} alt={s.name} loading="lazy" className="max-h-full max-w-full object-contain grayscale transition group-hover:grayscale-0" />
        ) : (
          <span className="text-center font-display text-lg font-bold text-ink-soft group-hover:text-ink">{s.name}</span>
        );
        const box = `group flex items-center justify-center rounded-2xl bg-surface p-6 ring-1 ring-line transition hover:shadow-md ${small ? "h-24" : "h-32"}`;
        return (
          <li key={s.id}>
            {s.url ? (
              <a href={s.url} target="_blank" rel="noopener noreferrer" className={box} title={s.name}>{inner}</a>
            ) : (
              <div className={box} title={s.name}>{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
