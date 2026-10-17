import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, Globe, Mail, MapPin, MessageCircle, Phone, Search, Tag } from "lucide-react";
import { getMember } from "@/lib/members/session";
import { getStaff } from "@/lib/admin/staff";
import { profileForMatching } from "@/lib/members/profile-for-matching";
import { businessKinds, matchScore, sectors, shortDate } from "@/lib/opportunities";
import { BusinessForm, BusinessOpportunityForm } from "@/components/member/opportunity-forms";
import { OpportunityTabs, PostControls, posterLine } from "@/components/opportunities/parts";
import { Empty, PageHeader, Panel, Pill } from "@/components/portal/page-parts";
import { Button } from "@/components/shadcn/button";
import { inputClass } from "@/components/ui";

export const metadata: Metadata = { title: "Business" };

type Biz = { id: string; name: string; description: string; sector: string; county: string; area: string; phone: string | null; whatsapp: boolean; email: string | null; website: string | null; member_offer: string; public_listing: boolean; owner_id: string; owner: string; owner_year: number | null; mine: boolean; reports: number | null };
type Opp = { id: string; kind: string; title: string; details: string; sector: string; location: string; contact: string; closes_on: string | null; created_at: string; poster: string; poster_year: number | null; mine: boolean; reports: number | null };
type Props = { searchParams: Promise<{ q?: string; sector?: string }> };

export default async function BusinessPage({ searchParams }: Props) {
  const member = await getMember();
  if (!member?.registered || member.membershipStatus === "terminated") redirect("/login?next=/app/opportunities/business");
  const q = await searchParams;
  const [{ data: bizData }, { data: oppData }, { data: counties }, profile, staff] = await Promise.all([
    member.supabase.rpc("business_directory"),
    member.supabase.rpc("open_business_opportunities"),
    member.supabase.from("counties").select("name").eq("active", true).order("sort_order"),
    profileForMatching(member.supabase, member.personId!),
    getStaff(),
  ]);
  const isAdmin = Boolean(staff?.isAdmin);
  const term = (q.q ?? "").trim().toLowerCase();
  const businesses = ((bizData ?? []) as Biz[]).filter((b) =>
    (!q.sector || b.sector === q.sector) && (!term || `${b.name} ${b.description} ${b.area} ${b.county} ${b.owner}`.toLowerCase().includes(term)));
  const opps = ((oppData ?? []) as Opp[])
    .map((o) => ({ o, score: matchScore(`${o.title} ${o.details} ${o.sector}`, o.location, profile) }))
    .sort((a, b) => b.score - a.score || b.o.created_at.localeCompare(a.o.created_at))
    .map((x) => x.o);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Opportunities"
        title="Business"
        description="Buy from, refer and partner with fellow alumni. List your business, and share tenders, partnerships and offers."
        actions={<Button asChild variant="outline"><Link href="/businesses">Public &ldquo;Buy from alumni&rdquo; page</Link></Button>}
      />
      <OpportunityTabs active="/app/opportunities/business" />

      <Panel title="Business opportunities" description="Tenders, partners and investors wanted, distributors, and offers. Those closest to your work come first." actions={<BusinessOpportunityForm />}>
        {opps.length === 0 ? <Empty>Nothing posted yet.</Empty> : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {opps.map((o) => (
              <li key={o.id} className="flex flex-col gap-2 rounded-lg bg-muted/40 p-4 ring-1 ring-border">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-bold">{o.title}</h3>
                  <Pill tone="info">{businessKinds[o.kind]}</Pill>
                </div>
                <p className="line-clamp-4 whitespace-pre-line text-sm">{o.details}</p>
                <p className="text-sm text-muted-foreground">
                  {[o.sector, o.location].filter(Boolean).join(" · ")}{o.closes_on && <> · <CalendarClock className="inline size-3.5" /> closes {shortDate.format(new Date(o.closes_on))}</>}
                </p>
                <p className="text-sm"><span className="font-semibold">Respond:</span> {o.contact}</p>
                <div className="mt-auto flex items-center justify-between gap-2 border-t pt-2">
                  <span className="text-xs text-muted-foreground">By {posterLine(o.poster, o.poster_year)}</span>
                  <PostControls type="business_opportunity" id={o.id} mine={o.mine} isAdmin={isAdmin} reports={o.reports} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Alumni business directory" description="Businesses run by members. Buy from and refer each other." actions={<BusinessForm counties={(counties ?? []).map((c) => c.name)} />}>
        <form method="get" className="mb-5 flex flex-wrap gap-2">
          <input name="q" defaultValue={q.q} placeholder="Search businesses" aria-label="Search businesses" className={`${inputClass} max-w-xs`} />
          <select name="sector" defaultValue={q.sector ?? ""} aria-label="Sector" className={`${inputClass} max-w-xs`}>
            <option value="">All sectors</option>{sectors.map((s) => <option key={s}>{s}</option>)}
          </select>
          <Button type="submit" variant="outline"><Search /> Find</Button>
        </form>
        {businesses.length === 0 ? <Empty>{term || q.sector ? "No businesses match." : "No businesses listed yet. Be the first!"}</Empty> : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {businesses.map((b) => (
              <li key={b.id} className="flex flex-col gap-2 rounded-lg bg-card p-4 ring-1 ring-border">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-bold">{b.name}</h3>
                  <Pill>{b.sector}</Pill>
                </div>
                <p className="line-clamp-3 text-sm">{b.description}</p>
                {(b.area || b.county) && <p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-4" /> {[b.area, b.county].filter(Boolean).join(", ")}</p>}
                {b.member_offer && <p className="flex items-center gap-1 text-sm font-semibold text-tea"><Tag className="size-4" /> {b.member_offer}</p>}
                <div className="flex flex-wrap gap-2">
                  {b.phone && <Button asChild size="sm" variant="outline"><a href={`tel:${b.phone}`}><Phone /> Call</a></Button>}
                  {b.phone && b.whatsapp && <Button asChild size="sm" variant="outline"><a href={`https://wa.me/${b.phone.replace(/\D/g, "").replace(/^0/, "254")}`} target="_blank" rel="noopener noreferrer"><MessageCircle /> WhatsApp</a></Button>}
                  {b.email && <Button asChild size="sm" variant="outline"><a href={`mailto:${b.email}`}><Mail /> Email</a></Button>}
                  {b.website && <Button asChild size="sm" variant="outline"><a href={b.website} target="_blank" rel="noopener noreferrer nofollow"><Globe /> Website</a></Button>}
                </div>
                <div className="mt-auto flex items-center justify-between gap-2 border-t pt-2">
                  <Link href={`/app/directory/${b.owner_id}`} className="text-xs text-muted-foreground hover:underline">{posterLine(b.owner, b.owner_year)}{b.public_listing ? " · also public" : ""}</Link>
                  <PostControls type="business" id={b.id} mine={b.mine} isAdmin={isAdmin} reports={b.reports} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
