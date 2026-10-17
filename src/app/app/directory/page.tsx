import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMember } from "@/lib/members/session";
import { signedPhotoUrls } from "@/lib/members/photo-urls";
import { MemberTile, type TileMember } from "@/components/member/member-tile";
import { inputClass } from "@/components/ui";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/portal/page-parts";
import { Button } from "@/components/shadcn/button";

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

  const [{ data, error }, { data: regions }, { data: cohorts }, { data: dorms }, { data: streams }] = await Promise.all([
    member.supabase.rpc("directory_search", {
      p_query: q.q || null,
      p_year: year,
      p_region: q.region || null,
      p_category: q.category || null,
      p_mentoring: q.mentoring || null,
      p_limit: PAGE,
      p_offset: (page - 1) * PAGE,
      p_stream: q.stream || null,
      p_dorm: q.dorm || null,
    }),
    member.supabase.from("clusters").select("name").eq("active", true).order("sort_order"),
    member.supabase.from("cohorts").select("year_left").order("year_left", { ascending: false }),
    member.supabase.from("school_dorms").select("id, name").eq("status", "published").order("sort_order").order("name"),
    member.supabase.from("school_streams").select("id, name").eq("status", "published").order("sort_order").order("name"),
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
  const filtered = Boolean(q.q || q.year || q.region || q.category || q.mentoring || q.dorm || q.stream);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="My account"
        title="Member directory"
        description="Every member of the association. Phone numbers and emails appear on a member's card only if they choose to share them."
        actions={<Button asChild variant="outline"><Link href="/app/community">Members in numbers</Link></Button>}
      />

      <form method="get" className="grid gap-3 rounded-xl bg-card p-4 shadow-sm ring-1 ring-border sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
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
        {(dorms ?? []).length > 0 && (
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Dormitory
            <select name="dorm" defaultValue={q.dorm ?? ""} className={inputClass}>
              <option value="">Any dormitory</option>
              {(dorms ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
        )}
        {(streams ?? []).length > 0 && (
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Stream
            <select name="stream" defaultValue={q.stream ?? ""} className={inputClass}>
              <option value="">Any stream</option>
              {(streams ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
        )}
        <div className="flex gap-2">
          <Button type="submit"><Search /> Show</Button>
          {filtered && <Button asChild variant="ghost"><Link href="/app/directory">Clear</Link></Button>}
        </div>
      </form>

      <p className="text-sm font-semibold text-muted-foreground" role="status">
        {total === 0 ? "No members match." : `${total} member${total === 1 ? "" : "s"}`}
      </p>
      {rows.length > 0 && (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {rows.map((m) => <MemberTile key={m.person_id} m={m} photo={m.photo_path ? photos.get(m.photo_path) : undefined} />)}
        </ul>
      )}
      {pages > 1 && (
        <nav aria-label="Pages" className="flex items-center gap-4">
          {page > 1 && <Button asChild size="sm" variant="outline"><Link href={link({ page: String(page - 1) })}>Previous</Link></Button>}
          <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
          {page < pages && <Button asChild size="sm" variant="outline"><Link href={link({ page: String(page + 1) })}>Next</Link></Button>}
        </nav>
      )}
      <p className="text-sm text-muted-foreground">
        Choose who can see your phone and email in{" "}
        <Link href="/app/profile#choices" className="underline">My profile</Link>.
      </p>
    </div>
  );
}
