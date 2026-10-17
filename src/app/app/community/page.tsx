import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getMember } from "@/lib/members/session";
import { BarList } from "@/components/portal/bar-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shadcn/card";

export const metadata: Metadata = { title: "Members in numbers" };

type Breakdown = {
  total: number; alumni: number; friends: number; female: number | null; male: number | null; gender_answered: number;
  classes: { year: number; count: number }[]; regions: { name: string; count: number }[];
  decades: { decade: number; count: number }[]; joined_by_month: { month: string; count: number }[];
};

const whole = new Intl.NumberFormat("en-KE");
const monthName = new Intl.DateTimeFormat("en-KE", { month: "short", year: "numeric" });

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="group rounded-xl bg-card p-4 ring-1 ring-border transition hover:ring-tea">
      <p className="flex items-center justify-between text-sm font-semibold text-muted-foreground">{label} <ArrowRight className="size-4 opacity-0 transition group-hover:opacity-100" /></p>
      <p className="mt-1 font-display text-3xl font-bold leading-none">{whole.format(value)}</p>
    </Link>
  );
}

export default async function CommunityPage() {
  const member = await getMember();
  if (!member?.registered) redirect("/login?next=/app/community");
  const [{ data }, { data: mine }] = await Promise.all([
    member.supabase.rpc("community_breakdown"),
    member.supabase.from("member_profiles").select("year_left, clusters(name)").eq("person_id", member.personId!).single(),
  ]);
  const b = data as Breakdown | null;
  if (!b) redirect("/app");
  const myClass = mine?.year_left ? `Class of ${mine.year_left}` : undefined;
  const myRegion = (mine?.clusters as unknown as { name: string } | null)?.name;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/app" className="text-sm font-semibold text-tea hover:underline">← Dashboard</Link>
        <p className="mt-3 text-sm font-semibold uppercase tracking-[0.16em] text-tea">Our community</p>
        <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Members in numbers</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">Tap any class, region or figure to see who&rsquo;s there in the member directory.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Members" value={b.total} href="/app/directory" />
        <Stat label="Alumni" value={b.alumni} href="/app/directory?category=alumnus" />
        <Stat label="Friends of the alumni" value={b.friends} href="/app/directory?category=friend" />
        <Stat label="Classes represented" value={b.classes.length} href="#classes" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card id="classes" className="scroll-mt-28 gap-4 lg:row-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Every class</CardTitle>
            <CardDescription>Newest first. Can your class top the list?</CardDescription>
          </CardHeader>
          <CardContent>
            {b.classes.length ? (
              <BarList rows={b.classes.map((c) => ({ label: `Class of ${c.year}`, value: c.count, href: `/app/directory?year=${c.year}` }))} highlight={myClass} />
            ) : <p className="text-muted-foreground">No classes yet.</p>}
          </CardContent>
        </Card>
        <Card className="gap-4">
          <CardHeader><CardTitle className="text-lg">By region</CardTitle></CardHeader>
          <CardContent>
            <BarList rows={b.regions.map((r) => ({ label: r.name, value: r.count, href: `/app/directory?region=${encodeURIComponent(r.name)}` }))} highlight={myRegion} />
          </CardContent>
        </Card>
        <Card className="gap-4">
          <CardHeader><CardTitle className="text-lg">By decade at Menyenya</CardTitle><CardDescription>When alumni left the school</CardDescription></CardHeader>
          <CardContent>
            <BarList rows={b.decades.map((d) => ({ label: `${d.decade}s`, value: d.count }))} />
          </CardContent>
        </Card>
        <Card className="gap-4">
          <CardHeader><CardTitle className="text-lg">Women and men</CardTitle><CardDescription>From the {whole.format(b.gender_answered)} members who chose to say</CardDescription></CardHeader>
          <CardContent>
            {b.gender_answered >= 5 ? (
              <BarList rows={[{ label: "Women", value: b.female }, { label: "Men", value: b.male }]} />
            ) : (
              <p className="text-muted-foreground">Shown once enough members have answered. <Link href="/app/profile#work" className="font-semibold text-tea underline">Add yours</Link></p>
            )}
          </CardContent>
        </Card>
        <Card className="gap-4">
          <CardHeader><CardTitle className="text-lg">New members by month</CardTitle><CardDescription>The last 12 months</CardDescription></CardHeader>
          <CardContent>
            <BarList rows={b.joined_by_month.map((m) => ({ label: monthName.format(new Date(`${m.month}-01T12:00:00`)), value: m.count }))} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
