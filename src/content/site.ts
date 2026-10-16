// Website content written into the site. News, photos and the Chairman's video are edited
// in the admin area instead. Items marked draft need leadership approval.

import type { NewsPost } from "@/lib/types";

export const org = {
  name: "Menyenya SDA High School Alumni Association",
  shortName: "Menyenya Alumni",
  tagline: "Menyenya made us. Together, we build it.",
  email: "info@menyenyaalumni.org", // to be confirmed with the domain
  registration: "Registration with the Registrar of Societies in progress",
};

/** Video message from the Chairman. The video link is set in the admin area. */
export const chairMessage = {
  name: null as string | null,
  role: "Chairman",
  summary:
    "A short welcome from our Chairman on why the association matters, what we are building together, and how every alumnus can play a part.",
};

export const mission = {
  draft: true,
  mission:
    "To unite the alumni and friends of Menyenya SDA High School in support of the school, its students and one another.",
  vision:
    "A Menyenya where every student learns in good facilities with the support to excel, and every alumnus stays connected to the school that shaped them.",
  values: [
    { name: "Service", text: "We give our time, skills and resources to lift those who come after us." },
    { name: "Integrity", text: "We handle every shilling and every record openly, and report back to members." },
    { name: "Unity", text: "Every class, region and generation has a place, from recent graduates to senior professionals." },
    { name: "Excellence", text: "We aim high for the school, as the school once aimed high for us." },
  ],
};

export const pillars = [
  {
    title: "Reconnect",
    text: "Find classmates, join your class and regional groups, and meet at events and homecomings.",
    space: "pillar.reconnect",
  },
  {
    title: "Give back",
    text: "Support the school's projects, starting with a new tuition block, and help needy students stay in class.",
    space: "pillar.give-back",
  },
  {
    title: "Grow together",
    text: "Mentor younger alumni, share opportunities, and support members through life's milestones.",
    space: "pillar.grow-together",
  },
];

// Leadership and secretariat are managed in the admin area (Admin → Our people).

// News and events now come from the database (admin area → News). These are the
// starting items, used only when the database is not connected.
export const sampleNews: NewsPost[] = [
  {
    slug: "technical-committee-29-october",
    date: "2026-10-29",
    kind: "event",
    title: "Technical Committee meeting",
    summary: "The committee reviews proposals to strengthen the association ahead of the tuition block campaign. Online, 8:00 pm.",
    body: [],
    photo: null,
  },
  {
    slug: "officials-meeting-15-october",
    date: "2026-10-15",
    kind: "news",
    title: "Officials welcome plans to strengthen the association",
    summary: "Officials reviewed proposals on registration, a small secretariat, member consultation and this platform.",
    body: [],
    photo: null,
  },
  {
    slug: "plenary-20-september",
    date: "2026-09-20",
    kind: "news",
    title: "Plenary agrees a KES 100 million tuition block",
    summary: "Members agreed to raise KES 100 million over three years, and 18 members pledged KES 3.41 million on the day.",
    body: [],
    photo: null,
  },
];

export const membershipLevels = [
  { name: "Foundation", text: "For students and those starting out. Stay connected and find a mentor." },
  { name: "Launch", text: "For early-career alumni building their path. Networking and mentorship." },
  { name: "Growth", text: "For established professionals and business owners. Mentor others and lead initiatives." },
  { name: "Impact", text: "For those able to give significantly of time and resources. Shape the association's direction." },
];
