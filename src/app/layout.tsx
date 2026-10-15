import type { Metadata, Viewport } from "next";
import "@fontsource/domine/400.css";
import "@fontsource/domine/700.css";
import "@fontsource-variable/nunito-sans";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: {
    default: "Menyenya Alumni",
    template: "%s | Menyenya Alumni",
  },
  description:
    "The Menyenya SDA High School Alumni Association: reconnect with classmates, give to the tuition block, and support the school.",
};

export const viewport: Viewport = {
  themeColor: "#17283b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-surface focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        <p className="bg-gold-tint px-4 py-2 text-center text-sm text-ink">
          Preview for the Technical Committee. Figures other than the plenary pledges are sample data, and nothing you
          enter here is kept.
        </p>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
