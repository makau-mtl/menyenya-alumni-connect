/** A simple horizontal bar list in one colour, with the value written beside each bar. */
export function BarList({ rows, highlight, unit = "" }: { rows: { label: string; value: number | null }[]; highlight?: string; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value ?? 0));
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((r) => {
        const mine = r.label === highlight;
        return (
          <li key={r.label} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-3 text-sm" title={`${r.label}: ${r.value ?? "fewer than 5"}${unit}`}>
            <span className={`truncate ${mine ? "font-bold text-ink" : "text-ink-soft"}`}>{r.label}</span>
            <span className="h-2.5 rounded-full bg-muted">
              {r.value !== null && (
                <span className={`block h-2.5 rounded-full ${mine ? "bg-tea-dark" : "bg-tea"}`} style={{ width: `${Math.max(4, (r.value / max) * 100)}%` }} />
              )}
            </span>
            <span className={`tabular-nums ${mine ? "font-bold" : "font-semibold"}`}>{r.value ?? "<5"}{r.value !== null ? unit : ""}</span>
          </li>
        );
      })}
    </ul>
  );
}
