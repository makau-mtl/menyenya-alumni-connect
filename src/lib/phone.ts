// Phone numbers are saved in international form (+2547…) with the country they belong to.
// Kenya is the default; the list covers where most alumni live, and "Other" takes any +number.

export const phoneCountries = [
  { iso: "KE", name: "Kenya", dial: "254" },
  { iso: "UG", name: "Uganda", dial: "256" },
  { iso: "TZ", name: "Tanzania", dial: "255" },
  { iso: "RW", name: "Rwanda", dial: "250" },
  { iso: "SS", name: "South Sudan", dial: "211" },
  { iso: "ET", name: "Ethiopia", dial: "251" },
  { iso: "ZA", name: "South Africa", dial: "27" },
  { iso: "NG", name: "Nigeria", dial: "234" },
  { iso: "GB", name: "United Kingdom", dial: "44" },
  { iso: "IE", name: "Ireland", dial: "353" },
  { iso: "DE", name: "Germany", dial: "49" },
  { iso: "NL", name: "Netherlands", dial: "31" },
  { iso: "SE", name: "Sweden", dial: "46" },
  { iso: "FI", name: "Finland", dial: "358" },
  { iso: "US", name: "United States", dial: "1" },
  { iso: "CA", name: "Canada", dial: "1" },
  { iso: "AE", name: "United Arab Emirates", dial: "971" },
  { iso: "SA", name: "Saudi Arabia", dial: "966" },
  { iso: "QA", name: "Qatar", dial: "974" },
  { iso: "AU", name: "Australia", dial: "61" },
  { iso: "NZ", name: "New Zealand", dial: "64" },
  { iso: "IN", name: "India", dial: "91" },
  { iso: "CN", name: "China", dial: "86" },
  { iso: "ZZ", name: "Other (type the + code)", dial: "" },
] as const;

export type PhoneCountry = (typeof phoneCountries)[number]["iso"];

/**
 * Turns what someone typed into +<country><number>, or null if it can't be a phone number.
 * Kenya: 0712 345 678, 712345678, 254712345678 and +254712345678 all become +254712345678.
 */
export function toInternational(country: string, typed: string): string | null {
  const digits = typed.replace(/[\s\-().]/g, "");
  if (country === "KE") {
    const local = digits.replace(/^\+?254/, "").replace(/^0/, "");
    return /^[17]\d{8}$/.test(local) ? `+254${local}` : null;
  }
  if (digits.startsWith("+")) return /^\+[1-9]\d{7,14}$/.test(digits) ? digits : null;
  const c = phoneCountries.find((p) => p.iso === country);
  if (!c || !c.dial) return null;
  const national = digits.replace(new RegExp(`^(00)?${c.dial}`), "").replace(/^0/, "");
  const full = `+${c.dial}${national}`;
  return /^\+[1-9]\d{7,14}$/.test(full) ? full : null;
}

/** The country to save with a number ("ZZ" means unknown). */
export function countryForSave(country: string) {
  return country === "ZZ" ? "ZZ" : country;
}
