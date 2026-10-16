/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

export type TileMember = {
  person_id: string;
  full_name: string;
  category: string;
  year_left: number | null;
  relationship: string | null;
  region: string | null;
  headline: string | null;
  profession: string | null;
  mentoring_offer: string;
};

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

/** A directory tile: photo, name, class (or "Friend"), region and one-line summary. */
export function MemberTile({ m, photo }: { m: TileMember; photo?: string }) {
  const friend = m.category === "friend";
  return (
    <li>
      <Link href={`/app/directory/${m.person_id}`} className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface hover:border-ink">
        <div className="relative aspect-square w-full bg-tea-tint">
          {photo ? (
            <img src={photo} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <span aria-hidden className="flex h-full w-full items-center justify-center font-display text-4xl font-bold text-tea">
              {initials(m.full_name)}
            </span>
          )}
          <span className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-xs font-bold ${friend ? "bg-gold text-ink" : "bg-ink text-white"}`}>
            {friend ? "Friend" : `Class of ${m.year_left}`}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3">
          <p className="font-bold leading-snug group-hover:underline">{m.full_name}</p>
          <p className="text-sm text-ink-soft">
            {friend && m.relationship ? `${m.relationship} · ` : ""}
            {m.region}
          </p>
          {(m.headline || m.profession) && <p className="line-clamp-2 text-sm">{m.headline || m.profession}</p>}
          {m.mentoring_offer === "can_mentor" && <p className="mt-auto pt-1 text-xs font-semibold text-tea">Open to mentoring</p>}
        </div>
      </Link>
    </li>
  );
}
