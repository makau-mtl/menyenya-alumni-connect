"use client";

import { usePathname } from "next/navigation";

/** The public website's banner, header and footer. The member portal and admin area have their own layout. */
export function SiteChrome({ header, footer, children }: { header: React.ReactNode; footer: React.ReactNode; children: React.ReactNode }) {
  const path = usePathname();
  const portal = path === "/app" || path.startsWith("/app/") || path === "/admin" || path.startsWith("/admin/");
  if (portal) return <>{children}</>;
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
