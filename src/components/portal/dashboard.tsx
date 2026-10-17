import Link from "next/link";
import {
  ArrowRight, BadgeCheck, Building2, CalendarDays, CheckCircle2, CircleUserRound, Gift, GraduationCap, Handshake, HeartHandshake,
  Megaphone, Search, ShoppingBag, Trophy, UserPen, UserPlus, Users, Vote,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shadcn/card";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { Progress } from "@/components/shadcn/progress";
import { MembershipCard, type MembershipCardData } from "@/components/member/membership-card";
import { BarList } from "./bar-list";

const actionIcons = { profile: CircleUserRound, confirm: BadgeCheck, vote: Vote, renew: Gift, admin: Megaphone, school: GraduationCap, info: CheckCircle2 };
export type ActionItem = { label: string; detail?: string; href?: string; count?: number; icon: keyof typeof actionIcons; urgent?: boolean };

export type DashboardData = {
  firstName: string;
  greeting: string;
  card: MembershipCardData;
  actions: ActionItem[];
  myClass: { label: string; count: number; rank: number | null; of: number; directory: string; invite: string } | null;
  community: {
    total: number; alumni: number; friends: number; classes: number;
    topClasses: { label: string; value: number }[];
    regions: { label: string; value: number | null }[];
    myRegion: string | null;
    gender: { female: number | null; male: number | null; answered: number } | null;
  } | null;
  initiatives: { tuition: { pledged: number; target: number } | null; sponsors: number; partners: number; liveCauses: number };
  school: {
    asOf: string | null; students: number | null; needy: number | null; supported: number | null;
    results: { label: string; value: number; grade: string | null }[]; measure: string | null;
    priorities: { title: string; average: number | null; responses: number }[];
  } | null;
  news: { slug: string; title: string; date: string; kind: "news" | "event" }[];
};

const compact = new Intl.NumberFormat("en-KE", { notation: "compact", maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat("en-KE");
const day = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", timeZone: "Africa/Nairobi" });
function ordinal(n: number) {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const end = teen ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${end}`;
}

function SectionTitle({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-tea">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-bold sm:text-[1.75rem]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function Figure({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-border">
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold leading-none">{value}</p>
      {note && <p className="mt-1.5 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

const quickLinks = [
  { href: "/app/profile", label: "Update my details", icon: UserPen },
  { href: "/app/directory", label: "Find classmates", icon: Search },
  { href: "/pledge/tuition-block", label: "Make a pledge", icon: Gift },
  { href: "/track", label: "Track my pledge", icon: CalendarDays },
  { href: "/shop", label: "Order merchandise", icon: ShoppingBag },
  { href: "/app/school", label: "The school today", icon: GraduationCap },
];

export function Dashboard({ d }: { d: DashboardData }) {
  const tuitionPct = d.initiatives.tuition ? Math.min(100, Math.round((d.initiatives.tuition.pledged / d.initiatives.tuition.target) * 100)) : 0;
  const g = d.community?.gender;
  return (
    <div className="flex flex-col gap-12">
      {/* Greeting and membership card */}
      <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto]">
        <div className="order-2 lg:order-1">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-tea">{d.greeting}</p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Welcome back, {d.firstName}</h1>
          <p className="mt-2 max-w-xl text-ink-soft">Here is what&rsquo;s happening with you, your class and the school.</p>
        </div>
        <div className="order-1 lg:order-2 lg:w-[26rem]">
          <MembershipCard c={d.card} />
        </div>
      </div>

      {/* Action centre */}
      <section aria-labelledby="actions-title">
        <Card className="gap-4 border-gold/70 bg-gold-tint/50">
          <CardHeader>
            <CardTitle id="actions-title" className="flex items-center gap-2 text-xl">
              Waiting for you {d.actions.length > 0 && <Badge className="bg-gold text-ink">{d.actions.length}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {d.actions.length === 0 ? (
              <p className="flex items-center gap-2 font-semibold text-tea"><CheckCircle2 className="size-5" /> You&rsquo;re all caught up.</p>
            ) : (
              <ul className="grid gap-2 md:grid-cols-2">
                {d.actions.map((a) => {
                  const Icon = actionIcons[a.icon];
                  const inner = (
                    <>
                      <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${a.urgent ? "bg-gold text-ink" : "bg-secondary text-tea"}`}>
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold leading-snug">{a.label}</span>
                        {a.detail && <span className="block text-sm text-muted-foreground">{a.detail}</span>}
                      </span>
                      {a.count ? <Badge className="bg-gold text-ink">{a.count}</Badge> : a.href ? <ArrowRight className="size-4 text-muted-foreground" /> : null}
                    </>
                  );
                  return (
                    <li key={a.label}>
                      {a.href ? (
                        <Link href={a.href} className="flex items-center gap-3 rounded-lg bg-card p-3 ring-1 ring-border transition hover:ring-tea">{inner}</Link>
                      ) : (
                        <div className="flex items-center gap-3 rounded-lg bg-card p-3 ring-1 ring-border">{inner}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Your class */}
      {d.myClass && (
        <section className="grid items-center gap-6 rounded-2xl bg-tea p-6 text-white sm:p-8 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">{d.myClass.label}</p>
            <p className="mt-2 font-display text-3xl font-bold sm:text-4xl">
              {d.myClass.count} {d.myClass.count === 1 ? "classmate is" : "classmates are"} here
            </p>
            {d.myClass.rank && (
              <p className="mt-2 flex items-center gap-2 text-white/85">
                <Trophy className="size-4 text-gold" /> {d.myClass.label} is {ordinal(d.myClass.rank)} of {d.myClass.of} classes on mhs.alumni
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="bg-gold text-ink hover:bg-gold/90" size="lg">
              <a href={d.myClass.invite} target="_blank" rel="noopener noreferrer"><UserPlus /> Invite classmates</a>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white">
              <Link href={d.myClass.directory}><Users /> See who&rsquo;s here</Link>
            </Button>
          </div>
        </section>
      )}

      {/* Community in numbers */}
      {d.community && (
        <section className="flex flex-col gap-5">
          <SectionTitle eyebrow="Our community" title="Members in numbers" action={<Link href="/app/directory" className="text-sm font-semibold text-tea hover:underline">Member directory</Link>} />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Figure label="Members" value={whole.format(d.community.total)} />
            <Figure label="Alumni" value={whole.format(d.community.alumni)} />
            <Figure label="Friends of the alumni" value={whole.format(d.community.friends)} />
            <Figure label="Classes represented" value={whole.format(d.community.classes)} />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="gap-4">
              <CardHeader><CardTitle className="text-lg">Most registered classes</CardTitle></CardHeader>
              <CardContent>{d.community.topClasses.length ? <BarList rows={d.community.topClasses} highlight={d.myClass?.label} /> : <p className="text-muted-foreground">Not enough members yet.</p>}</CardContent>
            </Card>
            <Card className="gap-4">
              <CardHeader><CardTitle className="text-lg">By region</CardTitle></CardHeader>
              <CardContent>{d.community.regions.length ? <BarList rows={d.community.regions} highlight={d.community.myRegion ?? undefined} /> : <p className="text-muted-foreground">Not enough members yet.</p>}</CardContent>
            </Card>
            <Card className="gap-4">
              <CardHeader>
                <CardTitle className="text-lg">Women and men</CardTitle>
                <CardDescription>From members who chose to say</CardDescription>
              </CardHeader>
              <CardContent>
                {g && g.answered >= 5 ? (
                  <BarList rows={[{ label: "Women", value: g.female }, { label: "Men", value: g.male }]} />
                ) : (
                  <p className="text-muted-foreground">Shown once enough members have answered. <Link href="/app/profile" className="font-semibold text-tea underline">Add yours</Link></p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* The school today */}
      {d.school && (
        <section className="flex flex-col gap-5">
          <SectionTitle eyebrow="Menyenya SDA High School" title="The school today" action={<Link href="/app/school" className="text-sm font-semibold text-tea hover:underline">More about the school</Link>} />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Figure label="Students" value={d.school.students !== null ? whole.format(d.school.students) : "—"} note={d.school.asOf ? `As of ${d.school.asOf}` : undefined} />
            <Figure label="Students in need" value={d.school.needy !== null ? whole.format(d.school.needy) : "—"} />
            <Figure label="Supported by alumni" value={d.school.supported !== null ? whole.format(d.school.supported) : "—"} />
            <Figure label={d.school.measure ?? "Latest results"} value={d.school.results.at(-1) ? `${d.school.results.at(-1)!.value}${d.school.results.at(-1)!.grade ? ` (${d.school.results.at(-1)!.grade})` : ""}` : "—"} note={d.school.results.at(-1)?.label} />
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <Card className="gap-4">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">The school&rsquo;s priorities</CardTitle>
                  <CardDescription>In order, as set with the school</CardDescription>
                </div>
                <Button asChild size="sm"><Link href="/app/school#priorities"><Vote /> Give your view</Link></Button>
              </CardHeader>
              <CardContent>
                {d.school.priorities.length ? (
                  <ol className="flex flex-col divide-y">
                    {d.school.priorities.map((p, i) => (
                      <li key={p.title} className="flex items-center gap-3 py-2.5">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink font-display text-sm font-bold text-white">{i + 1}</span>
                        <span className="flex-1 font-semibold">{p.title}</span>
                        <span className="text-right text-xs text-muted-foreground">
                          {p.responses ? <>Importance <strong className="text-ink">{p.average}</strong>/5<br />{p.responses} {p.responses === 1 ? "view" : "views"}</> : "No views yet"}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-muted-foreground">The priorities will be published here.</p>
                )}
              </CardContent>
            </Card>
            <Card className="gap-4">
              <CardHeader><CardTitle className="text-lg">{d.school.measure ?? "Results"} by year</CardTitle></CardHeader>
              <CardContent>{d.school.results.length ? <BarList rows={d.school.results.map((r) => ({ label: r.label, value: r.value }))} /> : <p className="text-muted-foreground">Results will be added here.</p>}</CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Initiatives */}
      <section className="flex flex-col gap-5">
        <SectionTitle eyebrow="What we're doing together" title="Our initiatives" />
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          {d.initiatives.tuition && (
            <Card className="overflow-hidden bg-ink text-white">
              <CardHeader>
                <CardDescription className="font-semibold uppercase tracking-[0.14em] text-gold">Our flagship project</CardDescription>
                <CardTitle className="text-2xl text-white">The tuition block</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-display text-4xl font-bold">KES {compact.format(d.initiatives.tuition.pledged)}</p>
                <p className="text-sm text-white/70">pledged of KES {compact.format(d.initiatives.tuition.target)} ({tuitionPct}%)</p>
                <Progress value={tuitionPct} className="mt-4 h-3 bg-white/15 [&>[data-slot=progress-indicator]]:bg-gold" aria-label="Tuition block pledged" />
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button asChild className="bg-gold text-ink hover:bg-gold/90"><Link href="/pledge/tuition-block"><Gift /> Pledge</Link></Button>
                  <Button asChild variant="ghost" className="text-white hover:bg-white/10 hover:text-white"><Link href="/causes/tuition-block">See the project</Link></Button>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="grid grid-cols-2 gap-3 self-start">
            <Link href="/support/corporate-sponsorships" className="rounded-xl bg-card p-4 ring-1 ring-border hover:ring-tea">
              <Building2 className="size-5 text-tea" />
              <p className="mt-2 font-display text-3xl font-bold">{d.initiatives.sponsors}</p>
              <p className="text-sm text-muted-foreground">Corporate sponsors</p>
            </Link>
            <Link href="/support/strategic-partnerships" className="rounded-xl bg-card p-4 ring-1 ring-border hover:ring-tea">
              <Handshake className="size-5 text-tea" />
              <p className="mt-2 font-display text-3xl font-bold">{d.initiatives.partners}</p>
              <p className="text-sm text-muted-foreground">Strategic partners</p>
            </Link>
            <Link href="/causes" className="rounded-xl bg-card p-4 ring-1 ring-border hover:ring-tea">
              <HeartHandshake className="size-5 text-tea" />
              <p className="mt-2 font-display text-3xl font-bold">{d.initiatives.liveCauses}</p>
              <p className="text-sm text-muted-foreground">Active causes</p>
            </Link>
            <Link href="/shop" className="rounded-xl bg-card p-4 ring-1 ring-border hover:ring-tea">
              <ShoppingBag className="size-5 text-tea" />
              <p className="mt-2 font-semibold leading-snug">Alumni merchandise</p>
              <p className="text-sm text-muted-foreground">Wear Menyenya with pride</p>
            </Link>
          </div>
        </div>
      </section>

      {/* News and shortcuts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl">News and events</CardTitle>
            <Link href="/news" className="text-sm font-semibold text-tea hover:underline">All</Link>
          </CardHeader>
          <CardContent>
            {d.news.length === 0 ? (
              <p className="text-muted-foreground">Nothing new yet.</p>
            ) : (
              <ul className="flex flex-col divide-y">
                {d.news.map((n) => (
                  <li key={n.slug}>
                    <Link href={`/news/${n.slug}`} className="flex gap-3 py-3 hover:text-tea">
                      <span className="flex w-12 shrink-0 flex-col items-center rounded-md bg-secondary py-1 text-center text-xs font-semibold uppercase leading-tight text-tea">
                        {day.format(new Date(n.date)).split(" ").reverse().join(" ")}
                      </span>
                      <span>
                        <span className="block font-semibold leading-snug">{n.title}</span>
                        <span className="text-sm text-muted-foreground">{n.kind === "event" ? "Event" : "News"}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-xl">How do I…?</CardTitle></CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {quickLinks.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="group flex items-center gap-3 rounded-lg border bg-background p-2.5 font-semibold transition-colors hover:border-tea hover:bg-secondary">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-tea group-hover:bg-tea group-hover:text-white">
                  <Icon className="size-4" />
                </span>
                {label}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
