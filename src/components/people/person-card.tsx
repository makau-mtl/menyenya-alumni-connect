"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRef } from "react";

export type PersonCardProps = {
  name: string;
  subtitle: string;
  classLabel: string | null;
  capacityNote: string | null;
  summary: string | null;
  linkedinUrl: string | null;
  photo: string | null;
  term: string | null;
  link?: string;
};

function initials(name: string) {
  return name
    .replace(/^(mr|mrs|ms|dr|prof|pr|pst)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function Photo({ p, className }: { p: PersonCardProps; className: string }) {
  return p.photo ? (
    <img src={p.photo} alt="" loading="lazy" className={`${className} object-cover object-top`} />
  ) : (
    <span aria-hidden className={`${className} flex items-center justify-center bg-tea-tint font-display text-5xl font-bold text-tea`}>
      {initials(p.name)}
    </span>
  );
}

/** A card like trees.org's team page: photo, name, role or class; the round button opens a short profile. */
export function PersonCard(p: PersonCardProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <li className="flex flex-col">
      <Photo p={p} className="aspect-[4/3] w-full rounded-lg" />
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xl font-semibold leading-snug">{p.name}</p>
          <p className="mt-0.5 text-ink-soft">{p.subtitle}</p>
          {p.classLabel && <p className="text-sm text-ink-soft">{p.classLabel}</p>}
        </div>
        <button
          type="button"
          onClick={() => dialog.current?.showModal()}
          aria-label={`More about ${p.name}`}
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-tea text-white hover:bg-tea-dark"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M8 16 16 8M9 8h7v7" />
          </svg>
        </button>
      </div>

      <dialog
        ref={dialog}
        aria-label={p.name}
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
        className="m-auto w-[min(40rem,calc(100vw-2rem))] rounded-2xl bg-surface p-0 text-ink shadow-2xl backdrop:bg-ink/60"
      >
        <div className="grid gap-6 p-6 sm:grid-cols-[12rem_1fr] sm:p-8">
          <Photo p={p} className="aspect-square w-40 rounded-xl sm:w-full" />
          <div>
            <p className="text-2xl font-bold">{p.name}</p>
            <p className="mt-1 font-semibold text-tea">{p.subtitle}</p>
            {p.classLabel && <p className="mt-1 text-ink-soft">{p.classLabel}</p>}
            {p.capacityNote && <p className="mt-3 text-sm italic text-ink-soft">{p.capacityNote}</p>}
            {p.summary && <p className="mt-4">{p.summary}</p>}
            {p.term && <p className="mt-4 text-sm text-ink-soft">{p.term}</p>}
            <div className="mt-6 flex flex-wrap gap-3">
              {p.linkedinUrl && /^https:\/\//.test(p.linkedinUrl) && (
                <a
                  href={p.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex rounded-md border-2 border-ink px-4 py-2 font-semibold hover:bg-ink hover:text-white"
                >
                  LinkedIn
                </a>
              )}
              {p.link && (
                <Link href={p.link} className="inline-flex rounded-md border-2 border-ink px-4 py-2 font-semibold hover:bg-ink hover:text-white">
                  Full profile
                </Link>
              )}
            </div>
          </div>
        </div>
        <form method="dialog" className="border-t border-line p-4 text-right">
          <button className="rounded-md px-4 py-2 font-semibold hover:bg-paper">Close</button>
        </form>
      </dialog>
    </li>
  );
}
