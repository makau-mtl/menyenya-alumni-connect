import Link from "next/link";
import {
  ArrowRight, BadgeCheck, Building2, CalendarDays, Check, CircleUserRound, Gift, Handshake, MapPin, Search, ShoppingBag,
  Sparkles, UserPen, Users, Vote,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shadcn/card";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { Progress } from "@/components/shadcn/progress";

export type DashboardData = {
  firstName: string;
  greeting: string;
  chips: { icon: "class" | "region" | "level"; label: string }[];
  standing: { active: boolean; title: string; detail: string } | null;
  profile: { pct: number; checks: { label: string; done: boolean }[] };
  classmates: { label: string; count: number; href: string } | null;
  tuition: { pledged: number; received: number; target: number } | null;
  news: { slug: string; title: string; date: string; kind: "news" | "event" }[];
  tasks: { label: string; count: number; href: string }[];
};

const kes = new Intl.NumberFormat("en-KE", { notation: "compact", maximumFractionDigits: 1 });
const day = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", timeZone: "Africa/Nairobi" });
const chipIcons = { class: Users, region: MapPin, level: Sparkles };

const quickLinks = [
  { href: "/app/profile", label: "Update my details", icon: UserPen },
  { href: "/app/directory", label: "Find my classmates", icon: Search },
  { href: "/pledge/tuition-block", label: "Make a pledge", icon: Gift },
  { href: "/track", label: "Track my pledge", icon: CalendarDays },
  { href: "/shop", label: "Order merchandise", icon: ShoppingBag },
  { href: "/our-people", label: "Our people", icon: Handshake },
];

function Stat({ icon: Icon, label, value, note, tone = "default", href }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string; note: string; tone?: "default" | "good" | "warn"; href?: string;
}) {
  const body = (
    <Card className="h-full gap-2 py-4 transition-shadow hover:shadow-md sm:gap-3 sm:py-5">
      <CardHeader className="flex flex-row items-center justify-between gap-2 px-4 sm:px-5">
        <CardDescription className="font-semibold text-muted-foreground">{label}</CardDescription>
        <span className={`hidden size-9 items-center sm:flex justify-center rounded-full ${tone === "good" ? "bg-tea text-white" : tone === "warn" ? "bg-gold text-ink" : "bg-secondary text-tea"}`}>
          <Icon className="size-4" />
        </span>
      </CardHeader>
      <CardContent className="px-4 sm:px-5">
        <p className="font-display text-2xl font-bold leading-none sm:text-3xl">{value}</p>
        <p className="mt-2 text-sm text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href} className="block rounded-xl focus-visible:outline-2">{body}</Link> : body;
}

export function Dashboard({ d }: { d: DashboardData }) {
  const tuitionPct = d.tuition ? Math.min(100, Math.round((d.tuition.pledged / d.tuition.target) * 100)) : 0;
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-tea">{d.greeting}</p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Welcome back, {d.firstName}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            {d.chips.map((c) => {
              const Icon = chipIcons[c.icon];
              return (
                <Badge key={c.label} variant="outline" className="gap-1.5 rounded-full bg-card px-3 py-1 text-sm font-semibold">
                  <Icon className="size-3.5 text-tea" /> {c.label}
                </Badge>
              );
            })}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/app/directory"><Users /> Directory</Link></Button>
          <Button asChild><Link href="/pledge/tuition-block"><Gift /> Make a pledge</Link></Button>
        </div>
      </div>

      {/* Key figures */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {d.standing && (
          <Stat icon={Vote} label="Membership" value={d.standing.active ? "Active" : "Inactive"} note={d.standing.active ? "Eligible to vote" : d.standing.title} tone={d.standing.active ? "good" : "warn"} />
        )}
        <Stat icon={CircleUserRound} label="Your profile" value={`${d.profile.pct}%`} note={d.profile.pct < 100 ? "Add the missing details" : "Complete. Thank you!"} tone={d.profile.pct < 100 ? "warn" : "good"} href="/app/profile" />
        {d.classmates && <Stat icon={Users} label={d.classmates.label} value={String(d.classmates.count)} note="registered on the platform" href={d.classmates.href} />}
        {d.tuition && <Stat icon={Building2} label="Tuition block" value={`${tuitionPct}%`} note={`KES ${kes.format(d.tuition.pledged)} pledged of ${kes.format(d.tuition.target)}`} href="/causes/tuition-block" />}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          {/* Membership */}
          {d.standing && (!d.standing.active || d.standing.title.startsWith("Active until")) && (
            <Card className={d.standing.active ? "border-l-8 border-l-tea" : "border-l-8 border-l-gold"}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <BadgeCheck className="size-5 text-tea" /> {d.standing.title}
                </CardTitle>
                <CardDescription className="text-base">{d.standing.detail}</CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* Profile */}
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <CardTitle className="text-xl">Your profile</CardTitle>
                <span className="font-semibold text-tea">{d.profile.pct}% complete</span>
              </div>
              <Progress value={d.profile.pct} className="mt-2 h-2.5" aria-label="Profile completeness" />
            </CardHeader>
            <CardContent>
              <ul className="grid gap-3 sm:grid-cols-2">
                {d.profile.checks.map((c) => (
                  <li key={c.label} className="flex items-center gap-3">
                    <span aria-hidden className={`flex size-6 shrink-0 items-center justify-center rounded-full ${c.done ? "bg-tea text-white" : "border-2 border-input"}`}>
                      {c.done && <Check className="size-3.5" />}
                    </span>
                    <span className={c.done ? "" : "text-muted-foreground"}>
                      {c.label}
                      <span className="sr-only">{c.done ? " (done)" : " (to do)"}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-6">
                <Link href="/app/profile">{d.profile.pct < 100 ? "Continue building my profile" : "Edit my profile"} <ArrowRight /></Link>
              </Button>
            </CardContent>
          </Card>

          {/* Quick links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">How do I…?</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {quickLinks.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className="group flex items-center gap-3 rounded-lg border bg-background p-3 font-semibold transition-colors hover:border-tea hover:bg-secondary">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-tea group-hover:bg-tea group-hover:text-white">
                    <Icon className="size-4" />
                  </span>
                  {label}
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          {d.tasks.length > 0 && (
            <Card className="border-gold bg-gold-tint/60">
              <CardHeader>
                <CardTitle className="text-xl">Waiting for you</CardTitle>
                <CardDescription>Things to act on in the admin area</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {d.tasks.map((t) => (
                  <Link key={t.href} href={t.href} className="flex items-center justify-between rounded-md bg-card px-3 py-2.5 font-semibold hover:bg-secondary">
                    {t.label}
                    <Badge className="bg-gold text-ink">{t.count}</Badge>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {d.tuition && (
            <Card className="overflow-hidden bg-ink text-white">
              <CardHeader>
                <CardDescription className="font-semibold uppercase tracking-[0.14em] text-gold">Our project</CardDescription>
                <CardTitle className="text-2xl text-white">The tuition block</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-display text-4xl font-bold">KES {kes.format(d.tuition.pledged)}</p>
                <p className="text-sm text-white/70">pledged of KES {kes.format(d.tuition.target)}</p>
                <Progress value={tuitionPct} className="mt-4 h-3 bg-white/15 [&>[data-slot=progress-indicator]]:bg-gold" aria-label="Tuition block pledged" />
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button asChild className="bg-gold text-ink hover:bg-gold/90"><Link href="/pledge/tuition-block">Pledge</Link></Button>
                  <Button asChild variant="ghost" className="text-white hover:bg-white/10 hover:text-white"><Link href="/causes/tuition-block">See the project</Link></Button>
                </div>
              </CardContent>
            </Card>
          )}

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
        </div>
      </div>
    </div>
  );
}
