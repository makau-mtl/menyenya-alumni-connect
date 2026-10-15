import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "About us" };

export default function AboutPage() {
  return (
    <ComingSoon title="About the association">
      <p>
        The Menyenya SDA High School Alumni Association brings together former students and friends of the school to
        support it and each other.
      </p>
      <p>The school&rsquo;s history, our leadership and how to contact us will be published here.</p>
    </ComingSoon>
  );
}
