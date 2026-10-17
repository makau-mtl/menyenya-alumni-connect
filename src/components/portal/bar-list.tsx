import Link from "next/link";

/** A simple horizontal bar list in one colour, with the value written beside each bar. Rows with an href open details. */
export function BarList({ rows, highlight, unit = "" }: { rows: { label: string; value: number | null; href?: string }[]; highlight?: string; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value ?? 0));
  return (
    <ul className="flex flex-col gap-1">
      {rows.map((r) => {
        const mine = r.label === highlight;
        const body = (
          <>
            <span className={`truncate ${mine ? "font-bold text-ink" : "text-ink-soft"} ${r.href ? "group-hover:text-tea group-hover:underline" : ""}`}>{r.label}</span>
            <span className="h-2.5 rounded-full bg-muted">
              {r.value !== null && (
                <span className={`block h-2.5 rounded-full ${mine ? "bg-tea-dark" : "bg-tea"}`} style={{ width: `${Math.max(4, (r.value / max) * 100)}%` }} />
              )}
            </span>
            <span className={`tabular-nums ${mine ? "font-bold" : "font-semibold"}`}>{r.value ?? "<5"}{r.value !== null ? unit : ""}</span>
          </>
        );
        const cls = "group grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-3 rounded-md px-1.5 py-1 text-sm";
        const title = `${r.label}: ${r.value ?? "fewer than 5"}${unit}`;
        return (
          <li key={r.label}>
            {r.href ? <Link href={r.href} className={`${cls} hover:bg-muted/60`} title={`${title}. See who`}>{body}</Link> : <div className={cls} title={title}>{body}</div>}
          </li>
        );
      })}
    </ul>
  );
}
