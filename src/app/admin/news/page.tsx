import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { Empty, PageHeader, Panel, Pill } from "@/components/portal/page-parts";
import { Button } from "@/components/shadcn/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/shadcn/table";
import type { Metadata } from "next";
import { getStaff } from "@/lib/admin/staff";
import { statusLabels } from "@/lib/admin/labels";
import { newsDateFormat } from "@/components/news-card";

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
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Administration"
        title="News and events"
        description="The three most recent published items also show on the home page."
        actions={<Button asChild><Link href="/admin/news/new"><Plus /> New post</Link></Button>}
      />
      {saved && <p role="status" className="rounded-md bg-secondary p-4 font-semibold">Saved. Published posts show on the website straight away.</p>}
      <Panel>
        {posts.length === 0 ? (
          <Empty>No posts yet.</Empty>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Kind</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
            <TableBody>
              {posts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="max-w-96 whitespace-normal font-semibold">{p.title}</TableCell>
                  <TableCell><Pill tone={p.kind === "event" ? "info" : "muted"}>{p.kind === "event" ? "Event" : "News"}</Pill></TableCell>
                  <TableCell>{newsDateFormat.format(new Date(p.happens_on))}</TableCell>
                  <TableCell><Pill tone={p.status === "published" ? "good" : "muted"}>{statusLabels[p.status]}</Pill></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {p.status === "published" && p.body?.length > 0 && <Button asChild size="sm" variant="ghost"><Link href={`/news/${p.slug}`}>View</Link></Button>}
                      <Button asChild size="sm" variant="outline"><Link href={`/admin/news/${p.id}`}><Pencil /> Edit</Link></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
