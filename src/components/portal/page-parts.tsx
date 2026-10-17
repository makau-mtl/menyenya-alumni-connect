import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared building blocks so every member and admin screen looks the same.

/** The top of a screen: optional small label, the title, a line of explanation, and buttons on the right. */
export function PageHeader({ eyebrow, title, description, actions, back }: {
  eyebrow?: string; title: string; description?: React.ReactNode; actions?: React.ReactNode; back?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col gap-1">
      {back && <Link href={back.href} className="mb-2 text-sm font-semibold text-tea hover:underline">← {back.label}</Link>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          {eyebrow && <p className="text-sm font-semibold uppercase tracking-[0.16em] text-tea">{eyebrow}</p>}
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{title}</h1>
          {description && <div className="mt-2 text-ink-soft">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/** A white card with a heading, optional explanation and buttons. */
export function Panel({ id, title, description, actions, children, className, tone = "default" }: {
  id?: string; title?: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; children?: React.ReactNode;
  className?: string; tone?: "default" | "attention" | "quiet";
}) {
  const tones = { default: "bg-card ring-border", attention: "bg-gold-tint/50 ring-gold/70", quiet: "bg-muted/50 ring-border" };
  return (
    <section id={id} className={cn("scroll-mt-24 rounded-xl p-5 shadow-sm ring-1 sm:p-6", tones[tone], className)}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-xl font-bold">{title}</h2>}
            {description && <div className="mt-1 text-sm text-muted-foreground">{description}</div>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/** A row of key figures. Figures with a link open the details. */
export function StatTiles({ items, className }: { items: { label: string; value: string; note?: string; href?: string }[]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>
      {items.map((s) => {
        const body = (
          <>
            <dt className="flex items-center justify-between gap-2 text-sm font-semibold text-muted-foreground">
              {s.label} {s.href && <ArrowRight className="size-4 opacity-0 transition group-hover:opacity-100" />}
            </dt>
            <dd className="mt-1 font-display text-2xl font-bold sm:text-3xl">{s.value}</dd>
            {s.note && <dd className="mt-1 text-xs text-muted-foreground">{s.note}</dd>}
          </>
        );
        return s.href ? (
          <Link key={s.label} href={s.href} className="group rounded-xl bg-card p-4 shadow-sm ring-1 ring-border transition hover:ring-tea">{body}</Link>
        ) : (
          <div key={s.label} className="rounded-xl bg-card p-4 shadow-sm ring-1 ring-border">{body}</div>
        );
      })}
    </dl>
  );
}

/** What to show when a list is empty. */
export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border-2 border-dashed border-border p-6 text-center text-muted-foreground">{children}</p>;
}

/** A small coloured label, e.g. a status. */
export function Pill({ tone = "muted", children }: { tone?: "good" | "warn" | "muted" | "bad" | "info"; children: React.ReactNode }) {
  const tones = {
    good: "bg-secondary text-tea-dark",
    warn: "bg-gold-tint text-ink",
    muted: "bg-muted text-muted-foreground",
    bad: "bg-alert/10 text-alert",
    info: "bg-ink text-white",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", tones[tone])}>{children}</span>;
}
