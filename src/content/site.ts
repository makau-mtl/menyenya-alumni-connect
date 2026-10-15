// Website content. In a later milestone this moves into the database so the
// secretariat can edit it without code. Items marked draft need leadership approval.

export const org = {
  name: "Menyenya SDA High School Alumni Association",
  shortName: "Menyenya Alumni",
  tagline: "Menyenya made us. Together, we build it.",
  email: "info@menyenyaalumni.org", // to be confirmed with the domain
  registration: "Registration with the Registrar of Societies in progress",
};

/** Video message from the Chairman. Set youtubeId once the video is recorded. */
export const chairMessage = {
  youtubeId: null as string | null,
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
    image: "Alumni reunited at a homecoming",
  },
  {
    title: "Give back",
    text: "Support the school's projects, starting with a new tuition block, and help needy students stay in class.",
    image: "Students in class at Menyenya",
  },
  {
    title: "Grow together",
    text: "Mentor younger alumni, share opportunities, and support members through life's milestones.",
    image: "An alumnus mentoring a recent graduate",
  },
];

export type Person = {
  role: string;
  /** Leave null until the person has agreed to be listed. */
  name: string | null;
};

// Names are added only after each person confirms their role and consents to be listed.
export const leadership: Person[] = [
  { role: "Chairman", name: null },
  { role: "Vice Chairman", name: null },
  { role: "Secretary", name: null },
  { role: "Treasurer", name: null },
  { role: "Events Coordinator", name: null },
  { role: "Welfare Coordinator", name: null },
];

export const school: Person[] = [{ role: "Principal, Menyenya SDA High School", name: null }];

export const secretariat = [
  {
    role: "Administrative and Communications Assistant",
    status: "Role proposed; recruitment follows approval by the Technical Committee",
  },
];

export type NewsItem = {
  slug: string;
  date: string;
  kind: "News" | "Event";
  title: string;
  summary: string;
};

export const news: NewsItem[] = [
  {
    slug: "technical-committee-29-october",
    date: "2026-10-29",
    kind: "Event",
    title: "Technical Committee meeting",
    summary: "The committee reviews proposals to strengthen the association ahead of the tuition block campaign. Online, 8:00 pm.",
  },
  {
    slug: "officials-meeting-15-october",
    date: "2026-10-15",
    kind: "News",
    title: "Officials welcome plans to strengthen the association",
    summary: "Officials reviewed proposals on registration, a small secretariat, member consultation and this platform.",
  },
  {
    slug: "plenary-20-september",
    date: "2026-09-20",
    kind: "News",
    title: "Plenary agrees a KES 100 million tuition block",
    summary: "Members agreed to raise KES 100 million over three years, and 18 members pledged KES 3.41 million on the day.",
  },
];

export const membershipLevels = [
  { name: "Foundation", text: "For students and those starting out. Stay connected and find a mentor." },
  { name: "Launch", text: "For early-career alumni building their path. Networking and mentorship." },
  { name: "Growth", text: "For established professionals and business owners. Mentor others and lead initiatives." },
  { name: "Impact", text: "For those able to give significantly of time and resources. Shape the association's direction." },
];
