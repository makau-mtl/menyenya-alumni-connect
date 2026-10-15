import type { CauseProgress } from "@/lib/types";
import { formatKesShort } from "@/lib/money";

export function ProgressFigures({ progress, target }: { progress: CauseProgress; target: number }) {
  const items = [
    { value: formatKesShort(progress.pledged), label: "pledged" },
    { value: progress.pledgeCount.toString(), label: progress.pledgeCount === 1 ? "pledge" : "pledges" },
    { value: formatKesShort(target), label: "target over three years" },
  ];
  return (
    <dl className="grid grid-cols-3 gap-3 sm:gap-4">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="sr-only">{item.label}</dt>
          <dd className="whitespace-nowrap font-display text-xl font-bold text-ink sm:text-3xl">{item.value}</dd>
          <dd className="text-sm text-ink-soft">{item.label}</dd>
        </div>
      ))}
    </dl>
  );
}
