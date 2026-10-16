import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getNewsPost } from "@/lib/data";
import { ImageSlot } from "@/components/media";
import { newsDateFormat } from "@/components/news-card";

export const revalidate = 300;

// Posts are built on first visit, then kept until they change.
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getNewsPost((await params).slug);
  return post ? { title: post.title, description: post.summary } : { title: "News" };
}

export default async function NewsPostPage({ params }: Props) {
  const post = await getNewsPost((await params).slug);
  if (!post) notFound();
  return (
    <article className="section max-w-3xl pt-12 lg:pt-16">
      <Link href="/news" className="font-semibold text-tea underline underline-offset-4">
        All news and events
      </Link>
      <p className="mt-8 text-sm text-ink-soft">
        <span className="font-semibold text-tea">{post.kind === "event" ? "Event" : "News"}</span>
        <span aria-hidden> &nbsp;</span>
        <time dateTime={post.date}>{newsDateFormat.format(new Date(post.date))}</time>
      </p>
      <h1 className="mt-2 text-4xl font-bold leading-[1.1] sm:text-5xl">{post.title}</h1>
      <p className="mt-5 text-xl text-ink-soft">{post.summary}</p>
      {post.photo && (
        <figure className="mt-10">
          <ImageSlot caption={post.title} photo={post.photo} ratio="landscape" sizes="(min-width: 768px) 48rem, 100vw" />
          {post.photo.caption && post.photo.caption !== post.title && (
            <figcaption className="mt-2 text-sm text-ink-soft">{post.photo.caption}</figcaption>
          )}
        </figure>
      )}
      <div className="mt-10 flex flex-col gap-5 text-lg leading-relaxed">
        {post.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </article>
  );
}
