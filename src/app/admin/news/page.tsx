import Link from "next/link";
import type { Metadata } from "next";
import { getStaff } from "@/lib/admin/staff";
import { statusLabels } from "@/lib/admin/labels";
import { newsDateFormat } from "@/components/news-card";
import { buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "News and events" };

type Props = { searchParams: Promise<{ saved?: string }> };

export default async function AdminNewsPage({ searchParams }: Props) {
  const staff = await getStaff();
  if (!staff?.canEditNews) return <p>Only administrators and the Secretary can edit news.</p>;
  const { saved } = await searchParams;
  const { data } = await staff.supabase
    .from("news_posts")
    .select("id, slug, kind, title, happens_on, status, body")
    .order("happens_on", { ascending: false });
  const posts = (data ?? []) as { id: string; slug: string; kind: string; title: string; happens_on: string; status: string; body: string[] }[];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">News and events</h2>
          <p className="mt-2 max-w-2xl text-ink-soft">The three most recent published items also show on the home page.</p>
        </div>
        <Link href="/admin/news/new" className={buttonClass("primary")}>
          New post
        </Link>
      </div>
      {saved && (
        <p role="status" className="mt-6 rounded-md bg-tea-tint p-4 font-semibold">
          Saved. Published posts show on the website straight away.
        </p>
      )}
      <ul className="mt-6 divide-y divide-line rounded-xl border border-line bg-surface">
        {posts.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <p className="text-lg font-bold">{p.title}</p>
              <p className="text-sm text-ink-soft">
                {p.kind === "event" ? "Event" : "News"} · {newsDateFormat.format(new Date(p.happens_on))} ·{" "}
                <span className={p.status === "published" ? "font-semibold text-tea" : ""}>{statusLabels[p.status]}</span>
              </p>
            </div>
            <div className="flex gap-4">
              {p.status === "published" && p.body?.length > 0 && (
                <Link href={`/news/${p.slug}`} className="font-semibold text-ink-soft underline underline-offset-4">
                  View
                </Link>
              )}
              <Link href={`/admin/news/${p.id}`} className="font-semibold text-tea underline underline-offset-4">
                Edit
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
