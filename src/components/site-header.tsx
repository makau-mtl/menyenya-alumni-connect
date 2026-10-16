import Link from "next/link";
import { AccountLinks } from "./account-links";
import { MenuCloser } from "./menu-closer";

type NavItem = { label: string; href: string; children?: { label: string; href: string; text?: string }[] };

export const mainNav: NavItem[] = [
  {
    label: "Who we are",
    href: "/who-we-are",
    children: [
      { label: "About us", href: "/who-we-are", text: "Our mission, vision and story" },
      { label: "Leadership and secretariat", href: "/who-we-are/team", text: "The people who serve the association" },
      { label: "Careers", href: "/careers", text: "Internships and roles with the association" },
    ],
  },
  { label: "Our work", href: "/causes" },
  {
    label: "Ways to give",
    href: "/ways-to-give",
    children: [
      { label: "Personal ways to give", href: "/ways-to-give", text: "Give once, pledge, or give in kind" },
      { label: "The tuition block", href: "/causes/tuition-block", text: "Our KES 100M project" },
      { label: "Organisations and partners", href: "/ways-to-give#organisations", text: "Sponsorships and partnerships" },
    ],
  },
  { label: "News and events", href: "/news" },
];

/** The association's logo: "mhs.alumni" (chosen 16 Oct 2026). Files for print and social media: public/brand. */
export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex flex-col leading-none">
      <span
        className={`whitespace-nowrap text-[1.7rem] tracking-[-0.03em] sm:text-[1.95rem] ${light ? "text-white" : "text-ink"}`}
      >
        <span className="font-black">mhs</span>
        <span aria-hidden className="font-black text-gold">.</span>
        <span className="font-normal">alumni</span>
      </span>
      <span className={`mt-1 hidden whitespace-nowrap text-xs sm:block ${light ? "text-white/70" : "text-ink-soft"}`}>
        Menyenya SDA High School
      </span>
    </span>
  );
}

function Chevron() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="size-4" fill="currentColor">
      <path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header id="site-header" className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 lg:gap-6 lg:px-6">
        <Link href="/" aria-label="mhs.alumni, Menyenya SDA High School Alumni Association: home" className="mr-auto lg:mr-4">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden flex-1 lg:block">
          <ul className="flex items-center gap-1">
            {mainNav.map((item) => (
              <li key={item.label} className="group relative">
                <Link
                  href={item.href}
                  className="flex items-center gap-1 rounded-md px-3 py-2 font-semibold text-ink hover:bg-paper"
                >
                  {item.label}
                  {item.children && <Chevron />}
                </Link>
                {item.children && (
                  <div className="nav-dropdown invisible absolute left-0 top-full z-50 w-80 pt-2 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                    <ul className="rounded-xl border border-line bg-surface p-2 shadow-[0_12px_32px_rgba(23,40,59,0.14)]">
                      {item.children.map((c) => (
                        <li key={c.href}>
                          <Link href={c.href} className="block rounded-lg px-4 py-3 hover:bg-paper">
                            <span className="block font-semibold text-ink">{c.label}</span>
                            {c.text && <span className="block text-sm text-ink-soft">{c.text}</span>}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <AccountLinks variant="desktop" />
          <Link href="/donate" className="rounded-md bg-gold px-5 py-2 font-bold text-ink hover:bg-[#f0b95f]">
            Donate
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <Link href="/donate" className="rounded-md bg-gold px-3 py-2 font-bold text-ink">
            Donate
          </Link>
          <details className="group/menu">
            <summary className="flex cursor-pointer list-none items-center rounded-md border-2 border-ink px-2.5 py-[0.4rem] font-semibold [&::-webkit-details-marker]:hidden">
              <span className="group-open/menu:hidden">Menu</span>
              <span className="hidden group-open/menu:inline">Close</span>
            </summary>
            <div className="absolute inset-x-0 top-full max-h-[calc(100dvh-4.5rem)] overflow-y-auto border-b border-line bg-surface px-4 pb-6 shadow-lg">
              <ul className="divide-y divide-line">
                {mainNav.map((item) => (
                  <li key={item.label} className="py-3">
                    <Link href={item.href} className="block py-1 text-lg font-semibold">
                      {item.label}
                    </Link>
                    {item.children && (
                      <ul className="mt-1 flex flex-col gap-1 pl-3">
                        {item.children
                          .filter((c) => c.href !== item.href)
                          .map((c) => (
                            <li key={c.href}>
                              <Link href={c.href} className="block py-1 text-ink-soft">
                                {c.label}
                              </Link>
                            </li>
                          ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
              <AccountLinks variant="mobile" />
            </div>
          </details>
        </div>
      </div>
      <MenuCloser />
    </header>
  );
}
