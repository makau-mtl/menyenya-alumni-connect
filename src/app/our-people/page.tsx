import Link from "next/link";
import type { Metadata } from "next";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/server";
import { getMember } from "@/lib/members/session";
import { classLabel, loadPositions, type PersonCardData } from "@/lib/people";
import { signedPhotoUrls } from "@/lib/members/photo-urls";
import { PersonCard } from "@/components/people/person-card";
import { PageHero } from "@/components/page-hero";
import { buttonClass, inputClass } from "@/components/ui";

export const metadata: Metadata = {
  title: "Our people",
  description: "The leadership, secretariat and members of the Menyenya SDA High School Alumni Association.",
};
// Members see term dates, so the page is built for each visitor.
export const dynamic = "force-dynamic";

const PAGE = 24;
type Props = { searchParams: Promise<{ q?: string; year?: string; page?: string }> };

function Grid({ people }: { people: PersonCardData[] }) {
  return (
    <ul className="mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {people.map(({ key, ...p }) => <PersonCard key={key} {...p} />)}
    </ul>
  );
}

export default async function OurPeoplePage({ searchParams }: Props) {
  const q = await searchParams;
  const page = Math.max(1, Number(q.page) || 1);
  let leadership: PersonCardData[] = [];
  let secretariat: PersonCardData[] = [];
  let members: PersonCardData[] = [];
  let total = 0;

  if (isSupabaseConfigured) {
    const db = createPublicClient();
    const member = await getMember();
    let terms = null;
    if (member?.registered) {
      const { data } = await member.supabase.rpc("people_terms");
      terms = new Map(((data ?? []) as { id: string; term_starts: string | null; term_ends: string | null }[]).map((t) => [t.id, t]));
    }
    ({ leadership, secretariat } = await loadPositions(db, terms));

    const { data } = await db.rpc("public_members", {
      p_query: q.q || null,
      p_year: Number(q.year) || null,
      p_limit: PAGE,
      p_offset: (page - 1) * PAGE,
    });
    const rows = (data ?? []) as {
      person_id: string; full_name: string; category: string; year_left: number | null; relationship: string | null;
      headline: string | null; linkedin_url: string | null; photo_path: string | null; total: number;
    }[];
    total = Number(rows[0]?.total ?? 0);
    const photos = await signedPhotoUrls(db, rows.map((r) => r.photo_path), "large");
    members = rows.map((r) => ({
      key: r.person_id,
      name: r.full_name,
      subtitle: classLabel(r.category, r.year_left) ?? "",
      classLabel: r.category === "friend" && r.relationship ? r.relationship : null,
      capacityNote: null,
      summary: r.headline,
      linkedinUrl: r.linkedin_url,
      photo: r.photo_path ? photos.get(r.photo_path) ?? null : null,
      term: null,
      link: `/people/${r.person_id}`,
    }));
  }
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const link = (over: Record<string, string | undefined>) => {
    const params = new URLSearchParams(Object.entries({ ...q, ...over }).filter((e): e is [string, string] => Boolean(e[1])));
    return `/our-people${params.size ? `?${params}` : ""}#members`;
  };

  return (
    <>
      <PageHero title="Our people" intro="The elected leadership, the secretariat and the members who make up the association." />

      <nav aria-label="Sections" className="sticky top-[4.4rem] z-30 border-b border-line bg-paper/95 backdrop-blur sm:top-[4.9rem]">
        <ul className="section flex gap-1 overflow-x-auto">
          {[
            ["#leadership", "Leadership"],
            ["#secretariat", "Secretariat"],
            ["#members", "Members"],
          ].map(([href, label]) => (
            <li key={href}>
              <a href={href} className="block border-b-[3px] border-transparent px-4 py-3 font-semibold text-ink-soft hover:border-tea hover:text-ink">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <section id="leadership" className="section scroll-mt-40 pt-14">
        <h2 className="text-3xl font-bold sm:text-4xl">Leadership</h2>
        <p className="mt-3 max-w-2xl text-lg text-ink-soft">The association&rsquo;s elected officials, and those who serve in their official capacity.</p>
        {leadership.length ? <Grid people={leadership} /> : <p className="mt-8 rounded-md bg-surface p-5 text-ink-soft">The leadership will be announced here.</p>}
      </section>

      <section id="secretariat" className="section scroll-mt-40 pt-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold sm:text-4xl">Secretariat</h2>
            <p className="mt-3 max-w-2xl text-lg text-ink-soft">The small team that keeps the association running day to day.</p>
          </div>
          <Link href="/careers" className={buttonClass("secondary")}>Work with us</Link>
        </div>
        {secretariat.length ? <Grid people={secretariat} /> : <p className="mt-8 rounded-md bg-surface p-5 text-ink-soft">The secretariat is being set up. See <Link href="/careers" className="underline">opportunities to work with us</Link>.</p>}
      </section>

      <section id="members" className="section scroll-mt-40 pt-20">
        <h2 className="text-3xl font-bold sm:text-4xl">Members</h2>
        <p className="mt-3 max-w-2xl text-lg text-ink-soft">
          Alumni and friends of Menyenya who chose to share a public profile.{" "}
          <Link href="/join" className="font-semibold text-tea underline underline-offset-4">Join the association</Link>
        </p>
        <form method="get" action="/our-people#members" className="mt-6 flex flex-wrap items-end gap-3">
          <label className="flex min-w-56 flex-1 flex-col gap-1 text-sm font-semibold sm:max-w-sm">
            Search
            <input name="q" defaultValue={q.q} placeholder="Name or profession" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Class
            <input name="year" defaultValue={q.year} inputMode="numeric" placeholder="e.g. 2009" maxLength={4} className={`${inputClass} w-32`} />
          </label>
          <button type="submit" className={buttonClass("primary")}>Search</button>
        </form>
        {members.length ? (
          <Grid people={members} />
        ) : (
          <p className="mt-8 rounded-md bg-surface p-5 text-ink-soft">{q.q || q.year ? "No members match." : "Member profiles will appear here as members choose to share them."}</p>
        )}
        {pages > 1 && (
          <nav aria-label="Pages" className="mt-10 flex items-center gap-4">
            {page > 1 && <Link href={link({ page: String(page - 1) })} className={buttonClass("secondary", "sm")}>Previous</Link>}
            <span className="text-sm text-ink-soft">Page {page} of {pages}</span>
            {page < pages && <Link href={link({ page: String(page + 1) })} className={buttonClass("secondary", "sm")}>Next</Link>}
          </nav>
        )}
      </section>
    </>
  );
}
