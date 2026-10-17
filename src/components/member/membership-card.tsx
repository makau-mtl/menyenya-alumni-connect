/* eslint-disable @next/next/no-img-element */

export type MembershipCardData = {
  name: string;
  photo: string | null;
  lines: string[];        // e.g. "Class of 2010", "Nairobi region", "Growth level"
  active: boolean | null; // null when standing is unknown
  standingLabel: string;
  since: number | null;
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

/** A digital membership card for the dashboard, in the association's colours. */
export function MembershipCard({ c }: { c: MembershipCardData }) {
  return (
    <section
      aria-label="Membership card"
      className="relative isolate flex w-full flex-col justify-between overflow-hidden rounded-2xl bg-ink p-5 text-white shadow-[0_18px_40px_-18px_rgba(23,40,59,0.7)] sm:max-w-md lg:max-w-none"
    >
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(125deg,#17283b_0%,#1f3a52_55%,#2e6b4f_100%)]" />
      <svg aria-hidden className="absolute inset-0 -z-10 h-full w-full text-white opacity-[0.05]">
        <defs>
          <pattern id="card-bond" width="48" height="24" patternUnits="userSpaceOnUse">
            <rect x="1" y="1" width="46" height="10" rx="1" fill="currentColor" />
            <rect x="-23" y="13" width="46" height="10" rx="1" fill="currentColor" />
            <rect x="25" y="13" width="46" height="10" rx="1" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#card-bond)" />
      </svg>
      <div className="flex items-start justify-between gap-3">
        <p className="text-lg leading-none tracking-tight">
          <span className="font-black">mhs</span>
          <span className="font-black text-gold">.</span>
          <span>alumni</span>
        </p>
        {c.active !== null && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${c.active ? "bg-gold text-ink" : "bg-white/15 text-white"}`}>
            {c.standingLabel}
          </span>
        )}
      </div>
      <div className="mt-5 flex items-center gap-4">
        {c.photo ? (
          <img src={c.photo} alt="" className="size-16 shrink-0 rounded-xl object-cover ring-2 ring-white/30" />
        ) : (
          <span aria-hidden className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-white/10 font-display text-xl font-bold ring-2 ring-white/20">
            {initials(c.name)}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-display text-xl font-bold leading-tight">{c.name}</p>
          <p className="mt-1 text-sm text-white/80">{c.lines.join(" · ")}</p>
        </div>
      </div>
      <div className="mt-5 flex items-end justify-between text-xs text-white/60">
        <span className="uppercase tracking-[0.12em]">Menyenya SDA High School</span>
        {c.since && <span>Member since {c.since}</span>}
      </div>
    </section>
  );
}
