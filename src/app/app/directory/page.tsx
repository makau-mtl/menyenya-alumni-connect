import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMember } from "@/lib/members/session";
import { signedPhotoUrls } from "@/lib/members/photo-urls";
import { MemberTile, type TileMember } from "@/components/member/member-tile";
import { buttonClass, inputClass } from "@/components/ui";

export const metadata: Metadata = { title: "Member directory" };

const PAGE = 48;
type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function DirectoryPage({ searchParams }: Props) {
  const member = await getMember();
  if (!member) redirect("/login?next=/app/directory");
  if (!member.registered || member.membershipStatus === "terminated") redirect("/app");
  const q = await searchParams;
  const page = Math.max(1, Number(q.page) || 1);
  const year = Number(q.year) || null;

  const [{ data, error }, { data: regions }, { data: cohorts }] = await Promise.all([
    member.supabase.rpc("directory_search", {
      p_query: q.q || null,
      p_year: year,
      p_region: q.region || null,
      p_category: q.category || null,
      p_mentoring: q.mentoring || null,
      p_limit: PAGE,
      p_offset: (page - 1) * PAGE,
    }),
    member.supabase.from("clusters").select("name").eq("active", true).order("sort_order"),
    member.supabase.from("cohorts").select("year_left").order("year_left", { ascending: false }),
  ]);
  if (error) console.error("Directory search failed", error);
  const rows = (data ?? []) as (TileMember & { photo_path: string | null; total: number })[];
  const total = rows[0]?.total ?? 0;
  const photos = await signedPhotoUrls(member.supabase, rows.map((r) => r.photo_path));
  const pages = Math.max(1, Math.ceil(Number(total) / PAGE));
  const link = (over: Record<string, string | undefined>) => {
    const params = new URLSearchParams(Object.entries({ ...q, ...over }).filter((e): e is [string, string] => Boolean(e[1])));
    return `/app/directory${params.size ? `?${params}` : ""}`;
  };
  const filtered = Boolean(q.q || q.year || q.region || q.category || q.mentoring);

  return (
    <div>
      <h1 className="text-4xl font-bold">Member directory</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        Members who chose to be listed. Phone numbers and emails are never shown here.
      </p>

      <form method="get" className="mt-8 grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] lg:items-end">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Search
          <input name="q" defaultValue={q.q} placeholder="Name, profession, skill…" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Class
          <select name="year" defaultValue={q.year ?? ""} className={inputClass}>
            <option value="">All classes</option>
            {(cohorts ?? []).filter((c) => c.year_left <= new Date().getFullYear()).map((c) => (
              <option key={c.year_left} value={c.year_left}>Class of {c.year_left}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Regional cluster
          <select name="region" defaultValue={q.region ?? ""} className={inputClass}>
            <option value="">All regions</option>
            {(regions ?? []).map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Members
          <select name="category" defaultValue={q.category ?? ""} className={inputClass}>
            <option value="">Alumni and friends</option>
            <option value="alumnus">Alumni</option>
            <option value="friend">Friends of the alumni</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Mentoring
          <select name="mentoring" defaultValue={q.mentoring ?? ""} className={inputClass}>
            <option value="">Anyone</option>
            <option value="can_mentor">Open to mentoring</option>
            <option value="wants_mentor">Looking for a mentor</option>
          </select>
        </label>
        <div className="flex gap-2">
          <button type="submit" className={buttonClass("primary")}>Show</button>
          {filtered && <Link href="/app/directory" className={buttonClass("quiet")}>Clear</Link>}
        </div>
      </form>

      <p className="mt-6 text-sm font-semibold text-ink-soft" role="status">
        {total === 0 ? "No members match." : `${total} member${total === 1 ? "" : "s"}`}
      </p>
      {rows.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {rows.map((m) => <MemberTile key={m.person_id} m={m} photo={m.photo_path ? photos.get(m.photo_path) : undefined} />)}
        </ul>
      )}
      {pages > 1 && (
        <nav aria-label="Pages" className="mt-8 flex items-center gap-4">
          {page > 1 && <Link href={link({ page: String(page - 1) })} className={buttonClass("secondary", "sm")}>Previous</Link>}
          <span className="text-sm text-ink-soft">Page {page} of {pages}</span>
          {page < pages && <Link href={link({ page: String(page + 1) })} className={buttonClass("secondary", "sm")}>Next</Link>}
        </nav>
      )}
      <p className="mt-10 text-sm text-ink-soft">
        Not seeing yourself? Switch on &ldquo;List me in the member directory&rdquo; in{" "}
        <Link href="/app/profile#choices" className="underline">My profile</Link>.
      </p>
    </div>
  );
}
