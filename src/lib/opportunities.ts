// Labels and matching for the Opportunities area (jobs, business, volunteer).

export const workTypes: Record<string, string> = {
  full_time: "Full time", part_time: "Part time", contract: "Contract", internship: "Internship", attachment: "Attachment", remote: "Remote",
};

export const businessKinds: Record<string, string> = {
  tender: "Tender or supplier call", partner: "Looking for a partner", investor: "Looking for an investor",
  distributor: "Distributors wanted", offer: "Offer for members", other: "Other",
};

export const sectors = [
  "Agriculture", "Construction and real estate", "Creative and media", "Education", "Energy", "Finance and insurance",
  "Health", "Hospitality and tourism", "ICT", "Manufacturing", "NGO and public sector", "Professional services",
  "Retail and trade", "Transport and logistics", "Other",
];

export type JobRow = {
  id: string; title: string; organisation: string; location: string; work_type: string; field: string; description: string;
  apply_url: string | null; apply_email: string | null; closes_on: string; from_association: boolean; created_at: string;
  poster: string; poster_year: number | null; mine: boolean; reports: number | null;
};

export type Profile = { profession: string | null; skills: string[]; headline: string | null; county: string | null; sector?: string | null };

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9+#]+/).filter((w) => w.length > 2);

/**
 * How well something matches a member's profile: shared words with their profession, headline and skills,
 * plus a little for being in their county. 0 means no match.
 */
export function matchScore(text: string, location: string, p: Profile) {
  const mine = new Set([...words(p.profession ?? ""), ...words(p.headline ?? ""), ...p.skills.flatMap(words)]);
  if (p.sector) words(p.sector).forEach((w) => mine.add(w));
  let score = 0;
  for (const w of new Set(words(text))) if (mine.has(w)) score += 2;
  if (p.county && location.toLowerCase().includes(p.county.toLowerCase())) score += 1;
  return score;
}

export const shortDate = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", timeZone: "Africa/Nairobi" });
