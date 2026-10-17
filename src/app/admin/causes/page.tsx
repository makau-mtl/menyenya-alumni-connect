import Link from "next/link";
import { Pencil } from "lucide-react";
import { PageHeader, Panel, Pill } from "@/components/portal/page-parts";
import { Button } from "@/components/shadcn/button";
import type { Metadata } from "next";
import { getStaff } from "@/lib/admin/staff";
import { lifecycleLabels } from "@/lib/admin/labels";
import { formatKesShort } from "@/lib/money";

export const metadata: Metadata = { title: "Causes" };

export default async function AdminCausesPage() {
  const staff = await getStaff();
  if (!staff?.isAdmin) return <p>Only administrators can edit causes.</p>;
  const { data } = await staff.supabase
    .from("causes")
    .select("slug, title, lifecycle, visibility, target_amount, cause_photos(count)")
    .order("sort_order");
  const causes = (data ?? []) as {
    slug: string; title: string; lifecycle: string; visibility: string; target_amount: number | null;
    cause_photos: { count: number }[];
  }[];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Administration"
        title="Causes"
        description="Edit what visitors read about each cause, tick off the launch checklist, and add photos. Changes show on the website straight away and are recorded in the audit log."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {causes.map((c) => (
          <Panel
            key={c.slug}
            title={c.title}
            actions={<Pill tone={c.lifecycle === "live" ? "good" : c.lifecycle === "closed" ? "muted" : "warn"}>{lifecycleLabels[c.lifecycle]?.label ?? c.lifecycle}</Pill>}
          >
            <p className="text-sm text-muted-foreground">
              {c.visibility === "members" ? "Members only" : "Public"}
              {c.target_amount && ` · target ${formatKesShort(Number(c.target_amount))}`}
              {` · ${c.cause_photos[0]?.count ?? 0} photos`}
            </p>
            <div className="mt-4 flex gap-2">
              <Button asChild size="sm"><Link href={`/admin/causes/${c.slug}`}><Pencil /> Edit</Link></Button>
              <Button asChild size="sm" variant="outline"><Link href={`/causes/${c.slug}`}>View on the website</Link></Button>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
