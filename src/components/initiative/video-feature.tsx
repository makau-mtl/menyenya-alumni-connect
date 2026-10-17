"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { Play } from "lucide-react";
import type { CauseVideo } from "@/lib/types";

/**
 * A YouTube video that loads only when tapped: until then it is a single small picture with a play
 * button, so pages stay fast and light on mobile data. The caption says what it is and who speaks.
 */
export function VideoFeature({ video, label, size = "feature", fallbackPoster }: {
  video: CauseVideo; label: string; size?: "feature" | "card"; fallbackPoster?: string | null;
}) {
  const [playing, setPlaying] = useState(false);
  const poster = `https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`;
  return (
    <figure className="flex flex-col">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-ink">
        {playing ? (
          <iframe
            className="absolute inset-0 size-full"
            src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
            title={`${video.title}: ${label}`}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0 size-full text-left" aria-label={`Play video: ${video.title}${video.speaker ? `, ${video.speaker}` : ""}`}>
            <img src={poster} onError={(e) => { if (fallbackPoster) e.currentTarget.src = fallbackPoster; }} alt="" loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-[1.02]" />
            <span className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
            <span className={`absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gold text-ink shadow-xl transition group-hover:scale-110 ${size === "feature" ? "size-20" : "size-14"}`}>
              <Play className={`ml-1 fill-current ${size === "feature" ? "size-8" : "size-6"}`} aria-hidden />
            </span>
            <span className={`absolute bottom-0 left-0 right-0 p-4 text-white ${size === "feature" ? "sm:p-6" : ""}`}>
              <span className={`block font-display font-bold leading-tight ${size === "feature" ? "text-xl sm:text-2xl" : "text-base"}`}>{video.title}</span>
              {video.speaker && <span className="mt-0.5 block text-sm text-white/85">{video.speaker}</span>}
            </span>
          </button>
        )}
      </div>
      {playing && (
        <figcaption className="mt-2 text-sm text-ink-soft">
          <span className="font-semibold text-ink">{video.title}</span>{video.speaker ? ` · ${video.speaker}` : ""}
        </figcaption>
      )}
    </figure>
  );
}
