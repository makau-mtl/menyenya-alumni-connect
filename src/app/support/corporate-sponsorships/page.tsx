import type { Metadata } from "next";
import { sponsorships } from "@/content/support";
import { SupportPage } from "@/components/support/support-page";

export const metadata: Metadata = {
  title: "Corporate sponsorships",
  description: "Businesses, SACCOs and foundations sponsoring the Menyenya SDA High School alumni's work for the school and its students.",
};

export default function CorporateSponsorshipsPage() {
  return <SupportPage copy={sponsorships} />;
}
