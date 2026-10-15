import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Join" };

export default function JoinPage() {
  return (
    <ComingSoon title="Join the association">
      <p>
        Membership registration opens to all alumni and friends of the school in January 2027, after members have been
        consulted in December.
      </p>
      <p>One short form: your class, where you live, and how to reach you. It takes about two minutes.</p>
    </ComingSoon>
  );
}
