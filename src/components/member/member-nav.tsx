"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BadgeCheck, Images, LayoutDashboard, MapPin, Settings2, UserRound, Users } from "lucide-react";

const icons = { dashboard: LayoutDashboard, profile: UserRound, directory: Users, confirm: BadgeCheck, admin: Settings2, meetups: MapPin, memories: Images };
/** `phone: false` keeps a tab off the phone bar (it is reached another way there, e.g. the action centre). */
export type MemberTab = { href: string; label: string; short: string; icon: keyof typeof icons; badge?: number; phone?: boolean };

/**
 * The member area's navigation. Laptops: a row of tabs under the website header.
 * Phones: an app-style bar fixed to the bottom of the screen, within reach of the thumb.
 */
export function MemberNav({ tabs }: { tabs: MemberTab[] }) {
  const path = usePathname();
  const active = (href: string) => (href === "/app" ? path === "/app" : path === href || path.startsWith(`${href}/`));
  return (
    <>
      <nav aria-label="My account" className="hidden border-b border-line bg-surface md:block">
        <ul className="section flex gap-1 py-2">
          {tabs.map((t) => {
            const Icon = icons[t.icon];
            const on = active(t.href);
            return (
              <li key={t.href} className={t.icon === "admin" ? "ml-auto" : ""}>
                <Link
                  href={t.href}
                  aria-current={on ? "page" : undefined}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-[0.95rem] font-semibold transition-colors ${
                    on ? "bg-ink text-white" : t.icon === "admin" ? "border border-line text-ink hover:border-ink" : "text-ink-soft hover:bg-paper hover:text-ink"
                  }`}
                >
                  <Icon className="size-4" />
                  {t.label}
                  {t.badge ? <span className="rounded-full bg-gold px-1.5 text-xs font-bold text-ink">{t.badge}</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <nav
        aria-label="My account"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(23,40,59,0.25)] md:hidden"
      >
        <ul className="mx-auto flex max-w-md items-stretch justify-around px-1">
          {tabs.filter((t) => t.phone !== false).map((t) => {
            const Icon = icons[t.icon];
            const on = active(t.href);
            return (
              <li key={t.href} className="flex-1">
                <Link
                  href={t.href}
                  aria-current={on ? "page" : undefined}
                  className="flex flex-col items-center gap-1 px-1 pb-2 pt-2.5 text-[0.7rem] font-semibold"
                >
                  <span
                    className={`relative flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
                      on ? "bg-gold text-ink" : "text-white/75"
                    }`}
                  >
                    <Icon className="size-5" />
                    {t.badge ? (
                      <span className="absolute -right-0.5 -top-1 min-w-4 rounded-full bg-gold px-1 text-[0.65rem] font-bold leading-4 text-ink ring-2 ring-ink">
                        {t.badge}
                      </span>
                    ) : null}
                  </span>
                  <span className={on ? "text-white" : "text-white/70"}>{t.short}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
