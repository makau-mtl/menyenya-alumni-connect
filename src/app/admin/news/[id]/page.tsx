import Link from "next/link";
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
    <div>
      <Link href="/admin/news" className="font-semibold text-tea underline underline-offset-4">
        All news and events
      </Link>
      <h2 className="mb-8 mt-4 text-3xl font-bold">Edit post</h2>
      <NewsForm post={toNewsPost(data as NewsRow)} />
    </div>
  );
}
