import { PageHeader, Panel } from "@/components/portal/page-parts";
import type { Metadata } from "next";
import { getStaff } from "@/lib/admin/staff";
import { NewsForm } from "@/components/admin/news-form";

export const metadata: Metadata = { title: "New post" };

export default async function NewNewsPage() {
  const staff = await getStaff();
  if (!staff?.canEditNews) return <p>Only administrators and the Secretary can edit news.</p>;
  return (
    <div className="flex flex-col gap-8">
      <PageHeader back={{ href: "/admin/news", label: "All news and events" }} eyebrow="News and events" title="New post" />
      <Panel className="max-w-4xl">
        <NewsForm post={null} />
      </Panel>
    </div>
  );
}
