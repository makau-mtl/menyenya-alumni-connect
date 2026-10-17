import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/shadcn/button";

export type ProfileProgressData = { pct: number; checks: { label: string; done: boolean; href: string }[]; selfLink: string };

function Ring({ pct }: { pct: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 80 80" className="size-24 shrink-0 -rotate-90" role="img" aria-label={`Profile ${pct}% complete`}>
      <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8" className="stroke-muted" />
      <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8" strokeLinecap="round" className="stroke-tea transition-all" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
      <text x="40" y="40" dy="0.35em" textAnchor="middle" className="rotate-90 fill-ink font-display text-[18px] font-bold" style={{ transformOrigin: "40px 40px" }}>{pct}%</text>
    </svg>
  );
}

/** "Complete your profile", next to the membership card. */
export function ProfileProgress({ p }: { p: ProfileProgressData }) {
  const done = p.pct >= 100;
  return (
    <section aria-label="Your profile" className={`flex h-full flex-col rounded-2xl p-5 ring-1 ${done ? "bg-secondary ring-tea/30" : "bg-card ring-gold/60"}`}>
      <div className="flex items-center gap-4">
        <Ring pct={p.pct} />
        <div>
          <p className="font-display text-xl font-bold leading-tight">{done ? "Your profile is complete" : "Complete your profile"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {done ? "Thank you. Classmates can find and recognise you." : "Classmates find and recognise you more easily with a full profile."}
          </p>
        </div>
      </div>
      {!done && (
        <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
          {p.checks.map((c) => (
            <li key={c.label}>
              {c.done ? (
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="flex size-5 items-center justify-center rounded-full bg-tea text-white"><Check className="size-3" /></span>
                  <span className="line-through decoration-muted-foreground/40">{c.label}</span>
                </span>
              ) : (
                <Link href={c.href} className="flex items-center gap-2 text-sm font-semibold hover:text-tea">
                  <span className="size-5 rounded-full border-2 border-gold" aria-hidden />
                  {c.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto pt-4">
        {done ? (
          <Button asChild variant="outline" size="sm"><Link href={p.selfLink}><Sparkles /> See how classmates see you</Link></Button>
        ) : (
          <Button asChild size="sm"><Link href="/app/profile">Continue building my profile <ArrowRight /></Link></Button>
        )}
      </div>
    </section>
  );
}
