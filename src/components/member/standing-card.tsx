type Standing = {
  standing: "active" | "inactive" | null;
  fees_on: boolean;
  this_year: number;
  paid_this_year: boolean;
  in_grace: boolean;
  grace_ends: string;
};

const dateFormat = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Nairobi" });

/** Active or Inactive, and what it means, on the member's home page. */
export function StandingCard({ s, verification }: { s: Standing | null; verification: string | null }) {
  if (!s?.standing) return null;
  const active = s.standing === "active";
  const tone = s.in_grace ? "border-gold bg-gold-tint" : active ? "border-tea bg-tea-tint" : "border-line bg-surface";
  return (
    <section className={`max-w-2xl rounded-xl border-l-8 p-5 ${tone}`} aria-label="Membership standing">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-sm font-bold uppercase tracking-wide ${active ? "bg-tea text-white" : "bg-ink-soft text-white"}`}>
          {active ? "Active" : "Inactive"}
        </span>
        <p className="font-semibold">
          {!s.fees_on
            ? "Active member"
            : s.in_grace
              ? `Active until ${dateFormat.format(new Date(s.grace_ends))}`
              : active
                ? `Active member for ${s.this_year}`
                : `Inactive for ${s.this_year}`}
        </p>
      </div>
      <p className="mt-3">
        {active
          ? "You are eligible to vote and take part in the association's decisions."
          : "Inactive members can use the member area but cannot vote or take part in decisions."}
      </p>
      <p className="mt-2 text-sm text-ink-soft">
        {!s.fees_on
          ? "Everyone registered is active until membership fees start. Once they do, you are active for each year you pay for."
          : s.in_grace
            ? `Pay for ${s.this_year} by ${dateFormat.format(new Date(s.grace_ends))} to stay active.`
            : active
              ? `Membership runs from January to December. Renew for ${s.this_year + 1} by 31 March to stay active.`
              : `Pay the ${s.this_year} membership fee to become active. You only pay for the year you want to be active; there are no arrears.`}
      </p>
      {verification && <p className="mt-3 border-t border-line pt-3 text-sm text-ink-soft">{verification}</p>}
    </section>
  );
}
