import type { Metadata } from "next";
import { getStaff } from "@/lib/admin/staff";
import { ImpactStoryForm } from "@/components/admin/impact-forms";
import { PageHeader, Panel } from "@/components/portal/page-parts";

export const metadata: Metadata = { title: "Write an impact story" };

export default async function NewImpactStoryPage() {
  const staff = await getStaff();
  if (!staff?.canEditStories) return <p>Only administrators, the Secretary and the Chairman can write stories.</p>;
  const { data } = await staff.supabase.from("causes").select("id, title").order("sort_order");
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{ href: "/admin/stories", label: "Alumni stories" }}
        eyebrow="Impact from our work"
        title="Write an impact story"
        description="A bursary student who stayed in school, a project handed over, a mentoring success. Tied to an initiative, with an optional short video."
      />
      <Panel className="max-w-3xl"><ImpactStoryForm causes={(data ?? []) as { id: string; title: string }[]} /></Panel>
    </div>
  );
}
