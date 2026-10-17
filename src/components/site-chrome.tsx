"use client";

import { usePathname } from "next/navigation";

/** The website's banner, header and footer. Members use the platform inside the website; only the admin area has its own workspace. */
export function SiteChrome({ header, footer, children }: { header: React.ReactNode; footer: React.ReactNode; children: React.ReactNode }) {
  const path = usePathname();
  const workspace = path === "/admin" || path.startsWith("/admin/");
  if (workspace) return <>{children}</>;
  return (
    <>
      <p className="bg-gold-tint px-4 py-1.5 text-center text-xs text-ink sm:text-sm">
        Preview for the Technical Committee: sample content and photo spaces. Test entries will be cleared before launch.
      </p>
      {header}
      <main id="main" className="flex-1">
        {children}
      </main>
      {footer}
    </>
  );
}
