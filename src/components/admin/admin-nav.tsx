"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNav({ tabs, label = "Admin", root = "/admin" }: { tabs: { href: string; label: string }[]; label?: string; root?: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="-mx-4 mt-6 overflow-x-auto px-4">
      <ul className="flex min-w-max gap-1 border-b border-line">
        {tabs.map((t) => {
          const active = t.href === root ? pathname === root : pathname.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`-mb-px block border-b-[3px] px-4 py-2.5 font-semibold ${
                  active ? "border-tea text-ink" : "border-transparent text-ink-soft hover:text-ink"
                }`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
