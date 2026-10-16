import Link from "next/link";
import type { Metadata } from "next";
import { getStaff } from "@/lib/admin/staff";
import { NewsForm } from "@/components/admin/news-form";

export const metadata: Metadata = { title: "New post" };

export default async function NewNewsPage() {
  const staff = await getStaff();
  if (!staff?.canEditNews) return <p>Only administrators and the Secretary can edit news.</p>;
  return (
    <div>
      <Link href="/admin/news" className="font-semibold text-tea underline underline-offset-4">
        All news and events
      </Link>
      <h2 className="mb-8 mt-4 text-3xl font-bold">New post</h2>
      <NewsForm post={null} />
    </div>
  );
}
