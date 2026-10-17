import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMember } from "@/lib/members/session";
import { getStaff } from "@/lib/admin/staff";
import { memoryUrls, type MemoryRow } from "@/lib/members/memories";
import { MemoryUpload } from "@/components/member/memory-upload";
import { MemoryCard } from "@/components/member/memory-card";
import { Button } from "@/components/shadcn/button";

export const metadata: Metadata = { title: "Memories" };

type Props = { searchParams: Promise<{ before?: string; reported?: string }> };

export default async function MemoriesPage({ searchParams }: Props) {
  const member = await getMember();
  if (!member?.registered) redirect("/login?next=/app/memories");
  const q = await searchParams;
  const staff = await getStaff();
  const isAdmin = Boolean(staff?.isAdmin);
  const reportedOnly = isAdmin && q.reported === "1";
  const { data } = await member.supabase.rpc("memory_feed", { p_limit: 24, p_before: q.before ?? null, p_reported_only: reportedOnly });
  const rows = (data ?? []) as MemoryRow[];
  const [urls, comments] = await Promise.all([
    memoryUrls(member.supabase, rows.map((r) => r.photo_path), "small"),
    Promise.all(rows.map(async (r) => (Number(r.comments) ? ((await member.supabase.rpc("memory_comment_list", { p_memory: r.id })).data ?? []) : []))),
  ]);
  const last = rows.at(-1)?.created_at;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-tea">Our memories</p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Memories</h1>
          <p className="mt-2 max-w-2xl text-ink-soft">Old class photos, reunions with comrades, visits to the school. Shared with fellow members only.</p>
        </div>
        {isAdmin && (
          <Button asChild variant="outline"><Link href={reportedOnly ? "/app/memories" : "/app/memories?reported=1"}>{reportedOnly ? "Show all" : "Show reported only"}</Link></Button>
        )}
      </div>
      <MemoryUpload />
      {rows.length === 0 ? (
        <p className="rounded-xl border-2 border-dashed border-border p-8 text-center text-muted-foreground">
          {reportedOnly ? "Nothing reported." : "No memories yet. Share the first one."}
        </p>
      ) : (
        <div className="columns-1 gap-5 sm:columns-2 xl:columns-3 [&>*]:mb-5 [&>*]:break-inside-avoid">
          {rows.map((r, i) => (
            <MemoryCard key={r.id} m={r} photo={urls.get(r.photo_path) ?? null} comments={comments[i] as { id: string; full_name: string; body: string }[]} isAdmin={isAdmin} />
          ))}
        </div>
      )}
      {rows.length === 24 && last && (
        <Button asChild variant="outline" className="self-center"><Link href={`/app/memories?before=${encodeURIComponent(last)}`}>Older memories</Link></Button>
      )}
    </div>
  );
}
