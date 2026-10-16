import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "My account", template: "%s | My account" }, robots: { index: false } };
export const dynamic = "force-dynamic";

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return <div className="section pb-16 pt-10 lg:pt-14">{children}</div>;
}
