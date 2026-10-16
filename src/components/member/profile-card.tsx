/* eslint-disable @next/next/no-img-element */
import { initials } from "./member-tile";

export type CardMember = {
  full_name: string;
  category: string;
  year_left: number | null;
  relationship: string | null;
  region?: string | null;
  level?: string | null;
  headline: string | null;
  profession: string | null;
  employer?: string | null;
  products_services?: string | null;
  skills?: string[] | null;
  mentoring_offer?: string;
  willing_to_volunteer?: boolean;
  linkedin_url: string | null;
  profile_link: string | null;
  social_links: { label: string; url: string }[] | null;
};

function safeUrl(u: string | null | undefined) {
  return u && /^https:\/\//i.test(u) ? u : null;
}

/** A member's profile: used for the member card (signed in) and the public profile page. */
export function ProfileCard({ m, photo, publicView = false }: { m: CardMember; photo: string | null; publicView?: boolean }) {
  const friend = m.category === "friend";
  const links = [
    ...(safeUrl(m.linkedin_url) ? [{ label: "LinkedIn", url: m.linkedin_url! }] : []),
    ...(safeUrl(m.profile_link) ? [{ label: "Website", url: m.profile_link! }] : []),
    ...((m.social_links ?? []).filter((l) => safeUrl(l.url))),
  ];
  return (
    <article className="grid gap-8 md:grid-cols-[16rem_1fr]">
      <div>
        {photo ? (
          <img src={photo} alt={`Photo of ${m.full_name}`} className="aspect-square w-full max-w-64 rounded-2xl object-cover" />
        ) : (
          <span aria-hidden className="flex aspect-square w-full max-w-64 items-center justify-center rounded-2xl bg-tea-tint font-display text-6xl font-bold text-tea">
            {initials(m.full_name)}
          </span>
        )}
      </div>
      <div className="max-w-2xl">
        <p className={`inline-block rounded-full px-3 py-1 text-sm font-bold ${friend ? "bg-gold text-ink" : "bg-ink text-white"}`}>
          {friend ? `Friend of the alumni${m.relationship ? ` · ${m.relationship}` : ""}` : `Class of ${m.year_left}`}
        </p>
        <h1 className="mt-3 text-4xl font-bold">{m.full_name}</h1>
        {m.headline && <p className="mt-3 text-xl">{m.headline}</p>}
        <dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {[
            ["Profession", m.profession],
            ["Works at", m.employer],
            ["Regional cluster", publicView ? null : m.region],
            ["Membership level", publicView ? null : m.level],
          ]
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k as string}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
        </dl>
        {!publicView && m.products_services && (
          <div className="mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Products and services</h2>
            <p className="mt-1">{m.products_services}</p>
          </div>
        )}
        {!publicView && (m.skills?.length ?? 0) > 0 && (
          <ul aria-label="Skills" className="mt-6 flex flex-wrap gap-2">
            {m.skills!.map((s) => <li key={s} className="rounded-full bg-tea-tint px-3 py-1 text-sm font-semibold">{s}</li>)}
          </ul>
        )}
        {!publicView && (m.mentoring_offer === "can_mentor" || m.willing_to_volunteer) && (
          <p className="mt-6 font-semibold text-tea">
            {[m.mentoring_offer === "can_mentor" && "Open to mentoring", m.willing_to_volunteer && "Willing to volunteer"].filter(Boolean).join(" · ")}
          </p>
        )}
        {links.length > 0 && (
          <ul className="mt-6 flex flex-wrap gap-3">
            {links.map((l) => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex rounded-md border-2 border-ink px-4 py-2 font-semibold hover:bg-ink hover:text-white">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
