const kes = new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 });

/** "KES 36,000" */
export function formatKes(amount: number): string {
  return `KES ${kes.format(amount)}`;
}

/** Short form for big figures: "KES 3.41M", "KES 100M", "KES 250K". */
export function formatKesShort(amount: number): string {
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000;
    const text = Number.isInteger(m) ? m.toString() : m.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    return `KES ${text}M`;
  }
  if (amount >= 10_000) {
    return `KES ${Math.round(amount / 1_000)}K`;
  }
  return formatKes(amount);
}

/** Parse what a person typed ("1,500", " 2000 ") into whole shillings, or null. */
export function parseKes(input: string): number | null {
  const cleaned = input.replace(/[,\s]/g, "").replace(/^KES/i, "");
  if (!/^\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export function percentOf(part: number, whole: number | null): number {
  if (!whole || whole <= 0) return 0;
  return Math.min(100, (part / whole) * 100);
}
