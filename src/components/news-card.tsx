import Link from "next/link";
import type { NewsPost } from "@/lib/types";
import { ImageSlot } from "./media";

export const newsDateFormat = new Intl.DateTimeFormat("en-KE", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Nairobi",
});

export function NewsCard({ item }: { item: NewsPost }) {
  const hasStory = item.body.length > 0;
  const title = hasStory ? (
    <Link href={`/news/${item.slug}`} className="hover:underline">
      {item.title}
    </Link>
  ) : (
    item.title
  );
  return (
    <article className="flex flex-col">
      <ImageSlot
        caption={item.title.toLowerCase()}
        photo={item.photo}
        ratio="landscape"
        tone="light"
        sizes="(min-width: 768px) 33vw, 100vw"
      />
      <p className="mt-4 text-sm text-ink-soft">
        <span className="font-semibold text-tea">{item.kind === "event" ? "Event" : "News"}</span>
        <span aria-hidden> &nbsp;</span>
        <time dateTime={item.date}>{newsDateFormat.format(new Date(item.date))}</time>
      </p>
      <h3 className="mt-1 text-xl font-bold">{title}</h3>
      <p className="mt-2 text-ink-soft">{item.summary}</p>
      {hasStory && (
        <Link href={`/news/${item.slug}`} className="mt-3 font-semibold text-tea underline underline-offset-4">
          Read more
        </Link>
      )}
    </article>
  );
}
