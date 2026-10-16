import Link from "next/link";
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
    <div>
      <h2 className="text-2xl font-bold">Causes</h2>
      <p className="mt-2 max-w-2xl text-ink-soft">
        Edit what visitors read about each cause, tick off the launch checklist, and add photos. Changes show on the
        website straight away and are recorded in the audit log.
      </p>
      <ul className="mt-6 divide-y divide-line rounded-xl border border-line bg-surface">
        {causes.map((c) => (
          <li key={c.slug} className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <p className="text-lg font-bold">{c.title}</p>
              <p className="text-sm text-ink-soft">
                {lifecycleLabels[c.lifecycle]?.label ?? c.lifecycle}
                {c.visibility === "members" && " · members only"}
                {c.target_amount && ` · target ${formatKesShort(Number(c.target_amount))}`}
                {` · ${c.cause_photos[0]?.count ?? 0} photos`}
              </p>
            </div>
            <div className="flex gap-4">
              <Link href={`/causes/${c.slug}`} className="font-semibold text-ink-soft underline underline-offset-4">
                View
              </Link>
              <Link href={`/admin/causes/${c.slug}`} className="font-semibold text-tea underline underline-offset-4">
                Edit
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
