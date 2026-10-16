import { permanentRedirect } from "next/navigation";

// "Leadership and secretariat" became "Our people" (16 Oct 2026).
export default function TeamPage() {
  permanentRedirect("/our-people");
}
