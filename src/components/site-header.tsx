import Link from "next/link";
import { buttonClass } from "./ui";

const nav = [
  { href: "/causes", label: "Causes" },
  { href: "/join", label: "Join" },
  { href: "/track", label: "Track my pledge" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex items-center justify-between gap-4 sm:mr-auto">
          <Link href="/" className="leading-tight">
            <span className="block font-display text-xl font-bold text-ink">Menyenya Alumni</span>
            <span className="hidden text-sm text-ink-soft sm:block">Menyenya SDA High School Alumni Association</span>
          </Link>
          <Link href="/give/tuition-block" className={`${buttonClass("primary", "sm")} sm:hidden`}>
            Give
          </Link>
        </div>
        <nav aria-label="Main" className="flex gap-5 text-[0.95rem]">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="text-ink underline-offset-4 hover:text-tea hover:underline">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden sm:block">
          <Link href="/give/tuition-block" className={buttonClass("primary", "sm")}>
            Give
          </Link>
        </div>
      </div>
    </header>
  );
}
