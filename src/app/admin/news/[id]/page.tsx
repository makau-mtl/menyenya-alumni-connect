import { PageHeader, Panel } from "@/components/portal/page-parts";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStaff } from "@/lib/admin/staff";
import { newsColumns, toNewsPost, type NewsRow } from "@/lib/data/supabase-store";
import { NewsForm } from "@/components/admin/news-form";

export const metadata: Metadata = { title: "Edit post" };

type Props = { params: Promise<{ id: string }> };

export default async function EditNewsPage({ params }: Props) {
  const { id } = await params;
  const staff = await getStaff();
  if (!staff?.canEditNews) return <p>Only administrators and the Secretary can edit news.</p>;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { data } = await staff.supabase.from("news_posts").select(newsColumns).eq("id", id).maybeSingle();
  if (!data) notFound();
  return (
    <div className="flex flex-col gap-8">
      <PageHeader back={{ href: "/admin/news", label: "All news and events" }} eyebrow="News and events" title="Edit post" />
      <Panel className="max-w-4xl">
        <NewsForm post={toNewsPost(data as NewsRow)} />
      </Panel>
    </div>
  );
}
