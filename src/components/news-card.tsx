import type { NewsItem } from "@/content/site";
import { ImageSlot } from "./media";

const dateFormat = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Nairobi" });

export function NewsCard({ item }: { item: NewsItem }) {
  return (
    <article className="flex flex-col">
      <ImageSlot caption={item.title.toLowerCase()} ratio="landscape" tone="light" />
      <p className="mt-4 text-sm text-ink-soft">
        <span className="font-semibold text-tea">{item.kind}</span>
        <span aria-hidden> &nbsp;</span>
        <time dateTime={item.date}>{dateFormat.format(new Date(item.date))}</time>
      </p>
      <h3 className="mt-1 text-xl font-bold">{item.title}</h3>
      <p className="mt-2 text-ink-soft">{item.summary}</p>
    </article>
  );
}
