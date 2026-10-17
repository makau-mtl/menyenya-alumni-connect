import Link from "next/link";
import { Briefcase, Flag, HandHeart, Store } from "lucide-react";
import { reportOpportunity, setOpportunityStatus } from "@/app/app/actions";
import { Button } from "@/components/shadcn/button";
import { inputClass } from "@/components/ui";

const tabs = [
  { href: "/app/opportunities/jobs", label: "Jobs", icon: Briefcase },
  { href: "/app/opportunities/business", label: "Business", icon: Store },
  { href: "/app/opportunities/volunteer", label: "Volunteer", icon: HandHeart },
];

/** Jobs · Business · Volunteer switcher at the top of each Opportunities page. */
export function OpportunityTabs({ active }: { active: string }) {
  return (
    <nav aria-label="Opportunities" className="flex flex-wrap gap-2">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} aria-current={active === t.href ? "page" : undefined}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 ${active === t.href ? "bg-ink text-white ring-ink" : "bg-card ring-border hover:ring-tea"}`}>
          <t.icon className="size-4" /> {t.label}
        </Link>
      ))}
    </nav>
  );
}

/** Remove (own post), hide/show (administrators), or report (everyone else). */
export function PostControls({ type, id, mine, isAdmin, reports }: { type: "job" | "business" | "business_opportunity"; id: string; mine: boolean; isAdmin: boolean; reports: number | null }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {isAdmin && reports ? <span className="text-sm font-semibold text-alert">Reported {reports}×</span> : null}
      {mine && (
        <form action={setOpportunityStatus}>
          <input type="hidden" name="type" value={type} /><input type="hidden" name="id" value={id} />
          <Button size="sm" variant="ghost" name="status" value="removed">Remove</Button>
        </form>
      )}
      {isAdmin && !mine && (
        <form action={setOpportunityStatus}>
          <input type="hidden" name="type" value={type} /><input type="hidden" name="id" value={id} />
          <Button size="sm" variant="outline" name="status" value="hidden">Hide</Button>
        </form>
      )}
      {!mine && (
        <details className="relative">
          <summary className="flex cursor-pointer list-none items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted" aria-label="Report this post">
            <Flag className="size-4" />
          </summary>
          <form action={reportOpportunity} className="absolute right-0 z-10 mt-1 flex w-64 flex-col gap-2 rounded-lg bg-popover p-3 shadow-lg ring-1 ring-border">
            <input type="hidden" name="type" value={type} /><input type="hidden" name="id" value={id} />
            <label className="text-sm font-semibold">What&rsquo;s wrong with it?<input name="reason" maxLength={300} className={`${inputClass} mt-1`} /></label>
            <Button size="sm" variant="destructive">Report to administrators</Button>
          </form>
        </details>
      )}
    </div>
  );
}

export const posterLine = (name: string, year: number | null) => `${name}${year ? `, Class of ${year}` : ""}`;
