import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Track my pledge" };

export default function TrackPage() {
  return (
    <ComingSoon title="Track my pledge">
      <p>
        Soon you will be able to enter your pledge reference and email, receive a one-time code, and see what you have
        pledged, paid and still owe.
      </p>
      <p>Keep your reference (it starts with MSA-) in a safe place until then.</p>
    </ComingSoon>
  );
}
