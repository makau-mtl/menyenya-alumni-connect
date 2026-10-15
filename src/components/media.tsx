/* eslint-disable @next/next/no-img-element */

// Photo and video spaces. Until real photos are uploaded, each shows a designed
// placeholder that says what belongs there, so the layout can be reviewed now.

type Ratio = "wide" | "video" | "landscape" | "square" | "portrait" | "tall";

const ratios: Record<Ratio, string> = {
  wide: "aspect-[21/9]",
  video: "aspect-video",
  landscape: "aspect-[4/3]",
  square: "aspect-square",
  portrait: "aspect-[4/5]",
  tall: "aspect-[3/4]",
};

export function ImageSlot({
  caption,
  src,
  ratio = "landscape",
  className = "",
  tone = "dark",
}: {
  caption: string;
  src?: string;
  ratio?: Ratio;
  className?: string;
  tone?: "dark" | "light";
}) {
  if (src) {
    return <img src={src} alt={caption} className={`${ratios[ratio]} w-full rounded-xl object-cover ${className}`} />;
  }
  const bg =
    tone === "dark"
      ? "bg-[linear-gradient(135deg,#1f3a52_0%,#2e6b4f_100%)] text-white/85"
      : "bg-[linear-gradient(135deg,#e6efe9_0%,#fbf0dc_100%)] text-ink/70";
  return (
    <div
      role="img"
      aria-label={`Photo to come: ${caption}`}
      className={`relative flex ${ratios[ratio]} w-full items-end overflow-hidden rounded-xl ${bg} ${className}`}
    >
      <svg aria-hidden className="absolute inset-0 h-full w-full opacity-[0.07]">
        <defs>
          <pattern id="bond" width="48" height="24" patternUnits="userSpaceOnUse">
            <rect x="1" y="1" width="46" height="10" rx="1" fill="currentColor" />
            <rect x="-23" y="13" width="46" height="10" rx="1" fill="currentColor" />
            <rect x="25" y="13" width="46" height="10" rx="1" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#bond)" />
      </svg>
      <p className="relative m-4 flex items-center gap-2 text-sm">
        <svg aria-hidden viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 7h3l2-3h6l2 3h3v13H4z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
        <span>Photo to come: {caption}</span>
      </p>
    </div>
  );
}

export function VideoSlot({ youtubeId, title, caption }: { youtubeId: string | null; title: string; caption: string }) {
  if (youtubeId) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-ink">
        <iframe
          className="h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
          title={title}
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <div
      role="img"
      aria-label={`Video to come: ${caption}`}
      className="relative flex aspect-video w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-xl bg-[linear-gradient(135deg,#17283b_0%,#1f3a52_60%,#2e6b4f_100%)] p-6 text-center text-white"
    >
      <span className="flex size-16 items-center justify-center rounded-full bg-gold text-ink sm:size-20">
        <svg aria-hidden viewBox="0 0 24 24" className="ml-1 size-7 sm:size-8" fill="currentColor">
          <path d="M7 4.5v15l13-7.5z" />
        </svg>
      </span>
      <p className="max-w-sm text-sm text-white/80">Video to come: {caption}</p>
    </div>
  );
}

/** Portrait placeholder for a person, showing initials until a photo is uploaded. */
export function PersonPhoto({ name, src }: { name: string; src?: string }) {
  if (src) return <img src={src} alt={name} className="aspect-[4/5] w-full rounded-xl object-cover" />;
  const initials = name
    .replace(/^(Prof|Dr|Mr|Mrs|Ms)\.?\s+/i, "")
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  return (
    <div
      role="img"
      aria-label={`Photo of ${name} to come`}
      className="flex aspect-[4/5] w-full items-center justify-center rounded-xl bg-[linear-gradient(160deg,#e6efe9_0%,#dcdfe2_100%)]"
    >
      <span className="font-display text-5xl font-bold text-ink/30">{initials}</span>
    </div>
  );
}
