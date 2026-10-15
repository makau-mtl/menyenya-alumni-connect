import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-20 bg-ink text-[#d5dce3]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[2fr_1fr_1fr]">
        <div className="max-w-prose">
          <p className="font-display text-lg font-bold text-white">Menyenya made us. Together, we build it.</p>
          <p className="mt-3 text-[0.95rem]">
            We will never ask you to send money to a personal phone number. Give only through this website or the
            official Paybill shown on it.
          </p>
        </div>
        <nav aria-label="Giving" className="flex flex-col gap-2 text-[0.95rem]">
          <span className="font-semibold text-white">Giving</span>
          <Link href="/causes" className="hover:underline">All causes</Link>
          <Link href="/causes/tuition-block" className="hover:underline">The tuition block</Link>
          <Link href="/track" className="hover:underline">Track my pledge</Link>
        </nav>
        <nav aria-label="Association" className="flex flex-col gap-2 text-[0.95rem]">
          <span className="font-semibold text-white">Association</span>
          <Link href="/join" className="hover:underline">Join</Link>
          <Link href="/about" className="hover:underline">About us</Link>
        </nav>
      </div>
      <div className="border-t border-white/15">
        <p className="mx-auto max-w-6xl px-4 py-4 text-sm">
          © {new Date().getFullYear()} Menyenya SDA High School Alumni Association. Built pro bono by Miribo
          Technologies.
        </p>
      </div>
    </footer>
  );
}
