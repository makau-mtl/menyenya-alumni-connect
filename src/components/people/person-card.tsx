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
  /** "feature" for leaders and secretariat (large landscape photo); "compact" for members. */
  size?: "feature" | "compact";
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

// A few brand gradients so a page of people without photos still looks varied.
const tones = [
  "bg-[linear-gradient(135deg,#1f3a52_0%,#2e6b4f_100%)]",
  "bg-[linear-gradient(135deg,#2e6b4f_0%,#17283b_100%)]",
  "bg-[linear-gradient(135deg,#17283b_0%,#3d5a73_100%)]",
];
function tone(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return tones[h % tones.length];
}

function Photo({ p, className, big }: { p: PersonCardProps; className: string; big?: boolean }) {
  if (p.photo) return <img src={p.photo} alt="" loading="lazy" decoding="async" className={`${className} bg-line object-cover object-top`} />;
  return (
    <span aria-hidden className={`${className} relative flex items-center justify-center overflow-hidden ${tone(p.name)}`}>
      <svg className="absolute inset-0 h-full w-full text-white opacity-[0.06]">
        <defs>
          <pattern id="people-bond" width="48" height="24" patternUnits="userSpaceOnUse">
            <rect x="1" y="1" width="46" height="10" rx="1" fill="currentColor" />
            <rect x="-23" y="13" width="46" height="10" rx="1" fill="currentColor" />
            <rect x="25" y="13" width="46" height="10" rx="1" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#people-bond)" />
      </svg>
      <span className={`relative font-display font-bold tracking-wide text-white/90 ${big ? "text-6xl" : "text-4xl"}`}>{initials(p.name)}</span>
    </span>
  );
}

function Arrow({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}

/** Photo, name and role or class; the round arrow (or anywhere on the card) opens a short profile. */
export function PersonCard(p: PersonCardProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const compact = p.size === "compact";
  return (
    <li className="group relative flex flex-col">
      <div className="overflow-hidden rounded-2xl">
        <Photo
          p={p}
          big={!compact}
          className={`${compact ? "aspect-square" : "aspect-[4/3]"} w-full transition-transform duration-500 group-hover:scale-[1.04]`}
        />
      </div>
      <div className={`flex items-start justify-between gap-3 ${compact ? "mt-3" : "mt-5"}`}>
        <div className="min-w-0">
          <p className={`font-display font-bold leading-snug ${compact ? "text-lg" : "text-2xl"}`}>{p.name}</p>
          <p className={`mt-1 ${compact ? "text-[0.95rem] text-ink-soft" : "font-semibold text-tea"}`}>{p.subtitle}</p>
          {p.classLabel && <p className="text-[0.95rem] text-ink-soft">{p.classLabel}</p>}
        </div>
        <button
          type="button"
          onClick={() => dialog.current?.showModal()}
          aria-label={`More about ${p.name}`}
          className={`flex shrink-0 items-center justify-center rounded-full bg-tea text-white shadow-sm transition-colors after:absolute after:inset-0 after:content-[''] group-hover:bg-gold group-hover:text-ink focus-visible:outline-offset-4 ${compact ? "size-10" : "size-12"}`}
        >
          <Arrow className={compact ? "size-4" : "size-5"} />
        </button>
      </div>

      <dialog
        ref={dialog}
        aria-label={p.name}
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
        className="m-auto w-[min(48rem,calc(100vw-2rem))] overflow-hidden rounded-3xl bg-surface p-0 text-ink shadow-2xl backdrop:bg-ink/70 backdrop:backdrop-blur-sm"
      >
        <div className="grid sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <Photo p={p} big className="aspect-[4/3] w-full sm:aspect-auto sm:h-full sm:min-h-80" />
          <div className="relative p-6 sm:p-9">
            <form method="dialog" className="absolute right-4 top-4">
              <button aria-label="Close" className="flex size-10 items-center justify-center rounded-full text-ink-soft hover:bg-paper hover:text-ink">
                <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </form>
            <p className="pr-10 font-display text-3xl font-bold leading-tight">{p.name}</p>
            <p className="mt-2 text-lg font-semibold text-tea">{p.subtitle}</p>
            {p.classLabel && <p className="text-ink-soft">{p.classLabel}</p>}
            {p.capacityNote && <p className="mt-4 border-l-4 border-gold pl-3 text-ink-soft">{p.capacityNote}</p>}
            {p.summary && <p className="mt-5 text-lg leading-relaxed">{p.summary}</p>}
            {p.term && <p className="mt-5 inline-block rounded-full bg-tea-tint px-3 py-1 text-sm font-semibold text-tea-dark">{p.term}</p>}
            {(p.linkedinUrl || p.link) && (
              <div className="mt-7 flex flex-wrap gap-3">
                {p.linkedinUrl && /^https:\/\//.test(p.linkedinUrl) && (
                  <a
                    href={p.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex items-center gap-2 rounded-full bg-[#0a66c2] px-5 py-2.5 font-semibold text-white hover:bg-[#004182]"
                  >
                    <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="currentColor">
                      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.75h4V21H3zM9.5 9.75h3.8v1.6h.06c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.77 2.65 4.77 6.1V21h-4v-4.9c0-1.17-.02-2.67-1.63-2.67-1.63 0-1.88 1.27-1.88 2.59V21h-4z" />
                    </svg>
                    LinkedIn
                  </a>
                )}
                {p.link && (
                  <Link href={p.link} className="inline-flex items-center gap-2 rounded-full border-2 border-ink px-5 py-2 font-semibold hover:bg-ink hover:text-white">
                    Full profile <Arrow className="size-4" />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </dialog>
    </li>
  );
}
