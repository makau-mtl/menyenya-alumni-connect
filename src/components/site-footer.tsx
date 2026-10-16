import Link from "next/link";
import { org } from "@/content/site";
import { Logo } from "./site-header";

const columns = [
  {
    title: "Who we are",
    links: [
      { label: "About us", href: "/who-we-are" },
      { label: "Leadership and secretariat", href: "/who-we-are/team" },
      { label: "Careers", href: "/careers" },
      { label: "News and events", href: "/news" },
    ],
  },
  {
    title: "Ways to give",
    links: [
      { label: "Donate", href: "/donate" },
      { label: "Personal ways to give", href: "/ways-to-give" },
      { label: "The tuition block", href: "/causes/tuition-block" },
      { label: "Organisations and partners", href: "/ways-to-give#organisations" },
    ],
  },
  {
    title: "Members",
    links: [
      { label: "Join the association", href: "/join" },
      { label: "Log in", href: "/login" },
      { label: "Track my pledge", href: "/track" },
      { label: "Contact us", href: "/contact" },
      { label: "Privacy policy", href: "/privacy" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-ink text-[#c9d3dd]">
      <div className="mx-auto max-w-7xl px-4 pt-14 lg:px-6">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_2fr]">
          <div className="max-w-md">
            <Logo light />
            <p className="mt-6 font-display text-xl text-white">Stay in touch with Menyenya</p>
            <p className="mt-2 text-[0.95rem]">News from the school, alumni events and project updates, about once a month.</p>
            <form className="mt-4 flex flex-col gap-2 sm:flex-row" action="/join">
              <label htmlFor="footer-email" className="sr-only">
                Email address
              </label>
              <input
                id="footer-email"
                name="email"
                type="email"
                placeholder="Your email address"
                className="min-w-0 flex-1 rounded-md border border-white/25 bg-white/10 px-3 py-2.5 text-white placeholder:text-white/50"
              />
              <button type="submit" className="rounded-md bg-gold px-5 py-2.5 font-bold text-ink">
                Subscribe
              </button>
            </form>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {columns.map((col) => (
              <nav key={col.title} aria-label={col.title} className="flex flex-col gap-2 text-[0.95rem]">
                <span className="mb-1 font-semibold text-white">{col.title}</span>
                {col.links.map((l) => (
                  <Link key={l.href} href={l.href} className="hover:text-white hover:underline">
                    {l.label}
                  </Link>
                ))}
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-12 rounded-lg border border-gold/40 bg-white/5 p-4 text-[0.95rem]">
          <strong className="text-white">Protect your gift.</strong> We never ask anyone to send money to a personal phone
          number. Give only through this website or the official Paybill shown on it.
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/15 py-6 text-sm sm:flex-row sm:justify-between">
          <p>
            © {new Date().getFullYear()} {org.name}. {org.registration}.
          </p>
          <p>Built pro bono by Miribo Technologies</p>
        </div>
      </div>
    </footer>
  );
}
