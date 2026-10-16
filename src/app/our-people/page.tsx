import Link from "next/link";
import type { Metadata } from "next";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/server";
import { getMember } from "@/lib/members/session";
import { classLabel, loadPositions, type PersonCardData } from "@/lib/people";
import { signedPhotoUrls } from "@/lib/members/photo-urls";
import { PersonCard } from "@/components/people/person-card";
import { SitePhoto } from "@/components/site-photo";
import { SectionTabs } from "@/components/people/section-tabs";
import { buttonClass, inputClass } from "@/components/ui";

export const metadata: Metadata = {
  title: "Our people",
  description: "The leadership, secretariat and members of the Menyenya SDA High School Alumni Association.",
};
// Members see term dates, so the page is built for each visitor.
export const dynamic = "force-dynamic";

const PAGE = 24;
type Props = { searchParams: Promise<{ q?: string; year?: string; page?: string }> };

function Grid({ people, compact, children }: { people: PersonCardData[]; compact?: boolean; children?: React.ReactNode }) {
  return (
    <ul
      className={`mt-10 grid ${compact ? "grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" : "gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3"}`}
    >
      {people.map(({ key, ...p }) => <PersonCard key={key} {...p} size={compact ? "compact" : "feature"} />)}
      {children}
    </ul>
  );
}

function Heading({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div className="max-w-2xl">
        <p className="font-semibold uppercase tracking-[0.18em] text-tea">{eyebrow}</p>
        <h2 className="mt-3 text-4xl font-bold sm:text-5xl">{title}</h2>
        <p className="mt-4 text-lg text-ink-soft sm:text-xl">{intro}</p>
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="mt-10 rounded-2xl border-2 border-dashed border-line p-8 text-center text-lg text-ink-soft">{children}</p>;
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
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-ink text-white">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(120deg,#17283b_0%,#1f3a52_55%,#2e6b4f_100%)]" />
        <div className="section grid items-center gap-10 py-14 lg:grid-cols-[1fr_1.1fr] lg:py-20">
          <div>
            <p className="font-semibold uppercase tracking-[0.18em] text-gold">Our people</p>
            <h1 className="mt-4 text-4xl font-bold leading-[1.1] sm:text-[3.4rem]">Many classes, one Menyenya family</h1>
            <p className="mt-6 max-w-xl text-lg text-white/80 sm:text-xl">
              Meet the board that leads the association, the secretariat that keeps it running, and the alumni and
              friends who make it what it is.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/join" className={buttonClass("gold", "lg")}>Join the association</Link>
              <a href="#leadership" className={buttonClass("light", "lg")}>Meet the leadership</a>
            </div>
          </div>
          <SitePhoto space="people.hero" sizes="(min-width: 1024px) 55vw, 100vw" className="shadow-2xl" />
        </div>
      </section>

      <SectionTabs
        sections={[
          { id: "leadership", label: "Leadership", count: leadership.length },
          { id: "secretariat", label: "Secretariat", count: secretariat.length },
          { id: "members", label: "Members", count: total },
        ]}
      />

      {/* Leadership */}
      <section id="leadership" className="scroll-mt-36 py-16 lg:py-24">
        <div className="section">
          <Heading eyebrow="The board" title="Leadership" intro="The association’s elected officials, and those who serve on the board in their official capacity." />
          {leadership.length ? <Grid people={leadership} /> : <Empty>The leadership will be announced here.</Empty>}
        </div>
      </section>

      {/* Secretariat */}
      <section id="secretariat" className="scroll-mt-36 bg-surface py-16 lg:py-24">
        <div className="section">
          <Heading eyebrow="Day to day" title="Secretariat" intro="The small team that keeps the association running: members’ records, communication, events and support for the board." />
          <Grid people={secretariat}>
            <li className="flex flex-col justify-between rounded-2xl bg-gold-tint p-8">
              <div>
                <p className="font-display text-2xl font-bold">Grow with us</p>
                <p className="mt-3 text-lg text-ink-soft">
                  Want to serve the Menyenya family? See the roles we are recruiting for.
                </p>
              </div>
              <Link href="/careers" className={`${buttonClass("primary")} mt-8 self-start`}>Work with us</Link>
            </li>
          </Grid>
        </div>
      </section>

      {/* Members */}
      <section id="members" className="scroll-mt-36 py-16 lg:py-24">
        <div className="section">
          <Heading eyebrow="The family" title="Members" intro="Alumni and friends of Menyenya who chose to share a public profile." />
          <form method="get" action="/our-people#members" className="mt-8 flex flex-wrap items-end gap-3 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line sm:p-5">
            <label className="flex min-w-56 flex-1 flex-col gap-1 text-sm font-semibold">
              Search
              <input name="q" defaultValue={q.q} placeholder="Name or profession" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Class of
              <input name="year" defaultValue={q.year} inputMode="numeric" placeholder="e.g. 2009" maxLength={4} className={`${inputClass} w-32`} />
            </label>
            <button type="submit" className={buttonClass("primary")}>Search</button>
            {(q.q || q.year) && <Link href="/our-people#members" className={buttonClass("quiet")}>Clear</Link>}
          </form>
          {members.length ? (
            <Grid people={members} compact />
          ) : (
            <Empty>{q.q || q.year ? "No members match. Try another name or class." : "Member profiles will appear here as members choose to share them."}</Empty>
          )}
          {pages > 1 && (
            <nav aria-label="Pages" className="mt-12 flex items-center justify-center gap-4">
              {page > 1 && <Link href={link({ page: String(page - 1) })} className={buttonClass("secondary", "sm")}>Previous</Link>}
              <span className="text-ink-soft">Page {page} of {pages}</span>
              {page < pages && <Link href={link({ page: String(page + 1) })} className={buttonClass("secondary", "sm")}>Next</Link>}
            </nav>
          )}
        </div>
      </section>

      {/* Closing */}
      <section className="section pb-20">
        <div className="grid items-center gap-10 overflow-hidden rounded-3xl bg-tea text-white lg:grid-cols-2">
          <SitePhoto space="people.join" sizes="(min-width: 1024px) 50vw, 100vw" className="rounded-none" />
          <div className="p-8 lg:p-12">
            <h2 className="text-3xl font-bold sm:text-4xl">Your class belongs here</h2>
            <p className="mt-4 text-lg text-white/85">
              Register as a member to find classmates in the directory, take part in the association, and add your own
              profile to this page if you wish.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/join" className={buttonClass("gold", "lg")}>Join the association</Link>
              <Link href="/login" className={buttonClass("light", "lg")}>Log in</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
