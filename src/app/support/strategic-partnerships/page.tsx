import type { Metadata } from "next";
import { partnerships } from "@/content/support";
import { SupportPage } from "@/components/support/support-page";

export const metadata: Metadata = {
  title: "Strategic partnerships",
  description: "Institutions partnering with the Menyenya SDA High School Alumni Association on mentorship, careers, scholarships and the school.",
};

export default function StrategicPartnershipsPage() {
  return <SupportPage copy={partnerships} />;
}
