"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BadgeCheck, LayoutDashboard, Settings2, UserRound, Users } from "lucide-react";

const icons = { dashboard: LayoutDashboard, profile: UserRound, directory: Users, confirm: BadgeCheck, admin: Settings2 };
export type MemberTab = { href: string; label: string; icon: keyof typeof icons; badge?: number };

/** The member area's tabs, under the website header. Scrolls sideways on phones. */
export function MemberNav({ tabs }: { tabs: MemberTab[] }) {
  const path = usePathname();
  const active = (href: string) => (href === "/app" ? path === "/app" : path === href || path.startsWith(`${href}/`));
  return (
    <nav aria-label="My account" className="border-b border-line bg-surface">
      <ul className="section flex gap-1 overflow-x-auto py-2">
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
  );
}
